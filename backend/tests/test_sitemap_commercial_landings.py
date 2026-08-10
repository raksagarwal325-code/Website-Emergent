"""
Sitemap regression: commercial-lead landing pages must be indexable, and
draft products must never leak into the public sitemap.

Covers the two new URLs added to `_STATIC_SITEMAP_ENTRIES`:
    /custom-lighting-bulk-orders
    /architects-interior-designers

Also asserts the (pre-existing) contract that:
    - Only `status == "published"` products appear.
    - Draft/unpublished products are excluded.
"""
from __future__ import annotations

import asyncio
import os
import xml.etree.ElementTree as ET

import httpx


def _api_base() -> str:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip() + "/api"
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


def _site_origin() -> str:
    # The sitemap always emits `https://samratglass.com` regardless of
    # which host is serving the response (this is intentional so that
    # bots always index the canonical prod domain, not any preview
    # environment). This constant must match `_SITE_ORIGIN` in
    # backend/server.py.
    return "https://samratglass.com"


def _get_body() -> str:
    r = httpx.get(f"{_api_base()}/sitemap.xml", timeout=15)
    assert r.status_code == 200, r.text
    return r.text


def test_sitemap_contains_custom_lighting_landing():
    body = _get_body()
    origin = _site_origin()
    needle = f"<loc>{origin}/custom-lighting-bulk-orders</loc>"
    assert body.count(needle) == 1, (
        f"expected exactly one entry for /custom-lighting-bulk-orders, "
        f"got {body.count(needle)}"
    )


def test_sitemap_contains_architects_designers_landing():
    body = _get_body()
    origin = _site_origin()
    needle = f"<loc>{origin}/architects-interior-designers</loc>"
    assert body.count(needle) == 1, (
        f"expected exactly one entry for /architects-interior-designers, "
        f"got {body.count(needle)}"
    )


def test_commercial_landings_use_monthly_08_priority():
    """The suggested values from the task brief."""
    body = _get_body()
    origin = _site_origin()
    for path in ("/custom-lighting-bulk-orders", "/architects-interior-designers"):
        loc = f"<loc>{origin}{path}</loc>"
        # Extract the surrounding <url> block.
        idx = body.index(loc)
        block_start = body.rfind("<url>", 0, idx)
        block_end = body.index("</url>", idx)
        block = body[block_start : block_end + len("</url>")]
        assert "<changefreq>monthly</changefreq>" in block, block
        assert "<priority>0.8</priority>" in block, block


def test_sitemap_still_lists_homepage_and_categories():
    """Pre-existing entries must be preserved."""
    body = _get_body()
    origin = _site_origin()
    for path in ("/", "/catalog", "/gallery", "/category/chandeliers"):
        assert f"<loc>{origin}{path}</loc>" in body, f"missing {path}"


def test_sitemap_excludes_draft_products():
    """Guard: seed a draft product and confirm it is NOT in the sitemap."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from pathlib import Path
    import uuid
    from datetime import datetime, timezone

    env = dict(
        l.strip().split("=", 1)
        for l in Path("/app/backend/.env").read_text().splitlines()
        if l and "=" in l and not l.startswith("#")
    )
    mongo_url = env["MONGO_URL"].strip('"')
    db_name = env["DB_NAME"].strip('"')

    draft_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    async def _seed_and_check():
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        await db.products.insert_one({
            "id": draft_id,
            "name": "DRAFT sitemap test product",
            "sku": f"SGE-SITEMAP-{draft_id[:8]}",
            "category": "Chandelier",
            "price": 1000.0,
            "currency": "INR",
            "images": [],
            "tags": [],
            "specs": {},
            "stock": 0,
            "created_at": now,
            "updated_at": now,
            "status": "draft",
        })
        try:
            body = httpx.get(f"{_api_base()}/sitemap.xml", timeout=15).text
            assert draft_id not in body, "DRAFT product leaked into sitemap"
        finally:
            await db.products.delete_one({"id": draft_id})

    asyncio.run(_seed_and_check())


def test_sitemap_is_well_formed_xml():
    body = _get_body()
    root = ET.fromstring(body)  # raises on malformed
    assert root.tag.endswith("urlset")
