"""Regression tests for /api/sitemap.xml (image extension, no <image:title>)."""
import os
import re
import xml.etree.ElementTree as ET
import uuid

import httpx
import pytest


BASE = os.environ.get("BACKEND_BASE_URL", "http://localhost:8001")
SITEMAP_URL = f"{BASE}/api/sitemap.xml"

NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "image": "http://www.google.com/schemas/sitemap-image/1.1",
}


def _get_sitemap():
    resp = httpx.get(SITEMAP_URL, timeout=30)
    assert resp.status_code == 200, resp.text
    assert "xml" in resp.headers.get("content-type", "").lower()
    return resp.text


def test_sitemap_is_valid_xml_and_declares_image_namespace():
    body = _get_sitemap()
    root = ET.fromstring(body)
    assert root.tag.endswith("urlset")
    assert 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' in body


def test_every_image_entry_has_a_non_empty_absolute_loc():
    body = _get_sitemap()
    root = ET.fromstring(body)
    images = root.findall(".//image:image", NS)
    if not images:
        pytest.skip("CI catalogue has no published product images")
    for img in images:
        loc = img.find("image:loc", NS)
        assert loc is not None and loc.text and loc.text.strip(), (
            "every <image:image> must contain a non-empty <image:loc>"
        )
        assert re.match(r"^https?://", loc.text), (
            f"image location must be absolute: {loc.text!r}"
        )


def test_no_image_title_elements_are_emitted():
    body = _get_sitemap()
    # Neither the raw string nor the parsed tree should carry <image:title>.
    assert "<image:title>" not in body, "<image:title> is deprecated and must not be emitted"
    root = ET.fromstring(body)
    titles = root.findall(".//image:title", NS)
    assert titles == [], "no <image:title> elements should exist in the sitemap"


def test_sitemap_preserves_readable_sku_slug_urls():
    body = _get_sitemap()
    root = ET.fromstring(body)
    product_locs = [
        (loc.text or "")
        for loc in root.findall(".//sm:url/sm:loc", NS)
        if "/product/" in (loc.text or "")
    ]
    if not product_locs:
        pytest.skip("CI catalogue has no published products")
    # PR #39 URL shape: /product/<slug>-<sku-lower>. Generic fixtures
    # created by other CI tests do not necessarily carry production-style SKUs.
    production_locs = [url for url in product_locs if "-sge-" in url]
    if not production_locs:
        pytest.skip("CI catalogue has no products with production-style SKUs")
    assert all(
        re.search(r"/product/.+-sge-[a-z]+-\d+$", url)
        for url in production_locs
    )
    # And every product URL must be absolute + origin-anchored.
    for url in product_locs:
        assert url.startswith("https://"), f"product URL must be absolute: {url!r}"


@pytest.mark.no_reset
def test_sitemap_excludes_draft_products():
    """A newly created draft product must never appear in the sitemap."""
    sku = f"IMGSEO-DRAFT-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "name": f"Sitemap Draft Probe {sku}",
        "sku": sku,
        "category": "Chandelier",
        "price": 12000,
        "images": ["https://example.com/probe.jpg"],
        "status": "draft",
    }
    admin_token = os.environ.get("ADMIN_TEST_TOKEN")
    if not admin_token:
        pytest.skip("ADMIN_TEST_TOKEN not set — cannot create draft product for exclusion test")
    headers = {"Authorization": f"Bearer {admin_token}"}
    created = httpx.post(f"{BASE}/api/products", json=payload, headers=headers, timeout=20)
    if created.status_code != 200:
        pytest.skip(f"admin create not authorised in this env (status {created.status_code})")
    pid = created.json().get("id")
    try:
        body = _get_sitemap()
        assert sku not in body, "draft product SKU must not appear in sitemap"
        assert "example.com/probe.jpg" not in body, (
            "draft product image must not appear in sitemap"
        )
    finally:
        httpx.delete(f"{BASE}/api/products/{pid}", headers=headers, timeout=20)
