"""
Security tests for POST /api/inquiries — client-supplied name/sku/price are
NEVER trusted. The server always resolves each item from the products
collection by product_id and computes the total on the server.

These tests prove:
- A manipulated `price` in the request body cannot change the persisted total.
- A manipulated `name`/`sku` in the request body is overwritten with DB values.
- Requesting a missing product returns 400.
- Requesting a draft product returns 400.
- quantity must be an int in [1, 100] — outside that range is 422.
"""

import os
import uuid
import requests
import pytest
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_COOKIES = {"session_token": "test_admin_session"}
STATE_CHANGE_HEADERS = {"X-Requested-With": "fetch"}


def _fetch_a_product():
    r = requests.get(f"{API}/products?limit=5", timeout=30)
    assert r.status_code == 200, r.text
    prods = r.json()
    assert isinstance(prods, list) and prods, "no seeded products"
    return prods[0]


# ---------- Price cannot be manipulated ----------
def test_client_price_is_ignored_server_uses_db_price():
    prod = _fetch_a_product()
    real_price = float(prod.get("price") or 0)

    # Client tries to slam price down to 1.00 for a real product.
    payload = {
        "customer_name": "Price Manipulator",
        "customer_email": f"TEST_pm_{uuid.uuid4().hex[:8]}@example.com",
        "customer_phone": "+919000000010",
        "message": "attempting to override price",
        "items": [{
            "product_id": prod["id"],
            "name": "totally different name",
            "sku": "HACK-000",
            "quantity": 3,
            "price": 0.01,
        }],
    }
    r = requests.post(f"{API}/inquiries", json=payload, headers=STATE_CHANGE_HEADERS, timeout=30)
    assert r.status_code == 200, f"Got {r.status_code}: {r.text[:400]}"
    body = r.json()
    # Server-computed total must be based on real DB price, not client's 0.01.
    assert body["total"] == real_price * 3
    item = body["items"][0]
    assert item["price"] == real_price, "client price leaked through"
    assert item["name"] == prod["name"], "client name leaked through"
    assert item["sku"] == prod.get("sku"), "client sku leaked through"
    assert item["quantity"] == 3
    assert item["product_id"] == prod["id"]


def test_multiple_items_total_is_sum_of_server_prices():
    r = requests.get(f"{API}/products?limit=3", timeout=30)
    prods = r.json()
    assert isinstance(prods, list) and len(prods) >= 2, "need >=2 products"
    a, b = prods[0], prods[1]
    payload = {
        "customer_name": "Multi Item",
        "customer_email": f"TEST_mi_{uuid.uuid4().hex[:8]}@example.com",
        "customer_phone": "+919000000011",
        "message": "",
        "items": [
            {"product_id": a["id"], "quantity": 2, "price": 999999.0},
            {"product_id": b["id"], "quantity": 1, "price": 999999.0},
        ],
    }
    resp = requests.post(f"{API}/inquiries", json=payload, headers=STATE_CHANGE_HEADERS, timeout=30)
    assert resp.status_code == 200, resp.text[:400]
    body = resp.json()
    expected = float(a.get("price") or 0) * 2 + float(b.get("price") or 0) * 1
    assert body["total"] == expected


# ---------- Missing / draft products rejected ----------
def test_missing_product_id_returns_400():
    payload = {
        "customer_name": "Missing Prod",
        "customer_email": f"TEST_mp_{uuid.uuid4().hex[:8]}@example.com",
        "customer_phone": "+919000000012",
        "items": [{"product_id": "does-not-exist-xyz", "quantity": 1, "price": 100}],
    }
    r = requests.post(f"{API}/inquiries", json=payload, headers=STATE_CHANGE_HEADERS, timeout=30)
    assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text[:200]}"


def test_draft_product_returns_400():
    # Seed a draft product directly via Mongo, then try to inquire on it.
    # If we can't seed directly, skip.
    import subprocess, json as _json
    # parse .env robustly (values may be quoted)
    mongo_url = "mongodb://localhost:27017"
    db_name = "samrat_glass_emporium"
    with open("/app/backend/.env") as f:
        for line in f:
            if line.startswith("MONGO_URL="):
                mongo_url = line.split("=", 1)[1].strip().strip('"').strip("'")
            elif line.startswith("DB_NAME="):
                db_name = line.split("=", 1)[1].strip().strip('"').strip("'")

    draft_id = f"TEST_draft_{uuid.uuid4().hex[:8]}"
    script = f"""
    db.products.insertOne({{
      id: "{draft_id}",
      name: "TEST Draft Product",
      sku: "TEST-DRAFT-001",
      category: "TestCat",
      price: 500,
      currency: "INR",
      status: "draft",
      images: [],
      created_at: new Date().toISOString(),
    }});
    """
    try:
        subprocess.run(
            ["mongosh", f"{mongo_url}/{db_name}", "--quiet", "--eval", script],
            check=True, capture_output=True, timeout=15,
        )
    except Exception as e:
        pytest.skip(f"Cannot seed draft product via mongosh: {e}")

    try:
        payload = {
            "customer_name": "Draft Attempt",
            "customer_email": f"TEST_da_{uuid.uuid4().hex[:8]}@example.com",
            "customer_phone": "+919000000013",
            "items": [{"product_id": draft_id, "quantity": 1, "price": 100}],
        }
        r = requests.post(f"{API}/inquiries", json=payload, headers=STATE_CHANGE_HEADERS, timeout=30)
        assert r.status_code == 400, f"Expected 400 for draft product, got {r.status_code}: {r.text[:200]}"
    finally:
        subprocess.run(
            ["mongosh", f"{mongo_url}/{db_name}", "--quiet", "--eval",
             f'db.products.deleteOne({{id:"{draft_id}"}})'],
            capture_output=True, timeout=15,
        )


# ---------- Quantity validation ----------
def test_quantity_zero_rejected_422():
    prod = _fetch_a_product()
    payload = {
        "customer_name": "Qty Zero",
        "customer_email": f"TEST_qz_{uuid.uuid4().hex[:8]}@example.com",
        "customer_phone": "+919000000014",
        "items": [{"product_id": prod["id"], "quantity": 0, "price": 100}],
    }
    r = requests.post(f"{API}/inquiries", json=payload, headers=STATE_CHANGE_HEADERS, timeout=30)
    assert r.status_code == 422, f"Expected 422 got {r.status_code}: {r.text[:200]}"


def test_quantity_over_100_rejected_422():
    prod = _fetch_a_product()
    payload = {
        "customer_name": "Qty Big",
        "customer_email": f"TEST_qb_{uuid.uuid4().hex[:8]}@example.com",
        "customer_phone": "+919000000015",
        "items": [{"product_id": prod["id"], "quantity": 101, "price": 100}],
    }
    r = requests.post(f"{API}/inquiries", json=payload, headers=STATE_CHANGE_HEADERS, timeout=30)
    assert r.status_code == 422, f"Expected 422 got {r.status_code}: {r.text[:200]}"


def test_quantity_upper_bound_100_accepted():
    prod = _fetch_a_product()
    payload = {
        "customer_name": "Qty Upper",
        "customer_email": f"TEST_qu_{uuid.uuid4().hex[:8]}@example.com",
        "customer_phone": "+919000000016",
        "items": [{"product_id": prod["id"], "quantity": 100, "price": 100}],
    }
    r = requests.post(f"{API}/inquiries", json=payload, headers=STATE_CHANGE_HEADERS, timeout=30)
    assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text[:200]}"
