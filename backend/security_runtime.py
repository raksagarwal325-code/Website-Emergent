"""Runtime security hardening installed during backend startup.

This module deliberately keeps the hardening isolated from the large API
module.  ``auth.py`` imports and installs it while ``server.py`` is still being
initialised, which lets us tighten the CORS middleware class before the API
adds it at the bottom of the module.

The controls here are defence-in-depth; they do not replace the existing
admin allowlist, session, CSRF, rate-limit, or SSRF-safe proxy controls.
"""

from __future__ import annotations

import asyncio
import inspect
import io
import ipaddress
import re
import socket
import sys
from urllib.parse import urlparse

import requests

from upload_security import configured_cors_origins, install_upload_validation

_INSTALLED = False
_ORIGINAL_REQUESTS_GET = requests.get

_ALLOWED_CORS_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
_ALLOWED_CORS_HEADERS = [
    "Accept",
    "Accept-Language",
    "Content-Language",
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Range",
]
_AI_FETCH_CALLERS = {
    "ai_generate_product",
    "ai_name_suggestions",
    "_resolve_product_image",
}
_IMAGE_VARIANT_WIDTHS = {320, 640, 960, 1280}
_PRODUCT_PATH_RE = re.compile(r"^[^/]+/products/(?!.*(?:^|/)originals/)[A-Za-z0-9._/-]+$")
_IMMUTABLE_CACHE = "public, max-age=31536000, immutable"


def _find_server_module():
    """Return the partially-imported API module without creating a cycle."""
    for name in ("server", "backend.server"):
        mod = sys.modules.get(name)
        if mod is not None and hasattr(mod, "app"):
            return mod
    for mod in tuple(sys.modules.values()):
        if mod is None or not hasattr(mod, "app"):
            continue
        path = str(getattr(mod, "__file__", "") or "")
        if path.endswith("/server.py") or path.endswith("\\server.py"):
            return mod
    return None


def _is_public_ip(raw: str) -> bool:
    try:
        addr = ipaddress.ip_address(raw)
    except ValueError:
        return False
    return not (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_multicast
        or addr.is_reserved
        or addr.is_unspecified
    )


def _host_allowed(host: str, server_module) -> bool:
    # Reuse the catalogue proxy's trusted host list and add our own production
    # / preview origins.  External images from any other host should be
    # uploaded first instead of making the backend an arbitrary URL fetcher.
    trusted = set(getattr(server_module, "_ALLOWED_IMAGE_HOSTS", set()) or set())
    trusted.update({"samratglass.com", "www.samratglass.com", "emergentagent.com"})
    return host in trusted or any(host.endswith("." + item) for item in trusted)


def _is_ai_image_fetch() -> bool:
    # Only the AI image-resolution paths are changed. Google Reviews,
    # Instagram cover fetches and the already-secure catalogue proxy keep
    # their existing behaviour.
    frame = inspect.currentframe()
    try:
        frame = frame.f_back if frame else None
        for _ in range(12):
            if frame is None:
                break
            if frame.f_code.co_name in _AI_FETCH_CALLERS:
                return True
            frame = frame.f_back
        return False
    finally:
        del frame


