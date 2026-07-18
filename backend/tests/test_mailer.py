"""
Mailer integration tests.

Contract validated:
  * POST /contact  → 200 AND admin-notify + customer-ack calls dispatched
  * POST /inquiries → 200 AND admin-notify + customer-ack calls dispatched
  * POST /reviews  → 200 AND admin-notify(pending) dispatched
  * Persisted submissions succeed EVEN IF Resend blows up (timeout / 500)
  * No PII / API key ever appears in the module-level log payload
  * All user-supplied strings are HTML-escaped in the email body

NOTE: these tests hit the running backend over HTTP and use a signal-based
"replace the mailer dispatch" trick — impossible over HTTP. So instead we
monkeypatch mailer._dispatch IN-PROCESS by importing the backend module
directly, and drive the code paths via the FastAPI TestClient (in-process).
This means no real network calls, no real Resend traffic, and full ability
to assert on what would have been sent.
"""
import asyncio
import html
import os
import sys
from unittest.mock import patch

import pytest

sys.path.insert(0, "/app/backend")
os.environ.setdefault("RESEND_API_KEY", "re_test_dummy_key")

# Import the backend module in-process so we can monkeypatch mailer._dispatch.
import mailer  # noqa: E402


# --------------------------------------------------------------------------
# Test infrastructure: a recorder that stands in for the Resend SDK.
# --------------------------------------------------------------------------
class DispatchRecorder:
    def __init__(self, fail=False, timeout=False):
        self.calls: list[dict] = []
        self.fail = fail
        self.timeout = timeout

    async def __call__(self, params):
        self.calls.append(params)
        if self.timeout:
            await asyncio.sleep(30)  # will trip mailer's 8s cap
        if self.fail:
            raise RuntimeError("resend blew up")
        return {"id": "test-email-id-" + str(len(self.calls))}


# --------------------------------------------------------------------------
# 1) Mailer unit tests — no HTTP, just the helpers.
# --------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_email_env_override(monkeypatch):
    monkeypatch.setenv("ADMIN_NOTIFICATION_EMAIL", "override@example.com")
    rec = DispatchRecorder()
    monkeypatch.setattr(mailer, "_dispatch", rec)
    r = await mailer.notify_admin_contact({
        "name": "Alice", "email": "alice@example.com",
        "enquiry_type": "bulk", "subject": "S", "message": "M",
    })
    assert r["ok"] is True
    assert rec.calls[0]["to"] == ["override@example.com"]


@pytest.mark.asyncio
async def test_admin_email_default_recipient(monkeypatch):
    monkeypatch.delenv("ADMIN_NOTIFICATION_EMAIL", raising=False)
    rec = DispatchRecorder()
    monkeypatch.setattr(mailer, "_dispatch", rec)
    await mailer.notify_admin_contact({"name": "n", "email": "e@e.com", "message": "m"})
    assert rec.calls[0]["to"] == ["samratglassemp@gmail.com"]


@pytest.mark.asyncio
async def test_html_escaping_admin_contact(monkeypatch):
    rec = DispatchRecorder()
    monkeypatch.setattr(mailer, "_dispatch", rec)
    hostile = "<script>alert(1)</script>&\"'"
    await mailer.notify_admin_contact({
        "name": hostile, "email": "e@e.com",
        "subject": hostile, "message": hostile, "enquiry_type": "general",
    })
    body = rec.calls[0]["html"]
    # Raw payload must never appear un-escaped
    assert "<script>alert(1)</script>" not in body
    # Escaped equivalent must be present
    assert html.escape(hostile) in body


@pytest.mark.asyncio
async def test_html_escaping_admin_inquiry_items(monkeypatch):
    rec = DispatchRecorder()
    monkeypatch.setattr(mailer, "_dispatch", rec)
    await mailer.notify_admin_inquiry({
        "customer_name": "<x>", "customer_email": "e@e.com", "customer_phone": "",
        "message": "<xss>", "total": 1500,
        "items": [{"name": "<img src=x>", "sku": "S-1", "quantity": 2}],
    })
    body = rec.calls[0]["html"]
    assert "<img src=x>" not in body
    assert "&lt;img src=x&gt;" in body
    assert "<xss>" not in body


@pytest.mark.asyncio
async def test_mailer_never_raises_on_dispatch_error(monkeypatch):
    monkeypatch.setattr(mailer, "_dispatch", DispatchRecorder(fail=True))
    # Every helper must return {"ok": False, ...} not raise.
    for fn, arg in [
        (mailer.notify_admin_contact, {"name": "n", "email": "e@e.com", "message": "m"}),
        (mailer.ack_customer_contact, {"name": "n", "email": "e@e.com", "message": "m"}),
        (mailer.notify_admin_inquiry, {"customer_name": "n", "customer_email": "e@e.com", "items": [], "total": 0}),
        (mailer.ack_customer_inquiry, {"customer_name": "n", "customer_email": "e@e.com", "items": [], "total": 0}),
        (mailer.notify_admin_pending_review, {"author": "a", "rating": 5, "title": "t", "body": "b", "product_id": "p"}),
    ]:
        r = await fn(arg)
        assert r["ok"] is False
        assert r["reason"] == "error"


