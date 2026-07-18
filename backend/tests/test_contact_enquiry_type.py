"""
POST /api/contact — enquiry_type wiring tests.

Verifies:
  - No `enquiry_type` in payload → server stores "general".
  - Valid enquiry_type ("general" / "bulk" / "trade") is stored verbatim.
  - Invalid enquiry_type ("wholesale", "", "0", etc.) safely falls back
    to "general" — the endpoint MUST NOT 422.
  - Admin GET /api/contact returns the enquiry_type field for later rows.

Existing contact validation (missing name/email/message → 422/400) MUST
still hold.
"""
import os
import uuid
import subprocess
import requests
import pytest
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_COOKIES = {"session_token": "test_admin_session"}
STATE_CHANGE_HEADERS = {"X-Requested-With": "fetch"}


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
def _seed_admin_and_cleanup():
    _run_mongo(
        'db.users.updateOne({user_id:"user_test"},'
        '{$set:{user_id:"user_test", email:"raks.agarwal325@gmail.com", name:"Test Admin",'
        ' created_at:new Date().toISOString()}}, {upsert:true});'
        'db.user_sessions.updateOne({session_token:"test_admin_session"},'
        '{$set:{session_token:"test_admin_session", user_id:"user_test",'
        ' email:"raks.agarwal325@gmail.com",'
        ' expires_at:new Date(Date.now()+86400000).toISOString(),'
        ' created_at:new Date().toISOString()}}, {upsert:true});'
    )
    yield
    _run_mongo('db.contact_messages.deleteMany({name: /^TEST_ENQ_/});')


def _post_contact(payload):
    return requests.post(f"{API}/contact", json=payload, headers=STATE_CHANGE_HEADERS, timeout=30)


def _base_body(**overrides):
    tag = uuid.uuid4().hex[:6]
    body = {
        "name": f"TEST_ENQ_{tag}",
        "email": f"test-{tag}@example.com",
        "subject": "TEST enquiry",
        "message": "TEST message body long enough to pass any length checks.",
    }
    body.update(overrides)
    return body


def _find_created(name):
    r = requests.get(f"{API}/contact", cookies=ADMIN_COOKIES, timeout=30)
    assert r.status_code == 200, r.text
    rows = r.json()
    matches = [m for m in rows if m.get("name") == name]
    assert matches, f"created message {name} not found in admin list"
    return matches[0]


# ---------- 1) No enquiry_type → general ----------
def test_missing_enquiry_type_defaults_to_general():
    body = _base_body()
    r = _post_contact(body)
    assert r.status_code == 200, r.text
    assert r.json()["enquiry_type"] == "general"
    row = _find_created(body["name"])
    assert row["enquiry_type"] == "general"


# ---------- 2) Explicit general is stored verbatim ----------
def test_enquiry_type_general_stored_verbatim():
    body = _base_body(enquiry_type="general")
    r = _post_contact(body)
    assert r.status_code == 200, r.text
    assert r.json()["enquiry_type"] == "general"


# ---------- 3) bulk stored + surfaced in admin listing ----------
def test_enquiry_type_bulk_stored_and_admin_visible():
    body = _base_body(enquiry_type="bulk")
    r = _post_contact(body)
    assert r.status_code == 200, r.text
    assert r.json()["enquiry_type"] == "bulk"
    row = _find_created(body["name"])
    assert row["enquiry_type"] == "bulk"


# ---------- 4) trade stored + surfaced in admin listing ----------
def test_enquiry_type_trade_stored_and_admin_visible():
    body = _base_body(enquiry_type="trade")
    r = _post_contact(body)
    assert r.status_code == 200, r.text
    assert r.json()["enquiry_type"] == "trade"
    row = _find_created(body["name"])
    assert row["enquiry_type"] == "trade"


# ---------- 5) Invalid values safely fall back to general ----------
@pytest.mark.parametrize("bad", [
    "wholesale",
    "GENERAL_ADMIN",
    "bulk;drop table",
    "",
    "0",
    "<script>",
])
def test_enquiry_type_invalid_falls_back_to_general(bad):
    body = _base_body(enquiry_type=bad)
    r = _post_contact(body)
    assert r.status_code == 200, f"invalid enquiry_type={bad!r} should NOT 422, got {r.status_code}: {r.text[:200]}"
    assert r.json()["enquiry_type"] == "general"


# ---------- 6) Case-insensitive coercion ----------
@pytest.mark.parametrize("case_variant,expected", [
    ("BULK", "bulk"),
    ("Trade", "trade"),
    ("  general  ", "general"),
])
def test_enquiry_type_case_insensitive(case_variant, expected):
    body = _base_body(enquiry_type=case_variant)
    r = _post_contact(body)
    assert r.status_code == 200, r.text
    assert r.json()["enquiry_type"] == expected


# ---------- 7) Existing validation still works ----------
def test_missing_message_still_422():
    r = _post_contact({"name": "TEST_ENQ_x", "email": "x@example.com"})
    assert r.status_code == 422, r.text


def test_bad_email_still_422():
    r = _post_contact({
        "name": "TEST_ENQ_x", "email": "not-an-email",
        "message": "hi", "enquiry_type": "bulk",
    })
    assert r.status_code == 422


# ---------- 8) Admin listing exposes enquiry_type key on legacy rows too ----------
def test_admin_list_returns_enquiry_type_default_for_legacy_rows():
    # Simulate a legacy row lacking the field.
    legacy_id = f"TEST_ENQ_LEGACY_{uuid.uuid4().hex[:6]}"
    _run_mongo(
        f'db.contact_messages.insertOne({{id:"{legacy_id}",'
        f' name:"{legacy_id}", email:"legacy@example.com",'
        f' subject:"Legacy", message:"TEST legacy row lacking enquiry_type.",'
        f' created_at:new Date().toISOString()}});'
    )
    try:
        r = requests.get(f"{API}/contact", cookies=ADMIN_COOKIES, timeout=30)
        assert r.status_code == 200, r.text
        rows = r.json()
        row = next((m for m in rows if m.get("name") == legacy_id), None)
        assert row is not None, "legacy row not surfaced"
        # Pydantic response_model gives the default when the DB row lacks it.
        assert row.get("enquiry_type") == "general", row
    finally:
        _run_mongo(f'db.contact_messages.deleteOne({{id:"{legacy_id}"}});')