def _guarded_requests_get(url, *args, **kwargs):
    """Apply the existing image-proxy safety model to AI external images.

    For AI image resolution we require HTTPS, a trusted image host, public
    DNS destinations only, no redirects, an image MIME type, and a strict
    download-size cap.  This closes the older ``requests.get(image_url)``
    fallback without changing unrelated outbound HTTP calls.
    """
    if not _is_ai_image_fetch():
        return _ORIGINAL_REQUESTS_GET(url, *args, **kwargs)

    server_module = _find_server_module()
    if server_module is None:
        raise requests.RequestException("AI image fetch unavailable")

    try:
        parsed = urlparse(str(url))
    except Exception as exc:  # pragma: no cover - defensive
        raise requests.RequestException("Invalid image URL") from exc
    if parsed.scheme.lower() != "https":
        raise requests.RequestException("Only HTTPS image URLs are allowed")
    host = (parsed.hostname or "").lower().rstrip(".")
    if not host or not _host_allowed(host, server_module):
        raise requests.RequestException("Image host is not allowed")

    try:
        infos = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
    except OSError as exc:
        raise requests.RequestException("Image host could not be resolved") from exc
    if not infos:
        raise requests.RequestException("Image host could not be resolved")
    for _family, _socktype, _proto, _canonname, sockaddr in infos:
        if not _is_public_ip(sockaddr[0]):
            raise requests.RequestException("Blocked image destination")

    # Redirects are blocked so an allowed public host cannot bounce the
    # backend to localhost, cloud metadata, or another untrusted destination.
    kwargs["allow_redirects"] = False
    kwargs["stream"] = True
    response = _ORIGINAL_REQUESTS_GET(url, *args, **kwargs)
    try:
        if 300 <= response.status_code < 400:
            raise requests.RequestException("Image redirects are not allowed")
        response.raise_for_status()

        content_type = (response.headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
        if not content_type.startswith("image/"):
            raise requests.RequestException("Remote resource is not an image")

        limit = int(getattr(server_module, "_MAX_IMAGE_BYTES", 15 * 1024 * 1024))
        content_length = response.headers.get("Content-Length")
        if content_length:
            try:
                if int(content_length) > limit:
                    raise requests.RequestException("Image is too large")
            except ValueError:
                pass

        chunks = []
        total = 0
        for chunk in response.iter_content(64 * 1024):
            if not chunk:
                continue
            total += len(chunk)
            if total > limit:
                raise requests.RequestException("Image is too large")
            chunks.append(chunk)

        # Preserve the normal requests.Response interface expected by the
        # existing AI functions (``.content`` and ``.headers``).
        response._content = b"".join(chunks)  # noqa: SLF001 - requests internals
        response._content_consumed = True  # noqa: SLF001
        return response
    except Exception:
        response.close()
        raise


def _valid_product_path(path: str) -> bool:
    return bool(path) and ".." not in path and bool(_PRODUCT_PATH_RE.fullmatch(path))


def _variant_storage_path(path: str, width: int) -> str:
    app_prefix, _, product_tail = path.partition("/products/")
    return f"{app_prefix}/product-variants/webp/{width}/{product_tail}.webp"


def _render_webp_variant(data: bytes, width: int) -> bytes:
    """Resize a public product image without touching the stored master."""
    from PIL import Image, ImageOps

    with Image.open(io.BytesIO(data)) as opened:
        if getattr(opened, "is_animated", False):
            raise ValueError("animated images are not supported")
        image = ImageOps.exif_transpose(opened)
        if image.width > width:
            ratio = width / float(image.width)
            height = max(1, round(image.height * ratio))
            image = image.resize((width, height), Image.Resampling.LANCZOS)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        output = io.BytesIO()
        image.save(output, format="WEBP", quality=90, method=6)
        return output.getvalue()


def _install_image_delivery(server_module) -> None:
    app = server_module.app
    if getattr(app.state, "sge_image_delivery_installed", False):
        return

    from fastapi import HTTPException
    from starlette.responses import Response
    from storage import get_object, put_object

    @app.get("/api/image-variant/{width}/{path:path}")
    async def _image_variant(width: int, path: str):
        if width not in _IMAGE_VARIANT_WIDTHS or not _valid_product_path(path):
            raise HTTPException(status_code=404, detail="Image variant not found")

        variant_path = _variant_storage_path(path, width)
        try:
            cached, _cached_type = await asyncio.to_thread(get_object, variant_path)
            return Response(content=cached, media_type="image/webp", headers={"Cache-Control": _IMMUTABLE_CACHE})
        except Exception:
            pass

        try:
            source, source_type = await asyncio.to_thread(get_object, path)
        except Exception as exc:
            raise HTTPException(status_code=404, detail="Source image not found") from exc
        if not str(source_type or "").lower().startswith("image/"):
            raise HTTPException(status_code=415, detail="Unsupported source type")

        try:
            rendered = await asyncio.to_thread(_render_webp_variant, source, width)
            await asyncio.to_thread(put_object, variant_path, rendered, "image/webp")
        except ValueError as exc:
            raise HTTPException(status_code=415, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Image variant generation failed") from exc

        return Response(content=rendered, media_type="image/webp", headers={"Cache-Control": _IMMUTABLE_CACHE})

    app.state.sge_image_delivery_installed = True


def _install_cors_hardening(server_module) -> None:
    original = getattr(server_module, "CORSMiddleware", None)
    if original is None or getattr(original, "_sge_tightened", False):
        return

    class TightCORSMiddleware(original):
        _sge_tightened = True

        def __init__(self, app, *args, **kwargs):
            # Ignore server.py's historic broad fallback regex entirely.
            # Credentialed requests are accepted only from exact production
            # origins plus exact preview origins supplied in CORS_ALLOWED_ORIGINS.
            kwargs["allow_origins"] = configured_cors_origins()
            kwargs["allow_origin_regex"] = None
            kwargs["allow_methods"] = list(_ALLOWED_CORS_METHODS)
            kwargs["allow_headers"] = list(_ALLOWED_CORS_HEADERS)
            super().__init__(app, *args, **kwargs)

    server_module.CORSMiddleware = TightCORSMiddleware


def _install_security_headers(server_module) -> None:
    app = server_module.app
    if getattr(app.state, "sge_security_headers_installed", False):
        return

    @app.middleware("http")
    async def _security_headers(request, call_next):
        response = await call_next(request)
        headers = response.headers
        headers.setdefault("X-Content-Type-Options", "nosniff")
        headers.setdefault("X-Frame-Options", "DENY")
        headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        # API responses do not need to execute scripts/styles. A strict CSP is
        # therefore safe here and also protects any accidental HTML error page.
        headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        )
        forwarded_proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "").lower()
        if forwarded_proto == "https":
            headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

        # Public product assets are content-addressed by UUID-style upload
        # paths. They are immutable in normal catalogue operation, so browsers
        # can safely keep them for a year. Other /api/files routes retain their
        # existing cache behaviour.
        if response.status_code == 200 and request.url.path.startswith("/api/files/"):
            storage_path = request.url.path.removeprefix("/api/files/")
            if _valid_product_path(storage_path):
                headers["Cache-Control"] = _IMMUTABLE_CACHE
        return response

    app.state.sge_security_headers_installed = True


def install_runtime_hardening() -> None:
    global _INSTALLED
    if _INSTALLED:
        return
    server_module = _find_server_module()
    if server_module is None:
        # auth.py is sometimes unit-tested by itself. In that case there is
        # no API app to harden and there is intentionally nothing to install.
        return

    _install_cors_hardening(server_module)
    _install_security_headers(server_module)
    _install_image_delivery(server_module)
    install_upload_validation()

    if requests.get is not _guarded_requests_get:
        requests.get = _guarded_requests_get

    _INSTALLED = True
