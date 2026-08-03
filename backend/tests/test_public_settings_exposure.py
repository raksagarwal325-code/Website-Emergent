"""
P0 security regression tests — public `GET /api/settings` MUST NEVER expose
the server-side Google Maps / Places API credential.

The vulnerability: prior to the fix, `GET /api/settings` returned the full
`Settings` Pydantic model, which included `google_maps_api_key`. Any
anonymous visitor could `curl /api/settings` and read the credential.

Fix: introduced a reduced `PublicSettings` response model whose field
allow-list explicitly OMITS all server-side secrets. A new
`GET /api/admin/settings` (protected by `require_admin`) serves the full
Settings object to the admin panel.

This test suite pins:
  A. anonymous GET returns 200 and NEVER contains `google_maps_api_key`
  B. anonymous GET still exposes representative public fields
  C. anonymous GET does not expose `watermark` (admin-only operational
     config), guarding against future field additions leaking again
  D. admin GET /admin/settings returns the full model (incl. the key)
  E. anon GET /admin/settings returns 401 (auth gate present)
  F. PUT /settings remains admin-protected + CSRF-guarded

We use a dedicated seed value for the key that:
  * is easy to recognise in test output (`TESTKEY_...`), so no real
    credential ever appears in logs; and
  * is restored to its previous value on teardown so the live Google
    Reviews path is not affected outside the tests.
"""

import os
import subprocess
import uuid
import requests
import pytest
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_COOKIES = {"session_token": "test_admin_session"}
STATE_CHANGE_HEADERS = {"X-Requested-With": "fetch"}

# Marker value used ONLY inside these tests. Recognisable in output so
# we can assert-not-in the public payload without ever printing a real
# production credential.
_TEST_KEY_MARKER = f"TESTKEY_{uuid.uuid4().hex}"


def _mongo():
    mongo_url = "mongodb://localhost:27017"
    db_name = "test_database"
    with open("/app/backend/.env") as f:
        for line in f:
            if line.startswith("MONGO_URL="):
                mongo_url = line.split("=", 1)[1].strip().strip('"').strip("'")
            elif line.startswith("DB_NAME="):
                db_name = line.split("=", 1)[1].strip().strip('"').strip("'")
    return mongo_url, db_name


def _run_mongo(script):
    mongo_url, db_name = _mongo()
    return subprocess.run(
        ["mongosh", f"{mongo_url}/{db_name}", "--quiet", "--eval", script],
        check=False, capture_output=True, timeout=20,
    )


@pytest.fixture(scope="module", autouse=True)
def _seed_test_marker_and_restore():
    """Save the current google_maps_api_key, replace with a test marker,
    run the tests, then restore the original value. This lets us assert
    the exact test marker is not leaking without ever having to know or
    log the production credential."""
    # Snapshot the existing value into an ephemeral field so we can
    # restore it after the tests without ever having it in Python
    # process memory.
    _run_mongo(
        'const s = db.settings.findOne({id:"settings"});'
        f'db.settings.updateOne({{id:"settings"}},'
        f'{{"$set":{{'
        f'"_test_backup_gmapikey": (s ? s.google_maps_api_key : ""),'
        f'"google_maps_api_key": "{_TEST_KEY_MARKER}"'
        f'}}}}, {{upsert:true}});'
    )
    yield
    # Restore original value + drop the backup.
    _run_mongo(
        'const s = db.settings.findOne({id:"settings"});'
        'db.settings.updateOne({id:"settings"},'
        '{"$set":{"google_maps_api_key": (s ? s._test_backup_gmapikey : "")},'
        ' "$unset":{"_test_backup_gmapikey": ""}});'
    )


# ---------- A. Public endpoint returns 200 and NEVER exposes the key ----------
def test_public_settings_endpoint_returns_200_anonymously():
    r = requests.get(f"{API}/settings", timeout=15)
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text[:200]}"
    data = r.json()
    assert isinstance(data, dict)


