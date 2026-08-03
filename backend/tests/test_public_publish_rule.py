"""
Strict public product-publishing regression tests.

Before this fix, public product access used a deny-list
(`status != "draft"`), which meant rows with missing / null / empty /
unknown statuses (e.g. legacy imports, future workflow states like
"archived", "pending", "review") were publicly visible even though they
were never intended to be. Twelve real products with no `status` field
were leaking on the live site.

The rule now enforced by these tests:
    A product is publicly visible if and only if `status == "published"`.

All other statuses (draft, archived, pending, review, missing, null,
empty, foobar) must be invisible to anonymous visitors on every public
read path: list, categories, single-product GET, sitemap-adjacent, cart
inquiry validation, and review submission.

Admin behaviour is verified separately: signed-in admins must still be
able to list drafts and any other status they choose.

Every seeded row is deleted in teardown. No production data is touched.
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

# Unique, easily-recognisable markers so we can safely aggregate/assert
# without any risk of colliding with production rows.
RUN = uuid.uuid4().hex[:8]
CATEGORY_ORPHAN = f"PRIV_ORPHAN_CAT_{RUN}"  # only present on non-published rows
CATEGORY_PUB = f"PUB_ONLY_CAT_{RUN}"        # only present on the published row


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


def _seed_product(*, status_setter: str, category: str, name_suffix: str) -> str:
    """Insert one product row. `status_setter` is a JS fragment that becomes
    part of the Mongo insert doc — e.g. `status: "published"`, or a
    completely empty string for the missing-status case."""
    pid = f"TEST_PROD_{RUN}_{name_suffix}"
    inline = f"{status_setter}" if status_setter else ""
    if inline:
        inline = f", {inline}"
    _run_mongo(f"""
      db.products.insertOne({{
        id:"{pid}", name:"Publish Rule Test {name_suffix} {RUN}",
        sku:"TEST-{RUN}-{name_suffix}",
        description:"regression product — safe to delete",
        short_description:"regression",
        category:"{category}",
        price:1000, currency:"INR", stock:1,
        rating:0, review_count:0, featured:false,
        images:[], tags:[]
        {inline},
        created_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      }});
    """)
    return pid


@pytest.fixture(scope="module", autouse=True)
def _seed_all():
    """Seed one product per status class we care about. Two categories:
    a 'public-only' category attached only to the published row, and an
    'orphan' category attached only to non-published rows — used to
    assert the orphan category never surfaces in the public categories
    list."""
    ids = {
        "published":   _seed_product(status_setter='status:"published"',   category=CATEGORY_PUB,    name_suffix="pub"),
        "draft":       _seed_product(status_setter='status:"draft"',       category=CATEGORY_ORPHAN, name_suffix="drf"),
        "archived":    _seed_product(status_setter='status:"archived"',    category=CATEGORY_ORPHAN, name_suffix="arch"),
        "pending":     _seed_product(status_setter='status:"pending"',     category=CATEGORY_ORPHAN, name_suffix="pend"),
        "review":      _seed_product(status_setter='status:"review"',      category=CATEGORY_ORPHAN, name_suffix="rev"),
        "unknown":     _seed_product(status_setter='status:"foobar"',      category=CATEGORY_ORPHAN, name_suffix="unk"),
        "empty":       _seed_product(status_setter='status:""',            category=CATEGORY_ORPHAN, name_suffix="empty"),
        "null":        _seed_product(status_setter="status:null",          category=CATEGORY_ORPHAN, name_suffix="null"),
        "missing":     _seed_product(status_setter="",                     category=CATEGORY_ORPHAN, name_suffix="miss"),
    }
    yield ids
    _run_mongo(f'db.products.deleteMany({{id:{{$regex:"^TEST_PROD_{RUN}_"}}}});')


# ---------------------- helpers ----------------------

def _get_public_page(**params):
    r = requests.get(f"{API}/products", params=params, timeout=15)
    assert r.status_code == 200
    return r.json()


def _ids_in(payload):
    return {row.get("id") for row in payload.get("items", [])}


# ---------------------- 1) List: anonymous ----------------------

def test_anonymous_list_returns_only_published_test_row(_seed_all):
    """The core assertion: of the nine seeded rows, only the one with
    `status == "published"` may appear in the anonymous listing."""
    data = _get_public_page(limit=200)
    ids = _ids_in(data)
    assert _seed_all["published"] in ids, "the published seed must be listed"
    for key, seed_id in _seed_all.items():
        if key == "published":
            continue
        assert seed_id not in ids, (
            f"SECURITY REGRESSION: /api/products returned the {key!r} seed "
            f"({seed_id}) to an anonymous caller"
        )


# ---------------------- 2) List: parameter bypass attempts ----------------------

@pytest.mark.parametrize(
    "bypass_params",
    [
        {"status": "draft"},
        {"status": "archived"},
        {"status": "pending"},
        {"status": "foobar"},
        {"status": ""},
        {"include_drafts": "1"},
        {"include_drafts": "true"},
        {"include_drafts": "1", "status": "draft"},
    ],
    ids=["status_draft", "status_archived", "status_pending", "status_unknown",
         "status_empty", "include_drafts_1", "include_drafts_true", "combo"],
)
def test_anonymous_cannot_bypass_publish_filter_via_query_params(_seed_all, bypass_params):
    """Every bypass attempt must still return only the published seed —
    anonymous callers cannot override the filter with query params."""
    data = _get_public_page(limit=200, **bypass_params)
    ids = _ids_in(data)
    # published is the ONLY seeded row allowed here.
    for key, seed_id in _seed_all.items():
        if key == "published":
            continue
        assert seed_id not in ids, (
            f"SECURITY REGRESSION: anonymous {bypass_params!r} exposed "
            f"the {key!r} seed ({seed_id})"
        )


# ---------------------- 3) Detail: 404 for every non-published row ----------------------

def test_anonymous_get_published_product_returns_200(_seed_all):
    r = requests.get(f"{API}/products/{_seed_all['published']}", timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == _seed_all["published"]
    assert body["status"] == "published"


@pytest.mark.parametrize(
    "status_key",
    ["draft", "archived", "pending", "review", "unknown",
     "empty", "null", "missing"],
)
def test_anonymous_get_non_published_product_returns_404(_seed_all, status_key):
    """Every non-published status class must respond 404 anonymously
    (never 403 — 403 would reveal existence)."""
    seed_id = _seed_all[status_key]
    r = requests.get(f"{API}/products/{seed_id}", timeout=15)
    assert r.status_code == 404, (
        f"SECURITY REGRESSION: anonymous GET /api/products/{seed_id} for "
        f"status={status_key!r} returned {r.status_code}, expected 404. "
        f"Body: {r.text[:200]}"
    )


# ---------------------- 4) Categories ----------------------

def test_anonymous_categories_never_include_orphan_category(_seed_all):
    """The 'orphan' category is only attached to non-published rows, so
    it must never appear in the anonymous /api/products/categories list."""
    r = requests.get(f"{API}/products/categories", timeout=15)
    assert r.status_code == 200
    cats = r.json()
    assert CATEGORY_PUB in cats, (
        "published seed's category must appear in the public categories list"
    )
    assert CATEGORY_ORPHAN not in cats, (
        f"SECURITY REGRESSION: /api/products/categories exposed the orphan "
        f"category {CATEGORY_ORPHAN!r} which only exists on unpublished rows"
    )


# ---------------------- 5) Cart / inquiry validation ----------------------

@pytest.mark.parametrize(
    "status_key",
    ["draft", "archived", "pending", "review", "unknown",
     "empty", "null", "missing"],
)
def test_anonymous_cannot_add_non_published_product_to_inquiry(_seed_all, status_key):
    """The cart / inquiry endpoint independently re-validates every
    product against the strict published rule — even if a visitor
    somehow discovered an unpublished id, they still can't order it."""
    payload = {
        "customer_name": f"reg-test {RUN}",
        "customer_email": f"reg+{RUN}@example.com",
        "customer_phone": "+919000000000",
        "customer_whatsapp": "+919000000000",
        "message": "regression check — safe to ignore",
        "items": [{"product_id": _seed_all[status_key], "quantity": 1}],
    }
    r = requests.post(f"{API}/inquiries", json=payload,
                      headers=STATE_CHANGE_HEADERS, timeout=15)
    assert r.status_code == 400, (
        f"SECURITY REGRESSION: inquiry create accepted the {status_key!r} "
        f"seed. status={r.status_code} body={r.text[:200]}"
    )


