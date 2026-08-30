"""Upload/CORS security helpers used by runtime hardening.

The application historically trusted browser supplied Content-Type and file
extensions for admin uploads. This module verifies the actual bytes before
those uploads reach storage while keeping the existing routes and size caps
unchanged.
"""

from __future__ import annotations

import inspect
import io
import os
import struct
from typing import Iterable

_IMAGE_UPLOAD_CALLERS = {
    "admin_upload_hero_slide",
    "admin_upload_category_featured",
    "upload_image",
    "watermark_preview",
}

_IMAGE_MIME_BY_FORMAT = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
    "GIF": "image/gif",
}
_IMAGE_MIME_ALIASES = {"image/jpg": "image/jpeg"}
_VIDEO_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/x-m4v",
    "video/webm",
}
_DEFAULT_CORS_ORIGINS = (
    "https://samratglass.com",
    "https://www.samratglass.com",
)


def configured_cors_origins(env: dict[str, str] | None = None) -> list[str]:
    """Return exact credentialed CORS origins.

    Production origins are always present. Emergent Preview, if it needs a
    cross-origin backend request, must be supplied explicitly through
    CORS_ALLOWED_ORIGINS as a comma-separated list of complete origins. This
    intentionally does not accept wildcard host patterns.
    """
    source = os.environ if env is None else env
    origins = list(_DEFAULT_CORS_ORIGINS)
    for raw in str(source.get("CORS_ALLOWED_ORIGINS", "") or "").split(","):
        origin = raw.strip().rstrip("/")
        if not origin or origin in origins:
            continue
        if not origin.startswith("https://"):
            continue
        # Exact origins only: no regex/glob tokens and no path/query/fragment.
        if any(token in origin for token in ("*", "[", "]", "(", ")", "\\")):
            continue
        host_part = origin.removeprefix("https://")
        if not host_part or any(ch in host_part for ch in ("/", "?", "#")):
            continue
        origins.append(origin)
    return origins


def _strict_image_container(data: bytes, fmt: str) -> None:
    """Reject obvious image/polyglot payloads with trailing non-image bytes."""
    if fmt == "JPEG":
        if not data.startswith(b"\xff\xd8") or not data.endswith(b"\xff\xd9"):
            raise ValueError("Malformed JPEG container")
        return

    if fmt == "PNG":
        signature = b"\x89PNG\r\n\x1a\n"
        if not data.startswith(signature):
            raise ValueError("Malformed PNG container")
        pos = len(signature)
        saw_iend = False
        while pos + 12 <= len(data):
            length = struct.unpack(">I", data[pos : pos + 4])[0]
            chunk_type = data[pos + 4 : pos + 8]
            end = pos + 12 + length
            if end > len(data):
                raise ValueError("Malformed PNG chunk")
            pos = end
            if chunk_type == b"IEND":
                saw_iend = True
                break
        if not saw_iend or pos != len(data):
            raise ValueError("PNG has trailing or malformed data")
        return

    if fmt == "WEBP":
        if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            raise ValueError("Malformed WebP container")
        declared = struct.unpack("<I", data[4:8])[0] + 8
        if declared != len(data):
            raise ValueError("WebP has trailing or truncated data")
        return

    if fmt == "GIF":
        if not (data.startswith(b"GIF87a") or data.startswith(b"GIF89a")):
            raise ValueError("Malformed GIF container")
        if not data.endswith(b";"):
            raise ValueError("GIF has trailing or truncated data")
        return

    raise ValueError("Unsupported image format")


def _validate_image(data: bytes, claimed_content_type: str) -> str:
    from PIL import Image

    if not data:
        raise ValueError("Empty image")
    try:
        with Image.open(io.BytesIO(data)) as opened:
            fmt = str(opened.format or "").upper()
            if fmt not in _IMAGE_MIME_BY_FORMAT:
                raise ValueError("Unsupported image format")
            opened.verify()
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("Image data could not be decoded") from exc

    _strict_image_container(data, fmt)
    detected = _IMAGE_MIME_BY_FORMAT[fmt]
    claimed = _IMAGE_MIME_ALIASES.get(claimed_content_type, claimed_content_type)
    if claimed and claimed != detected:
        raise ValueError("Image Content-Type does not match file contents")
    return detected


def _validate_video(data: bytes, claimed_content_type: str) -> str:
    if not data:
        raise ValueError("Empty video")
    if claimed_content_type not in _VIDEO_MIME_TYPES:
        raise ValueError("Unsupported video Content-Type")

    if claimed_content_type == "video/webm":
        if len(data) < 4 or data[:4] != b"\x1aE\xdf\xa3":
            raise ValueError("Video Content-Type does not match file contents")
        return claimed_content_type

    # MP4, M4V and QuickTime are ISO Base Media containers. Their first box
    # should be a sane ftyp box rather than arbitrary bytes renamed as video.
    if len(data) < 12 or data[4:8] != b"ftyp":
        raise ValueError("Video Content-Type does not match file contents")
    box_size = struct.unpack(">I", data[:4])[0]
    if box_size < 8 or box_size > len(data):
        raise ValueError("Malformed video container")
    return claimed_content_type


def validate_upload_bytes(data: bytes, content_type: str) -> str:
    """Validate upload bytes and return the detected/canonical MIME type."""
    claimed = str(content_type or "").split(";", 1)[0].strip().lower()
    if claimed.startswith("image/"):
        return _validate_image(data, claimed)
    if claimed.startswith("video/"):
        return _validate_video(data, claimed)
    raise ValueError("Only images or videos are allowed")


def _caller_name_in(names: Iterable[str], depth: int = 12) -> bool:
    frame = inspect.currentframe()
    try:
        frame = frame.f_back if frame else None
        for _ in range(depth):
            if frame is None:
                return False
            if frame.f_code.co_name in names:
                return True
            frame = frame.f_back
        return False
    finally:
        del frame


def install_upload_validation() -> None:
    """Patch UploadFile.read once so existing upload routes verify real bytes.

    Keeping this at the UploadFile boundary lets us harden all current admin
    image upload routes without changing their public API or storage workflow.
    """
    from fastapi import HTTPException
    from starlette.datastructures import UploadFile

    current = UploadFile.read
    if getattr(current, "_sge_content_validated", False):
        return

    original_read = current

    async def _validated_read(self, *args, **kwargs):
        data = await original_read(self, *args, **kwargs)
        if not _caller_name_in(_IMAGE_UPLOAD_CALLERS):
            return data
        try:
            validate_upload_bytes(data, getattr(self, "content_type", "") or "")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return data

    _validated_read._sge_content_validated = True  # type: ignore[attr-defined]
    _validated_read._sge_original_read = original_read  # type: ignore[attr-defined]
    UploadFile.read = _validated_read
