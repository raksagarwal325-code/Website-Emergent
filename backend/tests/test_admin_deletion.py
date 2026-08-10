"""
Batch B · Item 3 verification: Admin deletion controls for enquiries and
contact messages.

Covers:
  1. Auth on all four endpoints (single + bulk × enquiries + messages)
  2. Happy-path single delete returns 200 with deleted count
  3. 404 for unknown ids
  4. CSRF guard: state-changing calls without X-Requested-With are refused
  5. Bulk delete: partial (some ids miss) still succeeds, reports actual
     deleted_count; deduplication + blank stripping in the payload
  6. Bulk delete cap (>500 ids → 413) and empty payload rejection
  7. Isolation: deleting an enquiry never removes a contact_message, and
     vice-versa

Also verifies the defensive behaviour of GET /api/inquiries and
GET /api/contact — one intentionally-malformed row does not blow up the
whole endpoint; it's silently skipped and the rest are returned.
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


def _seed_inq(prefix: str) -> str:
    """Insert one enquiry row and return its id."""
    inq_id = f"TEST_INQ_{prefix}_{uuid.uuid4().hex[:8]}"
    _run_mongo(f"""
      db.inquiries.insertOne({{
        id:"{inq_id}", customer_name:"del-test", customer_email:"{inq_id}@example.com",
        customer_phone:"+919000000000", message:"seed", items:[], total:0, status:"new",
        created_at:new Date().toISOString()
      }});
    """)
    return inq_id


def _seed_msg(prefix: str) -> str:
    """Insert one contact_message row and return its id."""
    msg_id = f"TEST_MSG_{prefix}_{uuid.uuid4().hex[:8]}"
    _run_mongo(f"""
      db.contact_messages.insertOne({{
        id:"{msg_id}", name:"del-test", email:"{msg_id}@example.com",
        subject:"seed", message:"seed body", enquiry_type:"general",
        created_at:new Date().toISOString()
      }});
    """)
    return msg_id


@pytest.fixture(autouse=True)
def _cleanup_test_rows():
    yield
    _run_mongo(
        'db.inquiries.deleteMany({id:{$regex:"^TEST_INQ_"}});'
        'db.contact_messages.deleteMany({id:{$regex:"^TEST_MSG_"}});'
    )


# ------------------------- Auth (401 / 403 / CSRF) -------------------------

def test_delete_inquiry_requires_auth():
    inq = _seed_inq("auth_single")
    r = requests.delete(
        f"{API}/inquiries/{inq}", headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code in (401, 403), f"got {r.status_code}: {r.text[:200]}"


def test_delete_message_requires_auth():
    msg = _seed_msg("auth_single_msg")
    r = requests.delete(
        f"{API}/contact-messages/{msg}", headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code in (401, 403)


def test_bulk_delete_inquiries_requires_auth():
    r = requests.post(
        f"{API}/admin/inquiries/bulk-delete",
        json={"ids": ["whatever"]},
        headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code in (401, 403)


def test_bulk_delete_messages_requires_auth():
    r = requests.post(
        f"{API}/admin/contact-messages/bulk-delete",
        json={"ids": ["whatever"]},
        headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code in (401, 403)


def test_delete_inquiry_requires_csrf_header():
    inq = _seed_inq("csrf")
    # Cookie present but no X-Requested-With header — must be refused.
    r = requests.delete(f"{API}/inquiries/{inq}", cookies=ADMIN_COOKIES, timeout=15)
    assert r.status_code == 403, f"CSRF guard failed to reject: {r.status_code} {r.text[:200]}"


def test_bulk_delete_messages_requires_csrf_header():
    r = requests.post(
        f"{API}/admin/contact-messages/bulk-delete",
        json={"ids": ["whatever"]},
        cookies=ADMIN_COOKIES, timeout=15,
    )
    assert r.status_code == 403


# ------------------------- Happy path (single) -------------------------

def test_admin_delete_single_inquiry():
    inq = _seed_inq("happy")
    r = requests.delete(
        f"{API}/inquiries/{inq}",
        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
    body = r.json()
    assert body["ok"] is True
    assert body["deleted"] == 1

    # Verify row is gone from GET /api/inquiries
    r2 = requests.get(f"{API}/inquiries", cookies=ADMIN_COOKIES, timeout=15)
    assert r2.status_code == 200
    ids = {row["id"] for row in r2.json()}
    assert inq not in ids


def test_admin_delete_single_message():
    msg = _seed_msg("happy_msg")
    r = requests.delete(
        f"{API}/contact-messages/{msg}",
        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["deleted"] == 1

    r2 = requests.get(f"{API}/contact", cookies=ADMIN_COOKIES, timeout=15)
    assert r2.status_code == 200
    ids = {row["id"] for row in r2.json()}
    assert msg not in ids


# ------------------------- 404 for unknown ids -------------------------

def test_delete_unknown_inquiry_returns_404():
    r = requests.delete(
        f"{API}/inquiries/does-not-exist-{uuid.uuid4().hex}",
        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code == 404


def test_delete_unknown_message_returns_404():
    r = requests.delete(
        f"{API}/contact-messages/does-not-exist-{uuid.uuid4().hex}",
        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code == 404


# ------------------------- Bulk delete (enquiries) -------------------------

def test_bulk_delete_inquiries_happy_and_partial():
    a = _seed_inq("bulk_a")
    b = _seed_inq("bulk_b")
    c = _seed_inq("bulk_c")

    # Include a missing id + a duplicate to prove dedup + partial handling.
    r = requests.post(
        f"{API}/admin/inquiries/bulk-delete",
        json={"ids": [a, b, "missing-id-xyz", a, "  "]},
        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    # After _clean_ids: a, b, missing-id-xyz (3 unique non-blank ids)
    assert body["requested"] == 3
    # Only 2 actually existed → deleted == 2
    assert body["deleted"] == 2

    # c must still be present
    r2 = requests.get(f"{API}/inquiries", cookies=ADMIN_COOKIES, timeout=15)
    ids = {row["id"] for row in r2.json()}
    assert a not in ids
    assert b not in ids
    assert c in ids


def test_bulk_delete_messages_happy():
    a = _seed_msg("bulk_ma")
    b = _seed_msg("bulk_mb")
    r = requests.post(
        f"{API}/admin/contact-messages/bulk-delete",
        json={"ids": [a, b]},
        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["deleted"] == 2


def test_bulk_delete_empty_payload_rejected():
    r = requests.post(
        f"{API}/admin/inquiries/bulk-delete",
        json={"ids": []},
        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code == 400


def test_bulk_delete_all_blank_payload_rejected():
    r = requests.post(
        f"{API}/admin/inquiries/bulk-delete",
        json={"ids": ["", "   ", "\t"]},
        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code == 400


def test_bulk_delete_over_cap_rejected():
    # 501 unique-looking ids → 413 (max 500)
    ids = [f"nope-{i}-{uuid.uuid4().hex[:4]}" for i in range(501)]
    r = requests.post(
        f"{API}/admin/inquiries/bulk-delete",
        json={"ids": ids},
        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code == 413


# ------------------------- Isolation -------------------------

def test_deleting_inquiry_does_not_touch_contact_messages():
    inq = _seed_inq("iso1")
    msg = _seed_msg("iso2")

    r = requests.delete(
        f"{API}/inquiries/{inq}",
        cookies=ADMIN_COOKIES, headers=STATE_CHANGE_HEADERS, timeout=15,
    )
    assert r.status_code == 200

    r2 = requests.get(f"{API}/contact", cookies=ADMIN_COOKIES, timeout=15)
    ids = {row["id"] for row in r2.json()}
    assert msg in ids, "Contact message must not be touched by an enquiry delete"


# ------------------------- Defensive GET endpoints -------------------------

def test_get_inquiries_skips_malformed_row_and_returns_the_rest():
    """A row with a badly-typed field (items as a string instead of a list)
    must NOT 500 the whole endpoint. It's silently skipped."""
    good_id = _seed_inq("defensive_ok")
    bad_id = f"TEST_INQ_bad_{uuid.uuid4().hex[:8]}"
    _run_mongo(f"""
      db.inquiries.insertOne({{
        id:"{bad_id}", customer_name:"bad row",
        customer_email:"not-a-valid-email-format",
        customer_phone:"+919000000000",
        items:"this-should-be-a-list-not-a-string",
        total:0, status:"new",
        created_at:new Date().toISOString()
      }});
    """)
    r = requests.get(f"{API}/inquiries", cookies=ADMIN_COOKIES, timeout=15)
    assert r.status_code == 200, f"defensive endpoint 500'd: {r.status_code} {r.text[:200]}"
    ids = {row["id"] for row in r.json()}
    assert good_id in ids
    assert bad_id not in ids, "malformed row must have been skipped"

    # Cleanup this specific bad row (autouse fixture handles the good one)
    _run_mongo(f'db.inquiries.deleteMany({{id:"{bad_id}"}});')


def test_get_contact_skips_malformed_row_and_returns_the_rest():
    good_id = _seed_msg("defensive_ok_msg")
    bad_id = f"TEST_MSG_bad_{uuid.uuid4().hex[:8]}"
    _run_mongo(f"""
      db.contact_messages.insertOne({{
        id:"{bad_id}", email:"not-a-valid-email",
        message:12345,
        created_at:new Date().toISOString()
      }});
    """)
    r = requests.get(f"{API}/contact", cookies=ADMIN_COOKIES, timeout=15)
    assert r.status_code == 200
    ids = {row["id"] for row in r.json()}
    assert good_id in ids
    assert bad_id not in ids

    _run_mongo(f'db.contact_messages.deleteMany({{id:"{bad_id}"}});')
