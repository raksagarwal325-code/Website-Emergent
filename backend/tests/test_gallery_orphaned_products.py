"""
Regression tests for the "orphaned linked product" bug.

Bug summary: a gallery project's `products` array kept dangling product ids
after the referenced catalogue products were deleted, so the admin UI
counter kept showing them as "linked" even though they were no longer
resolvable. Fix (see `_sweep_product_from_gallery_projects` and
`/api/admin/gallery/cleanup-orphans` in backend/server.py):
  1. Deleting a catalogue product now removes its id from every
     `settings.homepage_content.gallery.items[*].products` array.
  2. A one-shot cleanup endpoint scans and prunes any lingering orphans
     from previous deletes.

These tests never touch production. They:
  * snapshot the current `settings` document at module setup;
  * install a controlled `homepage_content.gallery.items` with test
    projects that reference a mix of soon-to-be-deleted and existing
    catalogue rows;
  * seed disposable catalogue products with `TEST_` id prefixes so we
    can safely delete them mid-test without touching production rows;
  * restore the original `settings` document at teardown.
"""

import os
import subprocess
import uuid
import copy
import json
import requests
import pytest
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_COOKIES = {"session_token": "test_admin_session"}
STATE_CHANGE_HEADERS = {"X-Requested-With": "fetch"}

RUN = uuid.uuid4().hex[:8]


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


def _seed_test_product(suffix: str) -> str:
    pid = f"TEST_ORPHAN_{RUN}_{suffix}"
    _run_mongo(f"""
      db.products.insertOne({{
        id:"{pid}", name:"Orphan Test Product {suffix} {RUN}",
        sku:"TEST-ORPH-{RUN}-{suffix}",
        description:"regression product — safe to delete",
        short_description:"regression",
        category:"Chandelier",
        price:1000, currency:"INR", stock:1,
        status:"published", rating:0, review_count:0, featured:false,
        images:[], tags:[],
        created_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      }});
    """)
    return pid


def _set_gallery_items(items):
    """Overwrite `settings.homepage_content.gallery.items` atomically."""
    payload = json.dumps(items)
    _run_mongo(
        'db.settings.updateOne({id:"settings"},'
        f'{{"$set": {{"homepage_content.gallery.items": {payload}}}}},'
        '{upsert:true});'
    )


def _get_gallery_items():
    r = requests.get(f"{API}/settings", timeout=10)
    assert r.status_code == 200
    return (
        (r.json().get("homepage_content") or {})
        .get("gallery", {})
        .get("items", [])
    )


@pytest.fixture(scope="module", autouse=True)
def _snapshot_settings():
    """Snapshot the entire `settings` doc, run the tests, restore it.
    Product rows we seeded (all prefixed with `TEST_ORPHAN_<run>_`) get
    force-deleted at teardown too."""
    r = _run_mongo('printjson(db.settings.findOne({id:"settings"}));')
    original_doc_json = r.stdout.decode("utf-8", errors="ignore")
    yield
    # Restore the settings document. We do it by dropping and re-inserting
    # from the JSON we captured — belt-and-braces so even a partial write
    # can't corrupt the live gallery items on the preview DB.
    # Using file redirection because the JSON is large and CLI-quoting is
    # fragile at this size.
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write("db.settings.deleteOne({id:'settings'});\n")
        f.write("db.settings.insertOne(")
        # mongosh's printjson output is valid JS object literal (BSON-ish);
        # we can feed it back through eval.
        f.write(original_doc_json.strip())
        f.write(");\n")
        script_path = f.name
    subprocess.run(
        ["mongosh", f"{_mongo()[0]}/{_mongo()[1]}", "--quiet", script_path],
        check=False, capture_output=True, timeout=20,
    )
    os.unlink(script_path)
    # And delete our test product rows.
    _run_mongo(f'db.products.deleteMany({{id:{{$regex:"^TEST_ORPHAN_{RUN}_"}}}});')


# ---------------------------------------------------------------------------
# Cleanup endpoint auth
# ---------------------------------------------------------------------------

def test_cleanup_endpoint_requires_auth():
    r = requests.post(f"{API}/admin/gallery/cleanup-orphans",
                      json={}, headers=STATE_CHANGE_HEADERS, timeout=10)
    assert r.status_code in (401, 403)


def test_cleanup_endpoint_requires_csrf_header():
    r = requests.post(f"{API}/admin/gallery/cleanup-orphans",
                      json={}, cookies=ADMIN_COOKIES, timeout=10)
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Reported bug — a single project shows "2 linked" when only 1 resolves
# ---------------------------------------------------------------------------

def test_cleanup_removes_only_orphaned_ids_from_the_specific_project():
    valid_id = _seed_test_product("A")
    orphan_id = f"TEST_ORPHAN_deleted_{RUN}_never_existed"

    _set_gallery_items([
        {
            "title": f"Regression fixture project {RUN}",
            "location": "test",
            "note": "seed",
            "images": [],
            "products": [orphan_id, valid_id],
        },
    ])

    r = requests.post(f"{API}/admin/gallery/cleanup-orphans", json={},
                      cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS,
                      timeout=10)
    assert r.status_code == 200, r.text
    report = r.json()
    assert report["orphans_removed_total"] == 1
    assert len(report["projects"]) == 1
    p = report["projects"][0]
    assert p["raw_count"] == 2
    assert p["valid_count"] == 1
    assert p["orphans_removed"] == 1
    assert p["orphan_ids"] == [orphan_id]

    # Verify the settings row was actually updated.
    items = _get_gallery_items()
    assert len(items) == 1
    assert items[0]["products"] == [valid_id], (
        "cleanup must preserve the valid id and remove only the orphan"
    )


