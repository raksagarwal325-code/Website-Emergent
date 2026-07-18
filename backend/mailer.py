"""
Transactional email via Resend — admin notifications + customer acknowledgements.

Design rules (per user's agreed spec):
  * Non-blocking. Every helper runs the Resend SDK inside a bounded
    `asyncio.wait_for` (default 8s) so a slow provider cannot back-pressure
    the API request that triggered it.
  * Never fails the caller. Any exception (network, Resend error, timeout,
    missing key, missing address) is logged and the coroutine returns
    `{"ok": False, "reason": ...}` — routes MUST NOT `raise` on failure.
  * Never logs secrets. The API key is only read via `os.environ.get` at
    send-time; it never appears in `str(exc)` because we normalise error
    text before logging.
  * All user-supplied strings (name, subject, message, product names,
    review author/title/body) are HTML-escaped via `html.escape` before
    they enter a template. No f-string interpolation with `safe=True`.
"""
from __future__ import annotations

import asyncio
import html
import logging
import os
from typing import Iterable, Optional

logger = logging.getLogger("mailer")

# Bounded timeout per send. Keep tight — email is best-effort.
_SEND_TIMEOUT_S = 8.0

# Cheap, replace-in-tests hook. Tests monkeypatch this to record calls
# instead of hitting the network. NEVER call resend.Emails.send directly
# from anywhere else in the codebase.
async def _dispatch(params: dict) -> dict:
    """Actual network dispatch. Isolated so tests can monkeypatch it."""
    import resend  # local import so the module loads even if the SDK is missing

    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        raise RuntimeError("resend_not_configured")
    resend.api_key = api_key
    # The SDK is synchronous — run in a worker thread.
    return await asyncio.to_thread(resend.Emails.send, params)


