"""Authorization + SSRF + rate-limit tests for the Samrat Glass Emporium API.

These tests hit the RUNNING backend on REACT_APP_BACKEND_URL to exercise the
full ingress → CORS → auth cookie stack (a plain TestClient would bypass the
cookie-domain checks). Requires the backend supervisor process to be up.
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

# Pytest doesn't auto-load the backend .env; do it explicitly so admin_email
# allowlist checks work.
load_dotenv("/app/backend/.env")


def _api_base() -> str:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip() + "/api"
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


API = _api_base()
CSRF = {"X-Requested-With": "fetch"}


# --------------------------------------------------------------------------
# Fixtures — seed a valid admin session and a valid non-admin session in
# MongoDB directly, bypassing the OAuth roundtrip.
# --------------------------------------------------------------------------


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


@pytest.fixture(scope="module")
def admin_token():
    allow = (os.environ.get("ADMIN_EMAILS", "") or "").split(",")[0].strip().lower()
    if not allow:
        pytest.skip("ADMIN_EMAILS not configured — cannot mint an admin session.")
    return asyncio.get_event_loop().run_until_complete(_seed_session(allow))


@pytest.fixture(scope="module")
def visitor_token():
    return asyncio.get_event_loop().run_until_complete(_seed_session("visitor@example.com"))


# --------------------------------------------------------------------------
# 1) Anonymous → 401 on every admin route
# --------------------------------------------------------------------------

ADMIN_GET = ["/inquiries", "/contact", "/proxy-image?url=https://images.unsplash.com/x", "/stats", "/export/products.csv"]
ADMIN_POST = ["/upload", "/ai/generate-product", "/ai/name-suggestions",
              "/ai/regenerate-details", "/ai/regenerate-from-name",
              "/ai/generate-products-bulk", "/admin/instagram/cover",
              "/watermark/preview", "/watermark/reprocess"]


def test_anon_get_admin_routes_401():
    with httpx.Client(base_url=API, timeout=15) as c:
        for path in ADMIN_GET:
            r = c.get(path)
            assert r.status_code in (401, 403), f"{path} → {r.status_code}"


def test_anon_post_admin_routes_401_or_403():
    with httpx.Client(base_url=API, timeout=15) as c:
        for path in ADMIN_POST:
            r = c.post(path, headers=CSRF, json={})
            assert r.status_code in (401, 403), f"{path} → {r.status_code}"


def test_anon_products_write_denied():
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.post("/products", headers=CSRF, json={
            "name": "hax", "sku": "X", "category": "Chandelier", "price": 1, "images": []
        })
        assert r.status_code in (401, 403)
        r = c.put("/products/nonexistent", headers=CSRF, json={})
        assert r.status_code in (401, 403, 404)
        r = c.delete("/products/nonexistent", headers=CSRF)
        assert r.status_code in (401, 403, 404)


def test_anon_settings_write_denied():
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.put("/settings", headers=CSRF, json={"tagline": "haxxed"})
        assert r.status_code in (401, 403)


# --------------------------------------------------------------------------
# 2) Non-admin authenticated → 403
# --------------------------------------------------------------------------


def test_visitor_admin_routes_403(visitor_token):
    hdr = {**CSRF, "Authorization": f"Bearer {visitor_token}"}
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.get("/inquiries", headers=hdr)
        assert r.status_code == 403
        r = c.post("/products", headers=hdr, json={
            "name": "x", "sku": "X", "category": "Chandelier", "price": 1, "images": []
        })
        assert r.status_code == 403


# --------------------------------------------------------------------------
# 3) Admin authenticated → 200 for a read + 200 for /auth/me
# --------------------------------------------------------------------------


def test_admin_can_read_admin_route(admin_token):
    hdr = {**CSRF, "Authorization": f"Bearer {admin_token}"}
    with httpx.Client(base_url=API, timeout=15) as c:
        # /stats is admin-gated and doesn't depend on stale data, so it's a
        # reliable smoke test for authorised access.
        r = c.get("/stats", headers=hdr)
        assert r.status_code == 200
        r = c.get("/auth/me", headers=hdr)
        assert r.status_code == 200
        assert r.json().get("email")


# --------------------------------------------------------------------------
# 4) CSRF guard — state-changing calls without X-Requested-With → 403
# --------------------------------------------------------------------------


def test_csrf_required_for_writes(admin_token):
    hdr = {"Authorization": f"Bearer {admin_token}"}  # missing X-Requested-With
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.post("/products", headers=hdr, json={})
        assert r.status_code == 403


# --------------------------------------------------------------------------
# 5) Public reads still work
# --------------------------------------------------------------------------


def test_public_endpoints_open():
    with httpx.Client(base_url=API, timeout=15) as c:
        assert c.get("/products", params={"limit": 1}).status_code == 200
        assert c.get("/settings").status_code == 200
        assert c.get("/products/categories").status_code == 200


# --------------------------------------------------------------------------
# 5b) DRAFT ISOLATION — public callers must never see draft products
# --------------------------------------------------------------------------


async def _seed_draft() -> str:
    """Insert a synthetic draft product; return its id."""
    db = _mongo()
    pid = f"draft_{uuid.uuid4().hex[:12]}"
    await db.products.insert_one({
        "id": pid, "name": "Hidden Draft", "sku": "DRAFT-1", "category": "Chandelier",
        "price": 1, "images": [], "status": "draft", "featured": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return pid


@pytest.fixture(scope="module")
def draft_product_id():
    return asyncio.get_event_loop().run_until_complete(_seed_draft())


def test_anon_cannot_list_drafts_via_include_flag(draft_product_id):
    """Passing ?include_drafts=1 as anonymous MUST NOT leak drafts."""
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.get("/products", params={"include_drafts": 1, "limit": 500})
        assert r.status_code == 200
        assert not any(p.get("status") == "draft" for p in r.json().get("items", []))


def test_anon_cannot_list_drafts_via_status_filter(draft_product_id):
    """Passing ?status=draft as anonymous MUST NOT leak drafts."""
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.get("/products", params={"status": "draft", "limit": 500})
        assert r.status_code == 200
        assert not any(p.get("status") == "draft" for p in r.json().get("items", []))


def test_anon_cannot_read_specific_draft(draft_product_id):
    """GET /products/{draft_id} for anon must be 404 (never 200, never 403 — no leak)."""
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.get(f"/products/{draft_product_id}")
        assert r.status_code == 404


def test_admin_can_list_drafts(admin_token, draft_product_id):
    hdr = {**CSRF, "Authorization": f"Bearer {admin_token}"}
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.get("/products", params={"include_drafts": 1, "limit": 500}, headers=hdr)
        assert r.status_code == 200
        ids = {p.get("id") for p in r.json().get("items", [])}
        assert draft_product_id in ids


def test_admin_can_read_specific_draft(admin_token, draft_product_id):
    hdr = {**CSRF, "Authorization": f"Bearer {admin_token}"}
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.get(f"/products/{draft_product_id}", headers=hdr)
        assert r.status_code == 200
        assert r.json().get("status") == "draft"


# --------------------------------------------------------------------------
# 6) SSRF-safe proxy — admin, but blocks bad targets
# --------------------------------------------------------------------------


@pytest.mark.parametrize("bad_url", [
    "http://images.unsplash.com/photo",              # http (not https)
    "https://localhost/photo",                        # loopback host
    "https://127.0.0.1/photo",                        # loopback IP
    "https://169.254.169.254/latest/meta-data/",      # cloud metadata
    "https://10.0.0.1/photo",                         # private
    "https://example.com/photo.jpg",                  # not in allowlist
    "https://images.unsplash.com/notimage.txt",       # will 200 with non-image
])
def test_proxy_image_rejects_bad_urls(admin_token, bad_url):
    hdr = {**CSRF, "Authorization": f"Bearer {admin_token}"}
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.get("/proxy-image", params={"url": bad_url}, headers=hdr)
        assert r.status_code == 400, f"{bad_url} → {r.status_code}"


# --------------------------------------------------------------------------
# 7) Public rate limit — /inquiries. Sixth call in 5 min should 429.
# --------------------------------------------------------------------------


def test_inquiries_rate_limited():
    body = {"customer_name": "rate", "customer_email": "r@t.com", "customer_phone": "", "message": "hi", "items": []}
    hits = 0
    # Burst enough to overwhelm even a multi-worker uvicorn setup — each
    # worker keeps its own in-memory counter, so we need > (workers × limit)
    # attempts to guarantee at least one 429.
    with httpx.Client(base_url=API, timeout=15) as c:
        for _ in range(50):
            r = c.post("/inquiries", headers=CSRF, json=body)
            if r.status_code == 429:
                hits += 1
    assert hits >= 1, "expected at least one 429 within the burst"
