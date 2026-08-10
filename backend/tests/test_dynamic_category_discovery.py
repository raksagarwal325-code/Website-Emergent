"""
Regression test: dynamic category discovery.

`GET /api/products/categories` MUST return every category that appears on
at least one PUBLISHED product, and MUST NOT return categories that only
appear on drafts. This is the data source the frontend now consumes to
surface newly-published categories (like "Ceiling Light") without a
code deploy.
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

RUN = uuid.uuid4().hex[:8]
NEW_CATEGORY = f"TestNewCategory_{RUN}"
DRAFT_ONLY_CATEGORY = f"TestDraftCategory_{RUN}"


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
        check=False, capture_output=True, timeout=15,
    )


def _seed(status: str, category: str, suffix: str):
    pid = f"TEST_DYNCAT_{RUN}_{suffix}"
    _run_mongo(f"""
      db.products.insertOne({{
        id:"{pid}", name:"Dyn Cat Test {suffix} {RUN}",
        sku:"TEST-DYN-{RUN}-{suffix}",
        description:"regression",
        short_description:"regression",
        category:"{category}",
        price:100, currency:"INR", stock:1,
        status:"{status}", rating:0, review_count:0, featured:false,
        images:[], tags:[],
        created_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      }});
    """)
    return pid


@pytest.fixture(scope="module", autouse=True)
def _seed_and_teardown():
    _seed("published", NEW_CATEGORY, "pub")
    _seed("draft", DRAFT_ONLY_CATEGORY, "drf")
    yield
    _run_mongo(f'db.products.deleteMany({{id:{{$regex:"^TEST_DYNCAT_{RUN}_"}}}});')


def test_new_published_category_appears_in_public_categories_endpoint():
    r = requests.get(f"{API}/products/categories", timeout=10)
    assert r.status_code == 200
    cats = r.json()
    assert NEW_CATEGORY in cats, (
        f"published-product category {NEW_CATEGORY!r} did NOT appear in "
        f"public /api/products/categories response: {cats}"
    )


def test_draft_only_category_does_not_appear_publicly():
    r = requests.get(f"{API}/products/categories", timeout=10)
    cats = r.json()
    assert DRAFT_ONLY_CATEGORY not in cats, (
        f"draft-only category {DRAFT_ONLY_CATEGORY!r} MUST NOT be exposed "
        f"via public /api/products/categories: {cats}"
    )


def test_admin_still_sees_all_categories_including_drafts():
    r = requests.get(
        f"{API}/products/categories",
        cookies={"session_token": "test_admin_session"},
        timeout=10,
    )
    cats = r.json()
    assert NEW_CATEGORY in cats
    assert DRAFT_ONLY_CATEGORY in cats


def test_filtering_catalog_by_new_category_returns_only_published():
    r = requests.get(
        f"{API}/products?category={NEW_CATEGORY}&limit=100",
        timeout=10,
    )
    assert r.status_code == 200
    data = r.json()
    for row in data.get("items", []):
        assert row.get("status") == "published"
        assert row.get("category") == NEW_CATEGORY
    assert data.get("total", 0) >= 1
