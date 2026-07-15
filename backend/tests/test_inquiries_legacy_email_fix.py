"""
P1 bug fix verification: GET /api/inquiries must not 500 on legacy rows where
customer_email='' or None (rows written by /catalogue-request lead endpoint).

Also verifies:
- POST /api/inquiries with a valid EmailStr still works.
- POST /api/inquiries with empty-string email is rejected (422).
- POST /api/catalogue-request still works and rows are visible in GET /api/inquiries.
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


def _mongo():
    mongo_url = "mongodb://localhost:27017"
    db_name = "samrat_glass_emporium"
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
def _seed_and_cleanup():
    # Seed the three legacy inquiry rows expected by the tests.
    seed = """
    db.inquiries.insertMany([
      {id:"TEST_legacy_blank_email", customer_name:"Legacy Test", customer_email:"",
       customer_phone:"999", message:"", items:[], total:0, status:"new",
       created_at:new Date().toISOString()},
      {id:"TEST_legacy_null_email", customer_name:"Legacy Null", customer_email:null,
       customer_phone:"888", message:"", items:[], total:0, status:"new",
       created_at:new Date().toISOString()},
      {id:"TEST_legacy_whitespace_email", customer_name:"Legacy WS", customer_email:"   ",
       customer_phone:"777", message:"", items:[], total:0, status:"new",
       created_at:new Date().toISOString()}
    ]);
    // Ensure admin test session exists (matches ADMIN_EMAILS).
    db.users.updateOne({user_id:"user_test"},
      {$set:{user_id:"user_test", email:"raks.agarwal325@gmail.com", name:"Test Admin",
             created_at:new Date().toISOString()}}, {upsert:true});
    db.user_sessions.updateOne({session_token:"test_admin_session"},
      {$set:{session_token:"test_admin_session", user_id:"user_test",
             email:"raks.agarwal325@gmail.com",
             expires_at:new Date(Date.now()+86400000).toISOString(),
             created_at:new Date().toISOString()}}, {upsert:true});
    """
    _run_mongo(seed)
    yield
    _run_mongo(
        'db.inquiries.deleteMany({id:{$in:['
        '"TEST_legacy_blank_email","TEST_legacy_null_email","TEST_legacy_whitespace_email"]}});'
        'db.inquiries.deleteMany({customer_name:{$regex:"^TEST_"}});'
    )


# ---------- 1. GET /api/inquiries must return 200, no 500 on legacy rows ----------
def test_get_inquiries_returns_200_and_lists_legacy_blank_email_row():
    r = requests.get(f"{API}/inquiries", cookies=ADMIN_COOKIES, timeout=30)
    assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text[:400]}"
    data = r.json()
    assert isinstance(data, list)

    by_id = {row.get("id"): row for row in data}

    # Legacy row with customer_email='' must appear with customer_email=None
    assert "TEST_legacy_blank_email" in by_id, "legacy blank-email row missing from GET"
    row = by_id["TEST_legacy_blank_email"]
    assert row["customer_email"] is None, f"Expected None, got {row['customer_email']!r}"
    assert row["customer_name"] == "Legacy Test"

    # Legacy row with customer_email=null
    assert "TEST_legacy_null_email" in by_id
    assert by_id["TEST_legacy_null_email"]["customer_email"] is None

    # Legacy row with whitespace-only email
    assert "TEST_legacy_whitespace_email" in by_id
    assert by_id["TEST_legacy_whitespace_email"]["customer_email"] is None


def test_get_inquiries_requires_admin():
    # Anon must NOT be able to list inquiries.
    r = requests.get(f"{API}/inquiries", timeout=15)
    assert r.status_code in (401, 403), f"Expected 401/403 got {r.status_code}"


# ---------- 2. POST /api/inquiries with valid email works ----------
def test_post_inquiries_valid_email_creates_and_persists():
    # Grab a real published product so the new server-side price/name lookup
    # succeeds. `product_id` must exist in the products collection.
    prods = requests.get(f"{API}/products?limit=1", timeout=30).json()
    assert isinstance(prods, list) and prods, "No products seeded for test"
    prod = prods[0]
    real_price = float(prod.get("price") or 0)

    email = f"TEST_valid_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "customer_name": "Valid Test",
        "customer_email": email,
        "customer_phone": "+919000000001",
        "message": "valid inquiry",
        # Client tries to manipulate price/name/sku — must be ignored.
        "items": [{
            "product_id": prod["id"],
            "name": "SPOOFED NAME",
            "sku": "SPOOFED-SKU",
            "quantity": 2,
            "price": 1.0,
        }],
    }
    r = requests.post(
        f"{API}/inquiries",
        json=payload,
        headers=STATE_CHANGE_HEADERS,
        timeout=30,
    )
    assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text[:400]}"
    body = r.json()
    assert body["customer_email"] == email
    assert body["customer_name"] == "Valid Test"
    # Server must compute total from the real product price, not the client's 1.0.
    assert body["total"] == real_price * 2, (
        f"Total should be server-computed real_price*qty={real_price * 2}, got {body['total']}"
    )
    # Server must overwrite name/sku from the DB.
    assert body["items"][0]["name"] == prod["name"]
    assert body["items"][0]["sku"] == prod.get("sku")
    assert body["items"][0]["price"] == real_price
    assert "id" in body
    created_id = body["id"]

    # Verify visible via GET
    r2 = requests.get(f"{API}/inquiries", cookies=ADMIN_COOKIES, timeout=30)
    assert r2.status_code == 200
    ids = {row["id"] for row in r2.json()}
    assert created_id in ids


# ---------- 3. POST /api/inquiries with blank email is rejected ----------
def test_post_inquiries_empty_email_rejected_422():
    payload = {
        "customer_name": "Blank Email",
        "customer_email": "",
        "customer_phone": "+919000000002",
        "message": "should be rejected",
        "items": [],
    }
    r = requests.post(
        f"{API}/inquiries",
        json=payload,
        headers=STATE_CHANGE_HEADERS,
        timeout=30,
    )
    assert r.status_code == 422, f"Expected 422 got {r.status_code}: {r.text[:400]}"


def test_post_inquiries_missing_email_rejected_422():
    payload = {
        "customer_name": "No Email",
        "customer_phone": "+919000000003",
        "message": "should be rejected - missing email",
        "items": [],
    }
    r = requests.post(
        f"{API}/inquiries",
        json=payload,
        headers=STATE_CHANGE_HEADERS,
        timeout=30,
    )
    assert r.status_code == 422


# ---------- 4. POST /api/catalogue-request produces a row visible via GET /api/inquiries ----------
def test_catalogue_request_creates_row_visible_in_inquiries():
    payload = {
        "name": f"TEST_catalogue_{uuid.uuid4().hex[:6]}",
        "phone": f"+9199{uuid.uuid4().int % 100000000:08d}",
        "source": "contact_page",
    }
    r = requests.post(
        f"{API}/catalogue-request",
        json=payload,
        headers=STATE_CHANGE_HEADERS,
        timeout=30,
    )
    assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text[:400]}"
    body = r.json()
    assert body.get("success") is True
    assert "id" in body

    # This row is stored with customer_email='' — GET must still work
    r2 = requests.get(f"{API}/inquiries", cookies=ADMIN_COOKIES, timeout=30)
    assert r2.status_code == 200, f"GET after catalogue-request 500'd: {r2.text[:400]}"
    rows = r2.json()
    # Find our newly created row by matching customer_name
    match = [row for row in rows if row.get("customer_name") == payload["name"]]
    assert match, f"Newly created catalogue-request row not visible; name={payload['name']!r}"
    got = match[0]
    # customer_email must be coerced to None
    assert got["customer_email"] is None, f"Expected None got {got['customer_email']!r}"
    assert got["customer_phone"] == payload["phone"]


# ---------- Cleanup at module teardown ----------
