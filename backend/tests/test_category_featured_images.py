"""Category Featured Images (admin) — auth, validation, and SSRF tests.

These tests exercise the /category-featured-images endpoints against the
running backend, using the same session-token seeding pattern as
test_authz_ssrf_ratelimit. Every test:

  * Uses a randomly generated admin token seeded straight into MongoDB, so
    OAuth is never touched.
  * Cleans up any category doc it created via a `try/finally` so successive
    runs stay isolated.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")


def _api_base() -> str:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip() + "/api"
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


API = _api_base()
CSRF = {"X-Requested-With": "fetch"}


def _mongo():
    url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    dbname = os.environ.get("DB_NAME", "samrat_glass_emporium")
    return AsyncIOMotorClient(url)[dbname]


async def _seed_session(email: str) -> str:
    db = _mongo()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    token = f"test_{uuid.uuid4().hex}"
    await db.users.insert_one({
        "user_id": user_id, "email": email.lower(), "name": "Test",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.user_sessions.insert_one({
        "session_token": token, "user_id": user_id, "email": email.lower(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return token


async def _seed_product(category: str, images: list[str]) -> str:
    db = _mongo()
    pid = f"catfeat_{uuid.uuid4().hex[:10]}"
    await db.products.insert_one({
        "id": pid, "name": f"Test {category}", "sku": f"CFT-{pid[-6:]}",
        "category": category, "price": 1, "images": images,
        "status": "published", "featured": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return pid


async def _cleanup_category(category: str):
    db = _mongo()
    await db.category_featured_images.delete_one({"category": category})


async def _cleanup_product(pid: str):
    db = _mongo()
    await db.products.delete_one({"id": pid})


@pytest.fixture(scope="module")
def admin_token():
    allow = (os.environ.get("ADMIN_EMAILS", "") or "").split(",")[0].strip().lower()
    if not allow:
        pytest.skip("ADMIN_EMAILS not configured")
    return asyncio.get_event_loop().run_until_complete(_seed_session(allow))


@pytest.fixture(scope="module")
def visitor_token():
    return asyncio.get_event_loop().run_until_complete(
        _seed_session("visitor-catfeat@example.com"),
    )


# --------------------------------------------------------------------------
# Auth: anon and visitors cannot read/write admin endpoints
# --------------------------------------------------------------------------


def test_anon_cannot_list_admin_category_featured():
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.get("/admin/category-featured-images")
        assert r.status_code in (401, 403)


def test_anon_cannot_write_category_featured():
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.put("/admin/category-featured-images/Chandelier",
                  headers=CSRF, json={"product_id": "x", "image_url": "y"})
        assert r.status_code in (401, 403)
        r = c.delete("/admin/category-featured-images/Chandelier", headers=CSRF)
        assert r.status_code in (401, 403)


def test_visitor_cannot_write_category_featured(visitor_token):
    hdr = {**CSRF, "Authorization": f"Bearer {visitor_token}"}
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.put("/admin/category-featured-images/Chandelier", headers=hdr,
                  json={"product_id": "x", "image_url": "y"})
        assert r.status_code == 403


def test_admin_write_requires_csrf(admin_token):
    hdr = {"Authorization": f"Bearer {admin_token}"}  # missing X-Requested-With
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.put("/admin/category-featured-images/Chandelier", headers=hdr,
                  json={"product_id": "x", "image_url": "y"})
        assert r.status_code == 403


# --------------------------------------------------------------------------
# Public map is always openly readable
# --------------------------------------------------------------------------


def test_public_map_is_open():
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.get("/category-featured-images")
        assert r.status_code == 200
        assert isinstance(r.json(), dict)


# --------------------------------------------------------------------------
# Validation: category must be in the allow-list
# --------------------------------------------------------------------------


def test_admin_rejects_unknown_category(admin_token):
    hdr = {**CSRF, "Authorization": f"Bearer {admin_token}"}
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.put("/admin/category-featured-images/Sconce", headers=hdr,
                  json={"product_id": "x", "image_url": "y"})
        assert r.status_code == 400
        r = c.delete("/admin/category-featured-images/PendantLight", headers=hdr)
        assert r.status_code == 400


# --------------------------------------------------------------------------
# Validation: image_url MUST be one of the product's own images (SSRF guard)
# --------------------------------------------------------------------------


def test_admin_rejects_arbitrary_external_url(admin_token):
    hdr = {**CSRF, "Authorization": f"Bearer {admin_token}"}
    pid = asyncio.get_event_loop().run_until_complete(
        _seed_product("Wall Light", ["/api/files/legit.jpg"]),
    )
    try:
        with httpx.Client(base_url=API, timeout=15) as c:
            r = c.put("/admin/category-featured-images/Wall Light", headers=hdr,
                      json={"product_id": pid,
                            "image_url": "https://evil.example.com/x.jpg"})
            assert r.status_code == 400
    finally:
        asyncio.get_event_loop().run_until_complete(_cleanup_product(pid))
        asyncio.get_event_loop().run_until_complete(_cleanup_category("Wall Light"))


def test_admin_rejects_product_from_wrong_category(admin_token):
    hdr = {**CSRF, "Authorization": f"Bearer {admin_token}"}
    pid = asyncio.get_event_loop().run_until_complete(
        _seed_product("Table Lamp", ["/api/files/tablelamp.jpg"]),
    )
    try:
        with httpx.Client(base_url=API, timeout=15) as c:
            r = c.put("/admin/category-featured-images/Chandelier", headers=hdr,
                      json={"product_id": pid, "image_url": "/api/files/tablelamp.jpg"})
            assert r.status_code == 400
    finally:
        asyncio.get_event_loop().run_until_complete(_cleanup_product(pid))
        asyncio.get_event_loop().run_until_complete(_cleanup_category("Chandelier"))


def test_admin_rejects_missing_product(admin_token):
    hdr = {**CSRF, "Authorization": f"Bearer {admin_token}"}
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.put("/admin/category-featured-images/Floor Lamp", headers=hdr,
                  json={"product_id": "does-not-exist",
                        "image_url": "/api/files/x.jpg"})
        assert r.status_code == 404


# --------------------------------------------------------------------------
# Happy path: PUT (from product), then GET, then DELETE
# --------------------------------------------------------------------------


def test_admin_can_set_reset_and_public_map_reflects(admin_token):
    hdr = {**CSRF, "Authorization": f"Bearer {admin_token}"}
    img = f"/api/files/candle-{uuid.uuid4().hex[:6]}.jpg"
    pid = asyncio.get_event_loop().run_until_complete(
        _seed_product("Candle Stand", [img]),
    )
    try:
        with httpx.Client(base_url=API, timeout=15) as c:
            # 1) Set from an existing product's image
            r = c.put("/admin/category-featured-images/Candle Stand",
                      headers=hdr, json={"product_id": pid, "image_url": img})
            assert r.status_code == 200
            body = r.json()
            assert body["category"] == "Candle Stand"
            assert body["source_type"] == "product"
            assert body["image_url"] == img

            # 2) Admin list contains it
            r = c.get("/admin/category-featured-images",
                      headers={"Authorization": f"Bearer {admin_token}"})
            assert r.status_code == 200
            found = [d for d in r.json() if d["category"] == "Candle Stand"]
            assert len(found) == 1 and found[0]["product_id"] == pid

            # 3) Public map reflects the override
            r = c.get("/category-featured-images")
            assert r.status_code == 200
            assert r.json().get("Candle Stand") == img

            # 4) Reset — public map drops the key
            r = c.delete("/admin/category-featured-images/Candle Stand",
                         headers=hdr)
            assert r.status_code == 200
            r = c.get("/category-featured-images")
            assert "Candle Stand" not in r.json()
    finally:
        asyncio.get_event_loop().run_until_complete(_cleanup_product(pid))
        asyncio.get_event_loop().run_until_complete(_cleanup_category("Candle Stand"))


# --------------------------------------------------------------------------
# Upload validation: non-image mime is rejected, oversize is rejected
# --------------------------------------------------------------------------


def test_admin_rejects_non_image_upload(admin_token):
    hdr = {"Authorization": f"Bearer {admin_token}", "X-Requested-With": "fetch"}
    with httpx.Client(base_url=API, timeout=20) as c:
        r = c.post("/admin/category-featured-images/Hanging Light/upload",
                   headers=hdr,
                   files={"file": ("evil.txt", b"hello", "text/plain")})
        assert r.status_code == 400


def test_admin_rejects_oversize_upload(admin_token):
    hdr = {"Authorization": f"Bearer {admin_token}", "X-Requested-With": "fetch"}
    big = b"\xff" * (6 * 1024 * 1024 + 100)  # 6MB + 100B
    with httpx.Client(base_url=API, timeout=30) as c:
        r = c.post("/admin/category-featured-images/Hanging Light/upload",
                   headers=hdr,
                   files={"file": ("big.jpg", big, "image/jpeg")})
        assert r.status_code == 413
