"""Emergent Google Auth wiring + admin-only dependency.

Cookie-based sessions (HttpOnly, Secure, SameSite=None), backed by MongoDB
`user_sessions`. Admin access is gated by an exact-match allowlist in the
`ADMIN_EMAILS` env var (comma-separated). Domain-wide matching is
deliberately not supported — every allowed address must be listed verbatim.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import Cookie, Depends, HTTPException, Request, Response

# Configuration -------------------------------------------------------------
_EMERGENT_AUTH_BASE = "https://demobackend.emergentagent.com"
_SESSION_TTL = timedelta(days=7)
_COOKIE_NAME = "session_token"


def admin_emails() -> set[str]:
    raw = os.environ.get("ADMIN_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


# --------------------------------------------------------------------------
# Session helpers — the caller passes in the Motor `db` handle so we don't
# create a circular import against server.py.
# --------------------------------------------------------------------------


async def exchange_session_id(db, session_id: str) -> dict:
    """Trade a one-time Emergent session_id for a user + a fresh session_token.
    Returns {user_id, email, name, picture, session_token, expires_at}."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"{_EMERGENT_AUTH_BASE}/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired login")
    payload = r.json()
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Invalid login response")
    if email not in admin_emails():
        # 403 — authenticated but not allowlisted.
        raise HTTPException(status_code=403, detail="This Google account is not authorised for this admin area.")

    # Upsert user (own uuid; never expose Mongo _id).
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": payload.get("name"), "picture": payload.get("picture"),
                      "last_login": datetime.now(timezone.utc).isoformat()}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": payload.get("name"),
            "picture": payload.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = payload.get("session_token") or uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + _SESSION_TTL
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "email": email,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "user_id": user_id,
        "email": email,
        "name": payload.get("name"),
        "picture": payload.get("picture"),
        "session_token": session_token,
        "expires_at": expires_at,
    }


def set_session_cookie(response: Response, session_token: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=session_token,
        max_age=int(_SESSION_TTL.total_seconds()),
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(_COOKIE_NAME, path="/")


async def load_admin(db, request: Request) -> Optional[dict]:
    """Resolve the current session → admin user, or None if invalid.
    Enforces expiry and re-checks the ADMIN_EMAILS allowlist on every
    request so removing an email revokes access instantly.
    """
    token = request.cookies.get(_COOKIE_NAME)
    if not token:
        # Also accept `Authorization: Bearer <token>` as a fallback for
        # server-to-server or test calls (never exposed to browser JS).
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    if not token:
        return None
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    exp_raw = sess.get("expires_at")
    if isinstance(exp_raw, str):
        exp_raw = datetime.fromisoformat(exp_raw)
    if exp_raw and exp_raw.tzinfo is None:
        exp_raw = exp_raw.replace(tzinfo=timezone.utc)
    if not exp_raw or exp_raw < datetime.now(timezone.utc):
        return None
    email = (sess.get("email") or "").lower()
    if email not in admin_emails():
        return None
    return {"user_id": sess["user_id"], "email": email}


# --------------------------------------------------------------------------
# CSRF — with SameSite=None cookies we require any state-changing request to
# also send an `X-Requested-With: fetch` header. Browsers block cross-origin
# requests carrying custom headers unless the target sets a matching CORS
# Access-Control-Allow-Headers, which we tightly restrict to our own origin
# in server.py. Combined this is a low-overhead CSRF mitigation.
# --------------------------------------------------------------------------

_UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_CSRF_HEADER = "x-requested-with"
_CSRF_VALUE = "fetch"


def require_csrf(request: Request) -> None:
    if request.method not in _UNSAFE_METHODS:
        return
    val = (request.headers.get(_CSRF_HEADER) or "").lower()
    if val != _CSRF_VALUE:
        raise HTTPException(status_code=403, detail="Missing CSRF header")