# ---------------------- 6) Review submission validation ----------------------

@pytest.mark.parametrize(
    "status_key",
    ["draft", "archived", "pending", "review", "unknown",
     "empty", "null", "missing"],
)
def test_anonymous_cannot_submit_review_on_non_published_product(_seed_all, status_key):
    payload = {
        "product_id": _seed_all[status_key],
        "author": f"reg-test {RUN}",
        "rating": 5,
        "title": "regression",
        "body": "regression check — safe to ignore",
    }
    r = requests.post(f"{API}/reviews", json=payload,
                      headers=STATE_CHANGE_HEADERS, timeout=15)
    assert r.status_code == 400, (
        f"SECURITY REGRESSION: review create accepted the {status_key!r} "
        f"seed. status={r.status_code}"
    )


# ---------------------- 7) Admin behaviour unchanged ----------------------

def test_admin_can_still_list_drafts_via_status_param(_seed_all):
    r = requests.get(f"{API}/products",
                     params={"status": "draft", "limit": 200},
                     cookies=ADMIN_COOKIES, timeout=15)
    assert r.status_code == 200
    ids = _ids_in(r.json())
    assert _seed_all["draft"] in ids, (
        "admin must still see draft rows via ?status=draft"
    )


def test_admin_can_still_list_all_via_include_drafts(_seed_all):
    r = requests.get(f"{API}/products",
                     params={"include_drafts": "1", "limit": 200},
                     cookies=ADMIN_COOKIES, timeout=15)
    assert r.status_code == 200
    ids = _ids_in(r.json())
    # include_drafts asks for drafts + published together — the admin
    # dashboard depends on this to render "draft" badges next to
    # published rows in the same list.
    assert _seed_all["draft"] in ids
    assert _seed_all["published"] in ids


def test_admin_can_still_get_draft_product_detail(_seed_all):
    r = requests.get(f"{API}/products/{_seed_all['draft']}",
                     cookies=ADMIN_COOKIES, timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "draft"


def test_admin_categories_still_include_orphan_category(_seed_all):
    """Admin categories endpoint has no strict filter, so admins should
    continue to see every category — including one attached only to
    drafts — because that's how they curate."""
    r = requests.get(f"{API}/products/categories",
                     cookies=ADMIN_COOKIES, timeout=15)
    assert r.status_code == 200
    cats = r.json()
    assert CATEGORY_ORPHAN in cats
    assert CATEGORY_PUB in cats


# ---------------------- 8) Absolute negative — no seed ever leaks unlisted ----------------------

def test_public_list_never_returns_any_row_with_non_published_status(_seed_all):
    """Belt-and-braces: iterate the entire first public page and assert
    every returned row is `status == "published"`. Guards against a
    future refactor that accidentally reintroduces a deny-list."""
    data = _get_public_page(limit=48)
    for row in data.get("items", []):
        assert row.get("status") == "published", (
            f"SECURITY REGRESSION: /api/products returned row id={row.get('id')} "
            f"with status={row.get('status')!r} to an anonymous caller"
        )
