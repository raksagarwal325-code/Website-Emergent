"""Fast admin Excel catalogue export.

Primary thumbnails are prepared in two stages:
1. A fast bounded-concurrency pass for every image.
2. A slower low-concurrency recovery pass only for failed internal catalogue
   images that look transient (timeouts/fetch failures), never for confirmed
   invalid images.

This keeps normal category exports fast while allowing slower object-storage
reads to recover without making runtime grow linearly with catalogue size.
Any image that still cannot be prepared remains listed in workbook diagnostics.
"""
from __future__ import annotations

import asyncio
import math
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import HTTPException, Request
from starlette.responses import Response

from catalogue_excel import (
    _find_server_module,
    _normalise_thumbnail,
    _primary_image_bytes,
    build_catalogue_workbook,
)

# Fast first pass: handles the common case efficiently.
_IMAGE_CONCURRENCY = 16
_PER_IMAGE_TIMEOUT_SECONDS = 10.0
_TOTAL_IMAGE_BUDGET_SECONDS = 75.0
_THUMBNAIL_MAX_SIDE = 96
_MAX_ATTEMPTS = 2
_RETRY_DELAY_SECONDS = 0.15

# Slow recovery pass: only for failed internal product images. Low concurrency
# protects object storage while a capped adaptive budget keeps large/future
# categories bounded even as product counts increase.
_SLOW_IMAGE_CONCURRENCY = 4
_SLOW_PER_IMAGE_TIMEOUT_SECONDS = 25.0
_SLOW_RETRY_DELAY_SECONDS = 0.25
_SLOW_BUDGET_MIN_SECONDS = 30.0
_SLOW_BUDGET_MAX_SECONDS = 120.0

_TRANSIENT_FAILURE_REASONS = {
    "fetch_timeout",
    "fetch_exception",
    "fetch_or_validation_failed",
    "thumbnail_timeout",
    "total_budget_timeout",
}


def _primary_urls(products: list[dict]) -> list[str]:
    seen: set[str] = set()
    urls: list[str] = []
    for product in products:
        images = product.get("images") or []
        if not isinstance(images, (list, tuple)) or not images:
            continue
        value = str(images[0] or "").strip()
        if value and value not in seen:
            seen.add(value)
            urls.append(value)
    return urls


def _is_internal_image_url(raw: str) -> bool:
    value = str(raw or "").strip()
    if value.startswith("/api/files/") or value.startswith("api/files/"):
        return True
    try:
        parsed = urlparse(value)
    except Exception:
        return False
    host = (parsed.hostname or "").lower().rstrip(".")
    return host in {"samratglass.com", "www.samratglass.com"} and parsed.path.startswith("/api/files/")


async def _prepare_one_thumbnail(url: str, get_object, semaphore: asyncio.Semaphore):
    async with semaphore:
        last_reason = "fetch_or_validation_failed"
        attempts = 0
        for attempt in range(1, _MAX_ATTEMPTS + 1):
            attempts = attempt
            try:
                raw = await asyncio.wait_for(
                    asyncio.to_thread(_primary_image_bytes, url, get_object),
                    timeout=_PER_IMAGE_TIMEOUT_SECONDS,
                )
                if not raw:
                    last_reason = "fetch_or_validation_failed"
                else:
                    try:
                        thumbnail = await asyncio.wait_for(
                            asyncio.to_thread(_normalise_thumbnail, raw, _THUMBNAIL_MAX_SIDE),
                            timeout=_PER_IMAGE_TIMEOUT_SECONDS,
                        )
                    except asyncio.TimeoutError:
                        thumbnail = None
                        last_reason = "thumbnail_timeout"
                    except Exception:
                        thumbnail = None
                        last_reason = "thumbnail_processing_failed"

                    if thumbnail:
                        return url, thumbnail, None, attempts
                    if last_reason not in {"thumbnail_timeout", "thumbnail_processing_failed"}:
                        last_reason = "invalid_image"
            except asyncio.TimeoutError:
                last_reason = "fetch_timeout"
            except Exception:
                last_reason = "fetch_exception"

            if attempt < _MAX_ATTEMPTS:
                await asyncio.sleep(_RETRY_DELAY_SECONDS)

        return url, None, last_reason, attempts


