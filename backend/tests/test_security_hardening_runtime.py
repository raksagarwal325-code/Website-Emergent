"""Regression tests for the final security-hardening layer.

These tests hit the running backend, matching the rest of the integration
security suite. They are intentionally non-destructive.
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


async def _seed_admin_session() -> str:
    email = (os.environ.get("ADMIN_EMAILS", "") or "").split(",")[0].strip().lower()
    if not email:
        raise RuntimeError("ADMIN_EMAILS not configured")
    db = _mongo()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    token = f"security_{uuid.uuid4().hex}"
    await db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": "Security Test",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "email": email,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return token


@pytest.fixture(scope="module")
def admin_token():
    # Python 3.13 no longer guarantees an implicit event loop in sync code.
    # asyncio.run creates and closes a dedicated loop for this one-time fixture.
    return asyncio.run(_seed_admin_session())


def test_api_security_headers_present():
    with httpx.Client(base_url=API, timeout=15) as client:
        response = client.get("/settings", headers={"X-Forwarded-Proto": "https"})
    assert response.status_code == 200
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in response.headers.get("permissions-policy", "")
    assert "default-src 'none'" in response.headers.get("content-security-policy", "")
    assert response.headers.get("strict-transport-security") == "max-age=31536000; includeSubDomains"


def test_cors_allows_only_expected_request_headers():
    origin = "https://security-test.emergentagent.com"
    with httpx.Client(base_url=API, timeout=15) as client:
        good = client.options(
            "/settings",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,x-requested-with",
            },
        )
        bad = client.options(
            "/settings",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "x-evil-header",
            },
        )
    assert good.status_code == 200
    assert good.headers.get("access-control-allow-origin") == origin
    assert "x-requested-with" in good.headers.get("access-control-allow-headers", "").lower()
    assert bad.status_code == 400


@pytest.mark.parametrize("bad_url", [
    "http://images.unsplash.com/photo.jpg",
    "https://127.0.0.1/photo.jpg",
    "https://169.254.169.254/latest/meta-data/",
    "https://example.com/photo.jpg",
])
def test_ai_external_image_fetch_uses_ssrf_guard(admin_token, bad_url):
    headers = {**CSRF, "Authorization": f"Bearer {admin_token}"}
    with httpx.Client(base_url=API, timeout=15) as client:
        response = client.post(
            "/ai/generate-product",
            headers=headers,
            json={"image_url": bad_url},
        )
    assert response.status_code == 400, f"{bad_url} -> {response.status_code}: {response.text[:200]}"
