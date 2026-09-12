"""Fast admin Excel catalogue export.

PR #274's first implementation fetched and resized product images one-by-one
while building the workbook. With hundreds of products that can exceed the
Cloudflare request timeout and surface as HTTP 524 even though the workbook
logic itself is valid.

This installer keeps the same download route and workbook format, but preloads
primary thumbnails concurrently under a bounded time budget. Thumbnail fetches
are retried once and return failure diagnostics so category exports can report
which image URLs still could not be embedded.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi import HTTPException, Request
from starlette.responses import Response

from catalogue_excel import (
    _find_server_module,
    _normalise_thumbnail,
    _primary_image_bytes,
    build_catalogue_workbook,
)

_IMAGE_CONCURRENCY = 16
_PER_IMAGE_TIMEOUT_SECONDS = 10.0
_TOTAL_IMAGE_BUDGET_SECONDS = 75.0
_THUMBNAIL_MAX_SIDE = 96
_MAX_ATTEMPTS = 2
_RETRY_DELAY_SECONDS = 0.15


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

    # Pending tasks exceeded the overall export budget. The URL remains in the
    # workbook and is listed in diagnostics so it can be investigated/retried.
    for task, url in zip(tasks, urls):
        if task in pending:
            failures[url] = "total_budget_timeout"

    return cache, {
        "requested": len(urls),
        "prepared": len(cache),
        "timed_out": sum(1 for reason in failures.values() if "timeout" in reason),
        "failed": len(failures),
        "retried": retried,
        "failures": failures,
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

        # build_catalogue_workbook performs one final inexpensive normalization
        # pass over these already-small PNG thumbnails. No network/storage I/O
        # occurs while the workbook itself is being assembled.
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
            },
        )

    app.state.sge_catalogue_excel_installed = True
