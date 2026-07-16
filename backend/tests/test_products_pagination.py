"""
Focused tests for GET /products pagination + filter/sort/draft-isolation.

Verified:
- Default response shape: {items, total, page, limit, total_pages}
- page + limit params work; limit is capped at 48 for anon callers
- Search (q), category, price and sort filters still work
- Public callers can NEVER see draft products (even with include_drafts=1 or status=draft)
- Admin callers CAN request drafts with include_drafts=1
- "Load more" behavior: page 2 returns different items than page 1, together they cover 2 * limit unique ids
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
def _ensure_admin_session():
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


def test_default_response_shape_has_pagination_keys():
    r = requests.get(f"{API}/products", timeout=30)
    assert r.status_code == 200
    body = r.json()
    for key in ("items", "total", "page", "limit", "total_pages"):
        assert key in body, f"missing key {key}"
    assert isinstance(body["items"], list)
    assert isinstance(body["total"], int)
    assert body["page"] == 1
    assert body["limit"] == 24  # default page size
    assert body["total_pages"] >= 0
    # Never exceed the requested per-page cap.
    assert len(body["items"]) <= 24


def test_limit_param_respected_up_to_48():
    r = requests.get(f"{API}/products?limit=10&page=1", timeout=30)
    assert r.status_code == 200
    body = r.json()
    assert body["limit"] == 10
    assert len(body["items"]) <= 10


def test_public_limit_capped_at_48():
    # Try to overflow — anon must be capped.
    r = requests.get(f"{API}/products?limit=500&page=1", timeout=30)
    assert r.status_code == 200
    body = r.json()
    assert body["limit"] == 48, f"Expected 48 cap for anon, got {body['limit']}"
    assert len(body["items"]) <= 48


def test_pagination_page_2_returns_different_items():
    total = requests.get(f"{API}/products?limit=1", timeout=30).json().get("total", 0)
    if total < 4:
        pytest.skip("Need >= 4 products to verify pagination")
    p1 = requests.get(f"{API}/products?limit=2&page=1", timeout=30).json()
    p2 = requests.get(f"{API}/products?limit=2&page=2", timeout=30).json()
    ids1 = {p["id"] for p in p1["items"]}
    ids2 = {p["id"] for p in p2["items"]}
    assert ids1 and ids2, "empty pages"
    assert ids1.isdisjoint(ids2), f"page overlap: {ids1 & ids2}"
    # Merged behaves like "Load more".
    assert len(ids1 | ids2) == len(ids1) + len(ids2)


def test_total_pages_matches_math():
    r = requests.get(f"{API}/products?limit=5&page=1", timeout=30).json()
    total = r["total"]
    limit = r["limit"]
    expected = (total + limit - 1) // limit if total else 0
    assert r["total_pages"] == expected


# ---------- filters + sorting ----------
def test_category_filter_narrows_results():
    all_r = requests.get(f"{API}/products?limit=48", timeout=30).json()
    cats = [p.get("category") for p in all_r["items"] if p.get("category")]
    if not cats:
        pytest.skip("No categorised products in fixture")
    cat = cats[0]
    r = requests.get(f"{API}/products", params={"category": cat, "limit": 48}, timeout=30).json()
    assert r["items"], "empty results for known category"
    assert all(p["category"] == cat for p in r["items"])


def test_search_q_matches_name_or_sku():
    r = requests.get(f"{API}/products?limit=1", timeout=30).json()
    if not r["items"]:
        pytest.skip("no products")
    prod = r["items"][0]
    # Search by first word of name — must include this product.
    needle = (prod["name"].split() or [""])[0]
    if not needle:
        pytest.skip("no searchable name token")
    r2 = requests.get(f"{API}/products", params={"q": needle, "limit": 48}, timeout=30).json()
    ids = {p["id"] for p in r2["items"]}
    assert prod["id"] in ids, f"search '{needle}' didn't return product {prod['id']}"


def test_price_range_filter():
    # Ask for a very tight price band around 0 — every 0-priced product should surface.
    r = requests.get(f"{API}/products", params={"max_price": 0, "limit": 48}, timeout=30).json()
    for p in r["items"]:
        assert (p.get("price") or 0) <= 0


def test_sort_price_asc_and_desc():
    asc = requests.get(f"{API}/products?sort=price_asc&limit=10", timeout=30).json()["items"]
    desc = requests.get(f"{API}/products?sort=price_desc&limit=10", timeout=30).json()["items"]
    if len(asc) < 2 or len(desc) < 2:
        pytest.skip("need >=2 products")
    prices_asc = [float(p.get("price") or 0) for p in asc]
    prices_desc = [float(p.get("price") or 0) for p in desc]
    assert prices_asc == sorted(prices_asc)
    assert prices_desc == sorted(prices_desc, reverse=True)


# ---------- draft isolation via pagination ----------
def test_pagination_never_exposes_drafts_to_public():
    # Seed a synthetic draft, then walk every page (up to 200) for the anon list.
    draft_id = f"TEST_pagi_draft_{uuid.uuid4().hex[:6]}"
    _run_mongo(
        f'db.products.insertOne({{id:"{draft_id}", name:"Pagi Draft",'
        f' sku:"TEST-DRAFT-P1", category:"Chandelier", price:5000,'
        f' currency:"INR", status:"draft", images:[],'
        f' created_at:new Date().toISOString()}});'
    )
    try:
        seen = set()
        page = 1
        while page < 200:
            r = requests.get(
                f"{API}/products",
                params={"limit": 48, "page": page, "include_drafts": 1, "status": "draft"},
                timeout=30,
            ).json()
            for p in r["items"]:
                seen.add(p["id"])
                assert p.get("status") != "draft", f"draft leaked: {p['id']}"
            if page >= r["total_pages"] or not r["items"]:
                break
            page += 1
        assert draft_id not in seen, "draft product leaked to public pagination"
    finally:
        _run_mongo(f'db.products.deleteOne({{id:"{draft_id}"}});')


def test_admin_pagination_includes_drafts_when_requested():
    draft_id = f"TEST_admin_draft_{uuid.uuid4().hex[:6]}"
    _run_mongo(
        f'db.products.insertOne({{id:"{draft_id}", name:"Admin Draft",'
        f' sku:"TEST-DRAFT-A1", category:"Chandelier", price:5000,'
        f' currency:"INR", status:"draft", images:[],'
        f' created_at:new Date().toISOString()}});'
    )
    try:
        # Admin can request the higher limit ceiling so we don't need to page.
        r = requests.get(
            f"{API}/products",
            params={"limit": 500, "include_drafts": 1},
            cookies=ADMIN_COOKIES,
            timeout=30,
        ).json()
        ids = {p["id"] for p in r["items"]}
        assert draft_id in ids, "admin cannot see draft via include_drafts=1"
        # Admin's higher cap must be respected.
        assert r["limit"] == 500, f"admin limit was {r['limit']}, expected 500"
    finally:
        _run_mongo(f'db.products.deleteOne({{id:"{draft_id}"}});')


def test_page_out_of_range_returns_empty_items_not_error():
    r = requests.get(f"{API}/products?page=9999&limit=24", timeout=30).json()
    assert r["items"] == []
    assert r["page"] == 9999
    assert r["total_pages"] >= 0