async def _prepare_one_thumbnail_slow(url: str, get_object, semaphore: asyncio.Semaphore):
    """One deliberately patient recovery attempt for a previously failed URL."""
    async with semaphore:
        try:
            raw = await asyncio.wait_for(
                asyncio.to_thread(_primary_image_bytes, url, get_object),
                timeout=_SLOW_PER_IMAGE_TIMEOUT_SECONDS,
            )
            if not raw:
                return url, None, "fetch_or_validation_failed"

            try:
                thumbnail = await asyncio.wait_for(
                    asyncio.to_thread(_normalise_thumbnail, raw, _THUMBNAIL_MAX_SIDE),
                    timeout=_SLOW_PER_IMAGE_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                return url, None, "thumbnail_timeout"
            except Exception:
                return url, None, "thumbnail_processing_failed"

            if thumbnail:
                return url, thumbnail, None
            return url, None, "invalid_image"
        except asyncio.TimeoutError:
            return url, None, "fetch_timeout"
        except Exception:
            return url, None, "fetch_exception"


def _slow_recovery_budget_seconds(count: int) -> float:
    if count <= 0:
        return 0.0
    waves = math.ceil(count / max(_SLOW_IMAGE_CONCURRENCY, 1))
    estimated = waves * _SLOW_PER_IMAGE_TIMEOUT_SECONDS + 5.0
    return min(
        _SLOW_BUDGET_MAX_SECONDS,
        max(_SLOW_BUDGET_MIN_SECONDS, estimated),
    )


async def _recover_failed_internal_thumbnails(
    failures: dict[str, str],
    get_object,
) -> tuple[dict[str, bytes], dict[str, str], dict]:
    candidates = [
        url
        for url, reason in failures.items()
        if _is_internal_image_url(url) and reason in _TRANSIENT_FAILURE_REASONS
    ]
    if not candidates:
        return {}, dict(failures), {
            "slow_requested": 0,
            "slow_recovered": 0,
            "slow_timed_out": 0,
        }

    semaphore = asyncio.Semaphore(_SLOW_IMAGE_CONCURRENCY)
    tasks = [
        asyncio.create_task(_prepare_one_thumbnail_slow(url, get_object, semaphore))
        for url in candidates
    ]
    budget = _slow_recovery_budget_seconds(len(candidates))
    done, pending = await asyncio.wait(tasks, timeout=budget)

    recovered: dict[str, bytes] = {}
    remaining = dict(failures)

    for task in done:
        try:
            url, data, reason = task.result()
        except Exception:
            continue
        if data:
            recovered[url] = data
            remaining.pop(url, None)
        else:
            remaining[url] = reason or "unknown_failure"

    for task in pending:
        task.cancel()

    for task, url in zip(tasks, candidates):
        if task in pending:
            remaining[url] = "slow_recovery_budget_timeout"

    return recovered, remaining, {
        "slow_requested": len(candidates),
        "slow_recovered": len(recovered),
        "slow_timed_out": sum(
            1 for url in candidates if "timeout" in str(remaining.get(url, ""))
        ),
    }


async def _prefetch_thumbnails(products: list[dict], get_object) -> tuple[dict[str, bytes], dict]:
    urls = _primary_urls(products)
    if not urls:
        return {}, {
            "requested": 0,
            "prepared": 0,
            "timed_out": 0,
            "failed": 0,
            "retried": 0,
            "failures": {},
            "slow_requested": 0,
            "slow_recovered": 0,
            "slow_timed_out": 0,
        }

    semaphore = asyncio.Semaphore(_IMAGE_CONCURRENCY)
    tasks = [
        asyncio.create_task(_prepare_one_thumbnail(url, get_object, semaphore))
        for url in urls
    ]
    done, pending = await asyncio.wait(tasks, timeout=_TOTAL_IMAGE_BUDGET_SECONDS)

    cache: dict[str, bytes] = {}
    failures: dict[str, str] = {}
    retried = 0

    for task in done:
        try:
            url, data, reason, attempts = task.result()
        except Exception:
            continue
        if attempts > 1:
            retried += 1
        if data:
            cache[url] = data
        else:
            failures[url] = reason or "unknown_failure"

    for task in pending:
        task.cancel()

    for task, url in zip(tasks, urls):
        if task in pending:
            failures[url] = "total_budget_timeout"

    # Second pass only for transient failures on internal product-image objects.
    # This scales with the number of failures rather than the total catalogue,
    # and remains capped by _SLOW_BUDGET_MAX_SECONDS.
    slow_cache, failures, slow_meta = await _recover_failed_internal_thumbnails(
        failures, get_object
    )
    cache.update(slow_cache)

    return cache, {
        "requested": len(urls),
        "prepared": len(cache),
        "timed_out": sum(1 for reason in failures.values() if "timeout" in reason),
        "failed": len(failures),
        "retried": retried,
        "failures": failures,
        **slow_meta,
    }


def install_catalogue_excel(load_admin_func) -> None:
    """Install the bounded-time Excel export on the active FastAPI app."""
    server_module = _find_server_module()
    if server_module is None:
        return
    app = server_module.app
    if getattr(app.state, "sge_catalogue_excel_installed", False):
        return

    @app.get("/api/admin/catalogue/products.xlsx")
    async def admin_catalogue_products_xlsx(request: Request):
        user = await load_admin_func(server_module.db, request)
        if user is None:
            if request.cookies.get("session_token") or request.headers.get("Authorization"):
                raise HTTPException(status_code=403, detail="Not authorized for admin.")
            raise HTTPException(status_code=401, detail="Authentication required.")

        products = await server_module.db.products.find(
            {}, {"_id": 0}
        ).sort("sku", 1).to_list(length=10000)

        thumbnails, preload = await _prefetch_thumbnails(products, server_module.get_object)

        payload, metadata = await asyncio.to_thread(
            build_catalogue_workbook,
            products,
            image_loader=lambda url: thumbnails.get(url),
        )

        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return Response(
            content=payload,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Cache-Control": "private, no-store",
                "Content-Disposition": f'attachment; filename="samrat-glass-full-product-catalogue-{stamp}.xlsx"',
                "X-Catalogue-Products": str(metadata["total"]),
                "X-Catalogue-Embedded-Images": str(metadata["embedded_images"]),
                "X-Catalogue-Image-Failures": str(metadata["image_failures"]),
                "X-Catalogue-Thumbnail-Requested": str(preload["requested"]),
                "X-Catalogue-Thumbnail-Prepared": str(preload["prepared"]),
                "X-Catalogue-Thumbnail-Timed-Out": str(preload["timed_out"]),
                "X-Catalogue-Thumbnail-Failed": str(preload["failed"]),
                "X-Catalogue-Thumbnail-Retried": str(preload["retried"]),
                "X-Catalogue-Slow-Recovery-Requested": str(preload["slow_requested"]),
                "X-Catalogue-Slow-Recovery-Recovered": str(preload["slow_recovered"]),
                "X-Catalogue-Slow-Recovery-Timed-Out": str(preload["slow_timed_out"]),
            },
        )

    app.state.sge_catalogue_excel_installed = True