def test_public_settings_excludes_google_maps_api_key():
    """The critical P0 assertion. Verifies (a) the field is NOT in the
    response keys and (b) the seeded test marker string is not present
    anywhere in the raw response body."""
    r = requests.get(f"{API}/settings", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "google_maps_api_key" not in data, (
        "SECURITY REGRESSION: /api/settings exposes google_maps_api_key. "
        f"Response keys: {sorted(data.keys())}"
    )
    # Belt-and-braces: even if a future refactor renames the key, the
    # marker must not appear anywhere in the JSON body.
    assert _TEST_KEY_MARKER not in r.text, (
        "SECURITY REGRESSION: the seeded test credential leaked into the "
        "public /api/settings response body under some other key name."
    )


def test_public_settings_also_excludes_watermark_admin_field():
    """Watermark is admin-only operational config. Not a secret, but
    following least-privilege it is not shipped to public visitors. This
    test guards against a future change putting it back on the public
    model."""
    r = requests.get(f"{API}/settings", timeout=15)
    data = r.json()
    assert "watermark" not in data


# ---------- B. Public endpoint still returns required public fields ----------
def test_public_settings_includes_required_public_fields():
    """Every field the public frontend actually reads must still be
    returned. The set below is derived from the current codebase
    (grep 'settings\\.<field>' across src/) — do not shrink it without
    updating the corresponding frontend usage."""
    r = requests.get(f"{API}/settings", timeout=15)
    data = r.json()
    required = {
        "brand_name",
        "tagline",
        "whatsapp_number",
        "admin_email",       # public contact address in Footer / Contact
        "hero_image",
        "address",
        "gstin",
        "delivery_info",
        "payment_methods",
        "business_hours",
        "google_cid",        # used to build Maps URL client-side
        "google_place_id",   # used to build "write review" URL client-side
        "google_maps_url",
        "instagram_url",
        "facebook_url",
        "youtube_url",
        "pinterest_url",
        "homepage_content",
        "currency_symbol",
    }
    missing = required - set(data.keys())
    assert not missing, (
        f"Public settings is missing fields the frontend expects: {sorted(missing)}"
    )


# ---------- C. Admin GET /admin/settings gate ----------
def test_admin_settings_requires_authentication():
    r = requests.get(f"{API}/admin/settings", timeout=15)
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"


def test_admin_settings_returns_full_settings_for_admin():
    r = requests.get(
        f"{API}/admin/settings",
        cookies=ADMIN_COOKIES,
        timeout=15,
    )
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text[:200]}"
    data = r.json()
    # The admin view is allowed to include the credential — that is
    # what the admin panel form needs to render.
    assert "google_maps_api_key" in data
    # We do NOT print the value. Instead we assert against the seeded
    # marker so the check is self-verifying without leaking anything.
    assert data["google_maps_api_key"] == _TEST_KEY_MARKER, (
        "admin endpoint did not return the seeded test key value"
    )


# ---------- D. Settings mutation stays admin-protected + CSRF-guarded ----------
def test_put_settings_requires_admin_auth():
    r = requests.put(
        f"{API}/settings",
        json={"tagline": "should never persist"},
        headers=STATE_CHANGE_HEADERS,
        timeout=15,
    )
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"


def test_put_settings_requires_csrf_header():
    r = requests.put(
        f"{API}/settings",
        json={"tagline": "should never persist"},
        cookies=ADMIN_COOKIES,  # cookie present, no X-Requested-With
        timeout=15,
    )
    assert r.status_code == 403, f"expected 403, got {r.status_code}"


# ---------- E. Google Reviews still works (server-side key access) ----------
def test_google_reviews_endpoint_still_works_and_never_leaks_key():
    """Google Reviews reads the key server-side and must NOT include it
    in the public response. It should still expose the boolean
    `api_key_set` so the frontend can decide whether to render a live
    rating."""
    r = requests.get(f"{API}/google/reviews", timeout=15)
    assert r.status_code == 200
    data = r.json()
    # Boolean-only signal exposed publicly.
    assert "api_key_set" in data
    assert data["api_key_set"] is True, (
        "Server-side google_maps_api_key was not read successfully; the "
        "public /settings fix must not break the Google Reviews backend."
    )
    # Never expose the raw value.
    assert "google_maps_api_key" not in data
    assert _TEST_KEY_MARKER not in r.text