def _redact(err: BaseException) -> str:
    """Return an error string with any accidental key leakage stripped."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    txt = f"{type(err).__name__}: {err}"
    if api_key and api_key in txt:
        txt = txt.replace(api_key, "***REDACTED***")
    return txt[:400]


async def send_email(
    *,
    to: str | Iterable[str],
    subject: str,
    html_body: str,
    reply_to: Optional[str] = None,
    tag: str = "generic",
) -> dict:
    """Send a single transactional email. Always returns — never raises."""
    if not to:
        return {"ok": False, "reason": "no_recipient"}
    recipients = [to] if isinstance(to, str) else list(to)
    if not recipients:
        return {"ok": False, "reason": "no_recipient"}

    sender = os.environ.get(
        "RESEND_FROM",
        "Samrat Glass Website <notifications@mail.samratglass.com>",
    )
    params = {
        "from": sender,
        "to": recipients,
        "subject": subject[:200],
        "html": html_body,
    }
    if reply_to:
        params["reply_to"] = reply_to

    try:
        result = await asyncio.wait_for(_dispatch(params), timeout=_SEND_TIMEOUT_S)
        # Resend returns {"id": "..."} on success.
        return {"ok": True, "id": (result or {}).get("id"), "tag": tag}
    except asyncio.TimeoutError:
        logger.warning("mailer.timeout tag=%s to_count=%d", tag, len(recipients))
        return {"ok": False, "reason": "timeout", "tag": tag}
    except Exception as e:  # noqa: BLE001 — email must never bubble
        logger.warning("mailer.error tag=%s err=%s", tag, _redact(e))
        return {"ok": False, "reason": "error", "tag": tag}


# ---------- Small templating helpers -----------------------------------
def _wrap(inner_html: str) -> str:
    return (
        "<!doctype html><html><body style=\"margin:0;padding:24px;"
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,"
        "'Helvetica Neue',Arial,sans-serif;background:#faf7f2;color:#2b1a12\">"
        "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" "
        "style=\"max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee\">"
        "<tr><td style=\"padding:20px 24px;background:#2A1125;color:#F5F0E3;"
        "font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:2px;"
        "text-transform:uppercase\">Samrat Glass Emporium</td></tr>"
        f"<tr><td style=\"padding:24px\">{inner_html}</td></tr>"
        "<tr><td style=\"padding:16px 24px;font-size:11px;color:#8a7a70;"
        "border-top:1px solid #eee\">You are receiving this because a form on "
        "samratglass.com was submitted. This is a transactional notification "
        "— no marketing.</td></tr></table></body></html>"
    )


def _kv_rows(items: list[tuple[str, str]]) -> str:
    """Render key/value rows with every value HTML-escaped."""
    rows = []
    for k, v in items:
        rows.append(
            "<tr>"
            f"<td style=\"padding:6px 12px 6px 0;font-size:12px;color:#8a7a70;"
            f"text-transform:uppercase;letter-spacing:1.5px;vertical-align:top;"
            f"white-space:nowrap\">{html.escape(k)}</td>"
            f"<td style=\"padding:6px 0;font-size:14px;color:#2b1a12\">"
            f"{html.escape(v or '')}</td>"
            "</tr>"
        )
    return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\">" + "".join(rows) + "</table>"


# ---------- Public helpers, one per event ------------------------------
def _admin_email() -> str:
    return os.environ.get("ADMIN_NOTIFICATION_EMAIL", "samratglassemp@gmail.com")


async def notify_admin_contact(msg: dict) -> dict:
    """Admin ping on new /api/contact submission."""
    inner = (
        "<h2 style=\"font-family:Georgia,serif;font-size:20px;margin:0 0 12px\">"
        "New contact message</h2>"
        + _kv_rows([
            ("From", msg.get("name") or "—"),
            ("Email", msg.get("email") or "—"),
            ("Enquiry type", (msg.get("enquiry_type") or "general").title()),
            ("Subject", msg.get("subject") or "—"),
        ])
        + "<div style=\"margin:16px 0;padding:12px 14px;background:#faf7f2;"
        + "border-left:3px solid #D4AF37;white-space:pre-wrap;font-size:14px\">"
        + html.escape(msg.get("message") or "") + "</div>"
    )
    return await send_email(
        to=_admin_email(),
        subject=f"[Samrat Glass] Contact · {msg.get('name') or 'Anonymous'}",
        html_body=_wrap(inner),
        reply_to=msg.get("email") if msg.get("email") else None,
        tag="admin_contact",
    )


async def ack_customer_contact(msg: dict) -> dict:
    """Auto-reply to the customer confirming we received their contact form."""
    if not msg.get("email"):
        return {"ok": False, "reason": "no_recipient"}
    inner = (
        f"<p style=\"font-size:15px;line-height:1.6\">Namaste "
        f"{html.escape(msg.get('name') or 'there')},</p>"
        "<p style=\"font-size:15px;line-height:1.6\">Thank you for reaching out to "
        "Samrat Glass Emporium. We've received your message and a member of our "
        "team will personally respond within 1 business day.</p>"
        "<p style=\"font-size:15px;line-height:1.6;color:#5a4a40\">For anything urgent, "
        "reach us on WhatsApp at +91 98920 39293.</p>"
        "<p style=\"font-size:13px;color:#8a7a70;margin-top:24px\">— Samrat Glass Emporium, Firozabad</p>"
    )
    return await send_email(
        to=msg["email"],
        subject="We've received your message — Samrat Glass Emporium",
        html_body=_wrap(inner),
        tag="ack_contact",
    )


async def notify_admin_inquiry(inq: dict) -> dict:
    """Admin ping on new /api/inquiries basket submission."""
    items = inq.get("items") or []
    rows = "".join(
        "<tr>"
        f"<td style=\"padding:6px 0;font-size:13px\">{html.escape(str(i.get('name') or '—'))}</td>"
        f"<td style=\"padding:6px 12px;font-size:13px;color:#8a7a70\">{html.escape(str(i.get('sku') or ''))}</td>"
        f"<td style=\"padding:6px 0;font-size:13px;text-align:right\">× {int(i.get('quantity') or 1)}</td>"
        "</tr>"
        for i in items[:50]
    )
    total = inq.get("total")
    total_line = f"₹ {total:,.0f}".replace(",", ",") if isinstance(total, (int, float)) and total > 0 else "Price on request"
    inner = (
        "<h2 style=\"font-family:Georgia,serif;font-size:20px;margin:0 0 12px\">"
        "New inquiry basket</h2>"
        + _kv_rows([
            ("From", inq.get("customer_name") or "—"),
            ("Email", inq.get("customer_email") or "—"),
            ("Phone", inq.get("customer_phone") or "—"),
        ])
        + "<h3 style=\"font-family:Georgia,serif;font-size:15px;margin:20px 0 6px\">"
        + f"Items ({len(items)})</h3>"
        + "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" "
        + "style=\"border-collapse:collapse\">"
        + rows
        + "</table>"
        + "<div style=\"margin-top:16px;font-size:14px\"><b>Server-calculated total:</b> "
        + html.escape(total_line) + "</div>"
        + (
            f"<div style=\"margin:16px 0;padding:12px 14px;background:#faf7f2;"
            f"border-left:3px solid #D4AF37;white-space:pre-wrap;font-size:14px\">"
            f"{html.escape(inq.get('message') or '')}</div>"
            if inq.get("message") else ""
        )
    )
    return await send_email(
        to=_admin_email(),
        subject=f"[Samrat Glass] Inquiry · {inq.get('customer_name') or 'Anonymous'} · {len(items)} item(s)",
        html_body=_wrap(inner),
        reply_to=inq.get("customer_email") if inq.get("customer_email") else None,
        tag="admin_inquiry",
    )


async def ack_customer_inquiry(inq: dict) -> dict:
    """Auto-reply to the customer for /api/inquiries submissions."""
    if not inq.get("customer_email"):
        return {"ok": False, "reason": "no_recipient"}
    n_items = len(inq.get("items") or [])
    inner = (
        f"<p style=\"font-size:15px;line-height:1.6\">Namaste "
        f"{html.escape(inq.get('customer_name') or 'there')},</p>"
        f"<p style=\"font-size:15px;line-height:1.6\">Thank you for sharing your "
        f"inquiry with Samrat Glass Emporium. We've received your basket of "
        f"<b>{n_items}</b> item{'s' if n_items != 1 else ''} and our team will "
        f"prepare a personalised quotation. Expect a reply within 1 business day.</p>"
        "<p style=\"font-size:15px;line-height:1.6;color:#5a4a40\">For anything urgent, "
        "reach us on WhatsApp at +91 98920 39293.</p>"
        "<p style=\"font-size:13px;color:#8a7a70;margin-top:24px\">— Samrat Glass Emporium, Firozabad</p>"
    )
    return await send_email(
        to=inq["customer_email"],
        subject="We've received your inquiry — Samrat Glass Emporium",
        html_body=_wrap(inner),
        tag="ack_inquiry",
    )


async def notify_admin_pending_review(review: dict) -> dict:
    """Admin ping when a customer submits a review (which sits in 'pending')."""
    inner = (
        "<h2 style=\"font-family:Georgia,serif;font-size:20px;margin:0 0 12px\">"
        "New pending review</h2>"
        + _kv_rows([
            ("Author", review.get("author") or "—"),
            ("Product", review.get("product_name") or review.get("product_id") or "—"),
            ("Rating", f"{review.get('rating', '—')}/5"),
            ("Title", review.get("title") or "—"),
        ])
        + "<div style=\"margin:16px 0;padding:12px 14px;background:#faf7f2;"
        + "border-left:3px solid #D4AF37;white-space:pre-wrap;font-size:14px\">"
        + html.escape(review.get("body") or "") + "</div>"
        + "<p style=\"font-size:13px;color:#8a7a70\">Approve or reject in the admin dashboard.</p>"
    )
    return await send_email(
        to=_admin_email(),
        subject=f"[Samrat Glass] Pending review · {(review.get('rating') or '?')}/5",
        html_body=_wrap(inner),
        tag="admin_pending_review",
    )