@pytest.mark.asyncio
async def test_mailer_never_raises_on_timeout(monkeypatch):
    monkeypatch.setattr(mailer, "_dispatch", DispatchRecorder(timeout=True))
    monkeypatch.setattr(mailer, "_SEND_TIMEOUT_S", 0.05)
    r = await mailer.notify_admin_contact({"name": "n", "email": "e@e.com", "message": "m"})
    assert r["ok"] is False and r["reason"] == "timeout"


@pytest.mark.asyncio
async def test_mailer_never_raises_when_api_key_missing(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    # Fresh import path: send_email uses a live import of resend inside _dispatch,
    # which will raise RuntimeError("resend_not_configured") → helper catches it.
    r = await mailer.notify_admin_contact({"name": "n", "email": "e@e.com", "message": "m"})
    assert r["ok"] is False
    assert r["reason"] == "error"


@pytest.mark.asyncio
async def test_api_key_never_appears_in_logged_error(monkeypatch, caplog):
    secret = "re_TEST_SECRET_1234567890abcdef"
    monkeypatch.setenv("RESEND_API_KEY", secret)

    async def _leaky(_params):
        # Simulate an SDK exception whose text includes the API key.
        raise RuntimeError(f"HTTP 401: invalid key {secret}")

    monkeypatch.setattr(mailer, "_dispatch", _leaky)
    with caplog.at_level("WARNING", logger="mailer"):
        await mailer.notify_admin_contact({"name": "n", "email": "e@e.com", "message": "m"})
    for rec in caplog.records:
        assert secret not in rec.getMessage(), "API key leaked to log output"


@pytest.mark.asyncio
async def test_customer_ack_skipped_when_no_email(monkeypatch):
    rec = DispatchRecorder()
    monkeypatch.setattr(mailer, "_dispatch", rec)
    r = await mailer.ack_customer_contact({"name": "n", "email": ""})
    assert r["ok"] is False and r["reason"] == "no_recipient"
    assert rec.calls == []


@pytest.mark.asyncio
async def test_reply_to_uses_customer_email(monkeypatch):
    rec = DispatchRecorder()
    monkeypatch.setattr(mailer, "_dispatch", rec)
    await mailer.notify_admin_contact({
        "name": "N", "email": "customer@example.com", "message": "M", "enquiry_type": "general",
    })
    assert rec.calls[0]["reply_to"] == "customer@example.com"


@pytest.mark.asyncio
async def test_ack_inquiry_summarises_item_count_without_pii(monkeypatch):
    rec = DispatchRecorder()
    monkeypatch.setattr(mailer, "_dispatch", rec)
    await mailer.ack_customer_inquiry({
        "customer_name": "Alice", "customer_email": "alice@example.com",
        "customer_phone": "+919999999999",
        "items": [
            {"product_id": "p1", "name": "Item A", "quantity": 1},
            {"product_id": "p2", "name": "Item B", "quantity": 2},
        ],
    })
    body = rec.calls[0]["html"]
    assert "2</b> item" in body  # summary present
    # Phone must never appear in the acknowledgement body.
    assert "+919999999999" not in body


# --------------------------------------------------------------------------
# 2) End-to-end wiring — TestClient hits the actual FastAPI routes and we
# verify a persisted submission + dispatched emails, all without ever
# opening a network socket to Resend.
# --------------------------------------------------------------------------

@pytest.fixture(scope="module")
def app_client():
    # Import + start a single TestClient for the whole module. Repeated
    # TestClient(app) calls run startup/shutdown each time, which closes
    # the motor pool. Using a shared client keeps db.products / db.reviews
    # etc. alive across tests.
    from fastapi.testclient import TestClient
    import server
    with TestClient(server.app) as client:
        yield server, client


def _drain_tasks(loop_factory=None):
    """asyncio.create_task tasks scheduled by the endpoint run on the same
    loop that served the request. TestClient uses anyio internally — by the
    time the response returns, the loop has been closed. We schedule the
    dispatched coroutines directly onto a *new* loop in the tests below
    (via a patched create_task shim) so we can await them deterministically.
    """


@pytest.fixture
def captured_dispatch(monkeypatch):
    """Patch mailer._dispatch AND asyncio.create_task within the server
    module so that fire-and-forget tasks are collected + awaited during the
    test, rather than lost when TestClient closes the loop."""
    rec = DispatchRecorder()
    monkeypatch.setattr(mailer, "_dispatch", rec)

    scheduled: list = []
    import server as _srv
    original_create_task = asyncio.create_task

    def collecting_create_task(coro, *args, **kwargs):
        # Instead of scheduling on the (about-to-close) TestClient loop,
        # record the coroutine so the test can await it explicitly.
        scheduled.append(coro)
        # Return a completed dummy Task so the endpoint code path is happy.
        async def _noop():
            return None
        return original_create_task(_noop())

    monkeypatch.setattr(_srv.asyncio, "create_task", collecting_create_task)
    return rec, scheduled


async def _await_scheduled(scheduled):
    for coro in scheduled:
        try:
            await coro
        except Exception:
            pass


@pytest.fixture(scope="module")
def real_published_product():
    """Pick any real published product from the running DB. Falls back to
    seeding a temporary product if the DB is empty."""
    import subprocess
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
    mongo_url, db_name = _mongo()
    out = subprocess.run(
        ["mongosh", f"{mongo_url}/{db_name}", "--quiet", "--eval",
         "let p = db.products.findOne({status:'published'}); print(p ? p.id : '');"],
        capture_output=True, text=True, timeout=15,
    )
    pid = out.stdout.strip().splitlines()[-1] if out.stdout.strip() else ""
    if not pid:
        # Seed a temp fixture product.
        pid = "test-mail-fixture-product"
        subprocess.run(
            ["mongosh", f"{mongo_url}/{db_name}", "--quiet", "--eval",
             f'db.products.insertOne({{id:"{pid}", name:"Fixture Chandelier",'
             f' sku:"FIX-1", category:"chandeliers", price:2500, status:"published",'
             f' images:[], created_at:new Date().toISOString(), updated_at:new Date().toISOString()}});'],
            check=False, capture_output=True, timeout=15,
        )
    yield pid


def test_contact_submission_dispatches_admin_and_ack(app_client, captured_dispatch):
    server, client = app_client
    rec, scheduled = captured_dispatch
    r = client.post("/api/contact", json={
        "name": "TEST_MAIL_CONTACT",
        "email": "test-mail-contact@example.com",
        "subject": "Hello",
        "message": "Please quote me a chandelier.",
        "enquiry_type": "bulk",
    }, headers={"X-Requested-With": "fetch"})
    assert r.status_code == 200, r.text
    assert len(scheduled) == 2, f"expected admin + ack tasks, got {len(scheduled)}"
    asyncio.get_event_loop_policy().new_event_loop().run_until_complete(_await_scheduled(scheduled))
    subjects = [c["subject"] for c in rec.calls]
    recipients = [c["to"] for c in rec.calls]
    assert any("Contact" in s for s in subjects), subjects
    assert any(["samratglassemp@gmail.com"] == r for r in recipients), recipients
    assert any(["test-mail-contact@example.com"] == r for r in recipients), recipients


def test_contact_submission_persists_even_if_email_fails(app_client, monkeypatch):
    server, client = app_client
    monkeypatch.setattr(mailer, "_dispatch", DispatchRecorder(fail=True))
    # Contact still returns 200 and DB write happens even when mailer blows up.
    r = client.post("/api/contact", json={
        "name": "TEST_MAIL_FAIL",
        "email": "test-mail-fail@example.com",
        "message": "Please quote.",
        "enquiry_type": "general",
    }, headers={"X-Requested-With": "fetch"})
    assert r.status_code == 200
    assert r.json()["name"] == "TEST_MAIL_FAIL"


def test_inquiry_submission_dispatches_admin_and_ack(app_client, captured_dispatch, real_published_product):
    server, client = app_client
    rec, scheduled = captured_dispatch

    r = client.post("/api/inquiries", json={
        "customer_name": "TEST_MAIL_INQ",
        "customer_email": "test-mail-inq@example.com",
        "customer_phone": "+919999999999",
        "message": "please quote",
        "items": [{"product_id": real_published_product, "quantity": 1}],
    }, headers={"X-Requested-With": "fetch"})
    assert r.status_code == 200, r.text
    assert len(scheduled) == 2, f"expected admin + ack tasks, got {len(scheduled)}"
    asyncio.get_event_loop_policy().new_event_loop().run_until_complete(_await_scheduled(scheduled))
    subjects = [c["subject"] for c in rec.calls]
    assert any("Inquiry" in s for s in subjects), subjects


def test_review_submission_dispatches_admin_notify(app_client, captured_dispatch, real_published_product):
    server, client = app_client
    rec, scheduled = captured_dispatch

    r = client.post("/api/reviews", json={
        "product_id": real_published_product,
        "author": "TEST_MAIL_REVIEWER",
        "rating": 5,
        "title": "Wonderful",
        "body": "Absolutely stunning craftsmanship — my hall looks amazing.",
    }, headers={"X-Requested-With": "fetch"})
    assert r.status_code == 200, r.text
    # Review flow only pings admin (per spec: no auto-reply for reviews).
    assert len(scheduled) == 1, f"expected exactly 1 admin task, got {len(scheduled)}"
    asyncio.get_event_loop_policy().new_event_loop().run_until_complete(_await_scheduled(scheduled))
    assert any("Pending review" in c["subject"] for c in rec.calls)
    assert rec.calls[0]["to"] == ["samratglassemp@gmail.com"]
