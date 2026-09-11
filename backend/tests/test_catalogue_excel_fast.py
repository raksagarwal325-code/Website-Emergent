import asyncio
import time

import pytest

import catalogue_excel_fast as fast


def test_primary_urls_deduplicate_and_skip_blanks():
    products = [
        {"images": ["/api/files/a.jpg", "/api/files/a-2.jpg"]},
        {"images": ["/api/files/a.jpg"]},
        {"images": ["  "]},
        {"images": []},
        {},
        {"images": ["/api/files/b.jpg"]},
    ]
    assert fast._primary_urls(products) == ["/api/files/a.jpg", "/api/files/b.jpg"]


@pytest.mark.asyncio
async def test_prefetch_prepares_thumbnails_concurrently(monkeypatch):
    products = [{"images": [f"/api/files/{i}.jpg"]} for i in range(8)]

    def fake_primary(url, get_object):
        time.sleep(0.05)
        return b"raw"

    def fake_thumb(raw, max_side):
        return b"thumb"

    monkeypatch.setattr(fast, "_primary_image_bytes", fake_primary)
    monkeypatch.setattr(fast, "_normalise_thumbnail", fake_thumb)
    monkeypatch.setattr(fast, "_IMAGE_CONCURRENCY", 8)
    monkeypatch.setattr(fast, "_TOTAL_IMAGE_BUDGET_SECONDS", 2.0)

    started = time.monotonic()
    cache, metadata = await fast._prefetch_thumbnails(products, object())
    elapsed = time.monotonic() - started

    assert elapsed < 0.30
    assert len(cache) == 8
    assert metadata == {"requested": 8, "prepared": 8, "timed_out": 0}


@pytest.mark.asyncio
async def test_prefetch_returns_partial_cache_when_budget_expires(monkeypatch):
    products = [{"images": ["fast"]}, {"images": ["slow"]}]

    def fake_primary(url, get_object):
        if url == "slow":
            time.sleep(0.2)
        return b"raw"

    monkeypatch.setattr(fast, "_primary_image_bytes", fake_primary)
    monkeypatch.setattr(fast, "_normalise_thumbnail", lambda raw, max_side: b"thumb")
    monkeypatch.setattr(fast, "_IMAGE_CONCURRENCY", 2)
    monkeypatch.setattr(fast, "_TOTAL_IMAGE_BUDGET_SECONDS", 0.05)
    monkeypatch.setattr(fast, "_PER_IMAGE_TIMEOUT_SECONDS", 1.0)

    cache, metadata = await fast._prefetch_thumbnails(products, object())

    assert cache.get("fast") == b"thumb"
    assert metadata["requested"] == 2
    assert metadata["prepared"] == 1
    assert metadata["timed_out"] == 1
