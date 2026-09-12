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


def test_internal_image_url_detection():
    assert fast._is_internal_image_url("/api/files/lumiere-catalog/products/a.png")
    assert fast._is_internal_image_url("api/files/lumiere-catalog/products/a.png")
    assert fast._is_internal_image_url("https://samratglass.com/api/files/lumiere-catalog/products/a.png")
    assert not fast._is_internal_image_url("https://customer-assets.emergentagent.com/a.png")
    assert not fast._is_internal_image_url("bad-image")


def test_slow_recovery_budget_is_adaptive_but_capped():
    assert fast._slow_recovery_budget_seconds(0) == 0
    assert fast._slow_recovery_budget_seconds(1) >= fast._SLOW_BUDGET_MIN_SECONDS
    assert fast._slow_recovery_budget_seconds(10_000) == fast._SLOW_BUDGET_MAX_SECONDS


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
    assert metadata["requested"] == 8
    assert metadata["prepared"] == 8
    assert metadata["timed_out"] == 0
    assert metadata["failed"] == 0
    assert metadata["retried"] == 0
    assert metadata["failures"] == {}
    assert metadata["slow_requested"] == 0
    assert metadata["slow_recovered"] == 0


@pytest.mark.asyncio
async def test_prefetch_retries_failed_fetch_once(monkeypatch):
    products = [{"images": ["retry-me"]}]
    calls = {"count": 0}

    def fake_primary(url, get_object):
        calls["count"] += 1
        return None if calls["count"] == 1 else b"raw"

    monkeypatch.setattr(fast, "_primary_image_bytes", fake_primary)
    monkeypatch.setattr(fast, "_normalise_thumbnail", lambda raw, max_side: b"thumb")
    monkeypatch.setattr(fast, "_RETRY_DELAY_SECONDS", 0.0)

    cache, metadata = await fast._prefetch_thumbnails(products, object())

    assert cache["retry-me"] == b"thumb"
    assert calls["count"] == 2
    assert metadata["prepared"] == 1
    assert metadata["retried"] == 1
    assert metadata["failed"] == 0
    assert metadata["failures"] == {}
    assert metadata["slow_requested"] == 0


@pytest.mark.asyncio
async def test_slow_pass_recovers_internal_image_after_fast_pass_fails(monkeypatch):
    url = "/api/files/lumiere-catalog/products/slow.png"
    products = [{"images": [url]}]
    calls = {"count": 0}

    def fake_primary(_url, get_object):
        calls["count"] += 1
        # Both fast attempts fail; the slow recovery attempt succeeds.
        return None if calls["count"] <= 2 else b"raw"

    monkeypatch.setattr(fast, "_primary_image_bytes", fake_primary)
    monkeypatch.setattr(fast, "_normalise_thumbnail", lambda raw, max_side: b"thumb")
    monkeypatch.setattr(fast, "_RETRY_DELAY_SECONDS", 0.0)
    monkeypatch.setattr(fast, "_SLOW_RETRY_DELAY_SECONDS", 0.0)

    cache, metadata = await fast._prefetch_thumbnails(products, object())

    assert cache[url] == b"thumb"
    assert calls["count"] == 3
    assert metadata["prepared"] == 1
    assert metadata["failed"] == 0
    assert metadata["failures"] == {}
    assert metadata["slow_requested"] == 1
    assert metadata["slow_recovered"] == 1
    assert metadata["slow_timed_out"] == 0


@pytest.mark.asyncio
async def test_invalid_internal_image_is_not_retried_in_slow_pass(monkeypatch):
    url = "/api/files/lumiere-catalog/products/invalid.png"
    products = [{"images": [url]}]
    calls = {"count": 0}

    def fake_primary(_url, get_object):
        calls["count"] += 1
        return b"not-an-image"

    monkeypatch.setattr(fast, "_primary_image_bytes", fake_primary)
    monkeypatch.setattr(fast, "_normalise_thumbnail", lambda raw, max_side: None)
    monkeypatch.setattr(fast, "_RETRY_DELAY_SECONDS", 0.0)

    cache, metadata = await fast._prefetch_thumbnails(products, object())

    assert cache == {}
    assert calls["count"] == 2
    assert metadata["failed"] == 1
    assert metadata["failures"] == {url: "invalid_image"}
    assert metadata["slow_requested"] == 0
    assert metadata["slow_recovered"] == 0


@pytest.mark.asyncio
async def test_prefetch_returns_failure_reason_after_retry(monkeypatch):
    products = [{"images": ["bad-image"]}]

    monkeypatch.setattr(fast, "_primary_image_bytes", lambda url, get_object: None)
    monkeypatch.setattr(fast, "_RETRY_DELAY_SECONDS", 0.0)

    cache, metadata = await fast._prefetch_thumbnails(products, object())

    assert cache == {}
    assert metadata["requested"] == 1
    assert metadata["prepared"] == 0
    assert metadata["failed"] == 1
    assert metadata["retried"] == 1
    assert metadata["failures"] == {"bad-image": "fetch_or_validation_failed"}
    assert metadata["slow_requested"] == 0


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
    monkeypatch.setattr(fast, "_RETRY_DELAY_SECONDS", 0.0)

    cache, metadata = await fast._prefetch_thumbnails(products, object())

    assert cache.get("fast") == b"thumb"
    assert metadata["requested"] == 2
    assert metadata["prepared"] == 1
    assert metadata["failed"] == 1
    assert metadata["timed_out"] == 1
    assert metadata["failures"]["slow"] == "total_budget_timeout"
    assert metadata["slow_requested"] == 0