# ---------------------------------------------------------------------------
# Deleting a catalogue product sweeps it out of gallery references
# ---------------------------------------------------------------------------

def test_deleting_linked_product_sweeps_it_from_all_projects():
    keep_id_a = _seed_test_product("keepA")
    keep_id_b = _seed_test_product("keepB")
    doomed_id = _seed_test_product("doomed")

    _set_gallery_items([
        {"title": f"Proj-1 {RUN}", "location": "", "note": "", "images": [],
         "products": [doomed_id, keep_id_a]},
        {"title": f"Proj-2 {RUN}", "location": "", "note": "", "images": [],
         "products": [keep_id_b]},
        {"title": f"Proj-3 {RUN}", "location": "", "note": "", "images": [],
         "products": [doomed_id, keep_id_b, doomed_id]},  # duplicate id case
    ])

    # Delete the product — should trigger sweep as a side effect.
    r = requests.delete(f"{API}/products/{doomed_id}",
                        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS,
                        timeout=10)
    assert r.status_code == 200, r.text

    items = _get_gallery_items()
    # Proj-1: doomed gone, keepA stays.
    assert items[0]["products"] == [keep_id_a]
    # Proj-2: unchanged.
    assert items[1]["products"] == [keep_id_b]
    # Proj-3: both doomed references removed, keepB stays.
    assert items[2]["products"] == [keep_id_b]


def test_deleting_a_product_never_touches_projects_that_dont_reference_it():
    a_id = _seed_test_product("uninvolvedA")
    b_id = _seed_test_product("uninvolvedB")
    to_delete = _seed_test_product("delete_me")

    _set_gallery_items([
        {"title": "unrelated project", "location": "", "note": "", "images": [],
         "products": [a_id, b_id]},
    ])

    r = requests.delete(f"{API}/products/{to_delete}",
                        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS,
                        timeout=10)
    assert r.status_code == 200

    items = _get_gallery_items()
    assert items[0]["products"] == [a_id, b_id], (
        "an unrelated project must not be modified when a product it "
        "does not link is deleted"
    )


# ---------------------------------------------------------------------------
# Idempotence
# ---------------------------------------------------------------------------

def test_cleanup_is_idempotent_when_nothing_to_remove():
    p1 = _seed_test_product("idem1")
    p2 = _seed_test_product("idem2")
    _set_gallery_items([
        {"title": "clean project", "location": "", "note": "", "images": [],
         "products": [p1, p2]},
    ])

    # Run cleanup once (clean start).
    r1 = requests.post(f"{API}/admin/gallery/cleanup-orphans", json={},
                       cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS,
                       timeout=10)
    assert r1.status_code == 200
    assert r1.json()["orphans_removed_total"] == 0

    # Run it again — must still report 0 and not touch the project.
    r2 = requests.post(f"{API}/admin/gallery/cleanup-orphans", json={},
                       cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS,
                       timeout=10)
    assert r2.status_code == 200
    assert r2.json()["orphans_removed_total"] == 0

    items = _get_gallery_items()
    assert items[0]["products"] == [p1, p2]


# ---------------------------------------------------------------------------
# Multi-project + multi-orphan scan/report
# ---------------------------------------------------------------------------

def test_cleanup_reports_per_project_orphan_counts():
    ok = _seed_test_product("mixOK")
    _set_gallery_items([
        {"title": "P1 no orphan", "location": "", "note": "", "images": [],
         "products": [ok]},
        {"title": "P2 two orphans", "location": "", "note": "", "images": [],
         "products": [f"orphan-A-{RUN}", f"orphan-B-{RUN}", ok]},
        {"title": "P3 all orphans", "location": "", "note": "", "images": [],
         "products": [f"orphan-C-{RUN}", f"orphan-D-{RUN}"]},
    ])

    r = requests.post(f"{API}/admin/gallery/cleanup-orphans", json={},
                      cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS,
                      timeout=10)
    assert r.status_code == 200
    report = r.json()
    assert report["orphans_removed_total"] == 4
    per_project = {p["project_title"]: p for p in report["projects"]}
    assert per_project["P1 no orphan"]["orphans_removed"] == 0
    assert per_project["P2 two orphans"]["orphans_removed"] == 2
    assert per_project["P3 all orphans"]["orphans_removed"] == 2

    items = _get_gallery_items()
    assert items[0]["products"] == [ok]
    assert items[1]["products"] == [ok]
    assert items[2]["products"] == []


# ---------------------------------------------------------------------------
# Handles missing gallery gracefully
# ---------------------------------------------------------------------------

def test_cleanup_with_no_gallery_items_returns_zero():
    _set_gallery_items([])
    r = requests.post(f"{API}/admin/gallery/cleanup-orphans", json={},
                      cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS,
                      timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body["orphans_removed_total"] == 0
    assert body["projects"] == []
