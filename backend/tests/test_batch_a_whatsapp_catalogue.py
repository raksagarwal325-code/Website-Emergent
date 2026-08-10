"""Batch A tests — WhatsApp validation, catalogue admin-only access."""
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


async def _seed_admin() -> str:
    db = _mongo()
    email = (os.environ.get("ADMIN_EMAILS", "") or "").split(",")[0].strip().lower()
    token = f"test_{uuid.uuid4().hex}"
    await db.users.insert_one({
        "user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email, "name": "Admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.user_sessions.insert_one({
        "session_token": token, "user_id": "x", "email": email,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return token


async def _fetch_and_delete_inquiry(rid: str):
    db = _mongo()
    doc = await db.inquiries.find_one({"id": rid}, {"_id": 0})
    await db.inquiries.delete_one({"id": rid})
    return doc


@pytest.fixture(scope="module")
def admin_token():
    if not (os.environ.get("ADMIN_EMAILS", "") or "").strip():
        pytest.skip("ADMIN_EMAILS not configured")
    return asyncio.run(_seed_admin())


# ---- WhatsApp validation on /api/catalogue-request ----------------------

def test_catalogue_request_rejects_blank_whatsapp():
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.post("/catalogue-request", headers=CSRF,
                   json={"name": "Test", "phone": "", "source": "test"})
        assert r.status_code == 400
        assert "whatsapp" in r.json()["detail"].lower()


def test_catalogue_request_rejects_invalid_whatsapp():
    with httpx.Client(base_url=API, timeout=15) as c:
        for bad in ["12345", "5876543210", "0876543210", "+1234567890"]:
            r = c.post("/catalogue-request", headers=CSRF,
                       json={"name": "Test", "phone": bad, "source": "test"})
            assert r.status_code == 400, f"{bad} was not rejected: {r.text}"
            assert "10-digit" in r.json()["detail"] or "whatsapp" in r.json()["detail"].lower()


def test_catalogue_request_normalises_valid_whatsapp():
    """All three accepted formats should land as +91XXXXXXXXXX in the DB."""
    accepted = ["9876543210", "+919876543210", "919876543210"]
    for raw in accepted:
        with httpx.Client(base_url=API, timeout=15) as c:
            r = c.post("/catalogue-request", headers=CSRF,
                       json={"name": "Norm Test", "phone": raw, "source": "unit-test"})
            assert r.status_code == 200, f"{raw} failed: {r.text}"
            rid = r.json()["id"]
            # Verify persisted shape and clean up within one event loop.
            doc = asyncio.run(_fetch_and_delete_inquiry(rid))
            assert doc is not None
            assert doc["customer_whatsapp"] == "+919876543210"
            assert doc["customer_phone"] == "+919876543210"


# ---- Catalogue export is admin-only -------------------------------------

def test_admin_products_export_requires_auth():
    with httpx.Client(base_url=API, timeout=15) as c:
        r = c.get("/admin/products/export")
        assert r.status_code in (401, 403)


def test_admin_products_export_allows_admin(admin_token):
    hdr = {"Authorization": f"Bearer {admin_token}"}
    with httpx.Client(base_url=API, timeout=20) as c:
        r = c.get("/admin/products/export", headers=hdr)
        assert r.status_code == 200
        body = r.json()
        assert "items" in body and isinstance(body["items"], list)
        # Must not include draft products
        assert all((p.get("status") or "published") != "draft" for p in body["items"])
