"""Admin-only live technical/search/conversion health snapshot.

This module adds one read-only endpoint used by the Admin Website Health page.
It intentionally does not mutate products, settings, enquiries, or public-site
content. Live web checks target only the fixed production origin; no user-supplied
URLs are accepted.
"""
from __future__ import annotations

import os
import re
from collections import Counter
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import HTTPException, Request

_PRODUCTION_ORIGIN = "https://samratglass.com"
_TIMEOUT_SECONDS = 8.0


def _origin() -> str:
    value = str(os.environ.get("SITE_ORIGIN") or os.environ.get("PUBLIC_SITE_ORIGIN") or _PRODUCTION_ORIGIN).strip()
    if value.rstrip("/") != _PRODUCTION_ORIGIN:
        return _PRODUCTION_ORIGIN
    return value.rstrip("/")


def _check_payload(name: str, url: str, response: httpx.Response | None = None, error: str = "") -> dict:
    if response is None:
        return {"name": name, "url": url, "ok": False, "status": None, "error": error or "unavailable"}
    return {
        "name": name,
        "url": url,
        "ok": 200 <= response.status_code < 400,
        "status": response.status_code,
        "content_type": response.headers.get("content-type", ""),
        "error": "",
    }


async def _fetch(client: httpx.AsyncClient, name: str, path: str) -> tuple[dict, str]:
    url = f"{_origin()}{path}"
    try:
        response = await client.get(url, follow_redirects=True)
        return _check_payload(name, url, response=response), response.text[:1_000_000]
    except Exception as exc:  # noqa: BLE001
        return _check_payload(name, url, error=exc.__class__.__name__), ""


def _contains_canonical(html: str) -> bool:
    return bool(re.search(r'<link[^>]+rel=["\']canonical["\']', html or "", re.I))


def _contains_jsonld(html: str) -> bool:
    return bool(re.search(r'<script[^>]+type=["\']application/ld\+json["\']', html or "", re.I))


def _robots_allows_public(robots: str) -> bool:
    lowered_lines = [line.strip().lower() for line in (robots or "").splitlines()]
    return "allow: /" in lowered_lines and "disallow: /" not in lowered_lines


def _robots_sitemaps(robots: str) -> list[str]:
    values = []
    for line in (robots or "").splitlines():
        if line.lower().startswith("sitemap:"):
            values.append(line.split(":", 1)[1].strip())
    return values


async def build_live_health(db) -> dict:
    origin = _origin()
    async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS, headers={"User-Agent": "SamratGlass-AdminHealth/1.0"}) as client:
        homepage, homepage_html = await _fetch(client, "Homepage", "/")
        robots, robots_text = await _fetch(client, "Robots", "/robots.txt")
        product_sitemap, product_sitemap_text = await _fetch(client, "Product sitemap", "/api/sitemap.xml")
        editorial_sitemap, editorial_sitemap_text = await _fetch(client, "Editorial sitemap", "/sitemap.xml")
        authority_sitemap, authority_sitemap_text = await _fetch(client, "Authority sitemap", "/authority-sitemap.xml")

    technical_checks = [homepage, robots, product_sitemap, editorial_sitemap, authority_sitemap]
    technical = {
        "origin": origin,
        "checks": technical_checks,
        "passing": sum(1 for item in technical_checks if item["ok"]),
        "total": len(technical_checks),
        "homepage_canonical": _contains_canonical(homepage_html),
        "homepage_jsonld": _contains_jsonld(homepage_html),
    }

    sitemap_urls = _robots_sitemaps(robots_text)
    expected_sitemaps = {
        f"{origin}/api/sitemap.xml",
        f"{origin}/sitemap.xml",
        f"{origin}/authority-sitemap.xml",
    }
    search_checks = [
        {"name": "Robots allows public site", "ok": robots["ok"] and _robots_allows_public(robots_text)},
        {"name": "Robots declares all three sitemaps", "ok": expected_sitemaps.issubset(set(sitemap_urls))},
        {"name": "Product sitemap has URLs", "ok": product_sitemap["ok"] and "<loc>" in product_sitemap_text},
        {"name": "Editorial sitemap has URLs", "ok": editorial_sitemap["ok"] and "<loc>" in editorial_sitemap_text},
        {"name": "Authority sitemap has URLs", "ok": authority_sitemap["ok"] and "<loc>" in authority_sitemap_text},
        {"name": "Homepage canonical present", "ok": _contains_canonical(homepage_html)},
        {"name": "Homepage structured data present", "ok": _contains_jsonld(homepage_html)},
    ]
    search = {
        "checks": search_checks,
        "passing": sum(1 for item in search_checks if item["ok"]),
        "total": len(search_checks),
        "declared_sitemaps": sitemap_urls,
        "search_console_connected": False,
        "search_console_note": "Live Google Search Console metrics are not pulled by the website runtime because no server-side GSC credential is configured. Crawl/indexing performance remains authoritative in Search Console.",
    }

    now = datetime.now(timezone.utc)
    since_7d = (now - timedelta(days=7)).isoformat()
    since_30d = (now - timedelta(days=30)).isoformat()

    inquiry_total = await db.inquiries.count_documents({})
    inquiry_7d = await db.inquiries.count_documents({"created_at": {"$gte": since_7d}})
    inquiry_30d = await db.inquiries.count_documents({"created_at": {"$gte": since_30d}})
    contact_total = await db.contact_messages.count_documents({})
    contact_7d = await db.contact_messages.count_documents({"created_at": {"$gte": since_7d}})
    contact_30d = await db.contact_messages.count_documents({"created_at": {"$gte": since_30d}})

    recent_inquiries = await db.inquiries.find({}, {"_id": 0, "status": 1}).sort("created_at", -1).to_list(length=5000)
    status_counts = Counter(str(item.get("status") or "unknown") for item in recent_inquiries)

    conversion = {
        "inquiries_total": inquiry_total,
        "inquiries_7d": inquiry_7d,
        "inquiries_30d": inquiry_30d,
        "contact_messages_total": contact_total,
        "contact_messages_7d": contact_7d,
        "contact_messages_30d": contact_30d,
        "inquiry_status_counts": dict(sorted(status_counts.items())),
        "lead_attribution_connected": False,
        "note": "These are website enquiry/contact counts, not sales conversion rates. Qualified lead, quotation and order attribution still requires the Lead Register / sales attribution workflow.",
    }

    return {
        "generated_at": now.isoformat(),
        "technical": technical,
        "search": search,
        "conversion": conversion,
    }


def install_admin_health_ops(load_admin_func) -> None:
    try:
        import server as server_module
    except ImportError:
        try:
            from backend import server as server_module
        except ImportError:
            return

    app = getattr(server_module, "app", None)
    db = getattr(server_module, "db", None)
    if app is None or db is None:
        return
    if getattr(app.state, "sge_admin_health_ops_installed", False):
        return

    @app.get("/api/admin/health/ops")
    async def admin_health_ops(request: Request):
        user = await load_admin_func(db, request)
        if user is None:
            if request.cookies.get("session_token") or request.headers.get("Authorization"):
                raise HTTPException(status_code=403, detail="Not authorized for admin.")
            raise HTTPException(status_code=401, detail="Authentication required.")
        return await build_live_health(db)

    app.state.sge_admin_health_ops_installed = True
