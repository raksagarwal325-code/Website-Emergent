"""Admin-only structural and demand health snapshot.

Read-only checks for collection integrity, project-gallery integrity, public route
identity, and website inquiry demand. This module intentionally does not claim
page-view or sales-conversion data; those require analytics / CRM integrations.
"""
from __future__ import annotations

import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request

_COLLECTION_PREFIX = "collection:"
_FEATURED_PREFIX = "collection-featured:"


def _text(value) -> str:
    return str(value or "").strip()


def _slug(value) -> str:
    text = unicodedata.normalize("NFKD", _text(value))
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:80]


def _project_slugs(items: list[dict]) -> list[str]:
    used: dict[str, int] = {}
    result: list[str] = []
    for index, item in enumerate(items):
        base = _slug(item.get("title")) or f"project-{index + 1}"
        count = used.get(base, 0)
        used[base] = count + 1
        result.append(base if count == 0 else f"{base}-{count + 1}")
    return result


def _collection_slugs(product: dict) -> list[str]:
    values = []
    for tag in product.get("tags") or []:
        tag_text = _text(tag)
        if tag_text.startswith(_COLLECTION_PREFIX):
            slug = _slug(tag_text[len(_COLLECTION_PREFIX):])
            if slug:
                values.append(slug)
    return values


def _featured_in_collection(product: dict, slug: str) -> bool:
    target = f"{_FEATURED_PREFIX}{slug}"
    return target in {_text(tag) for tag in (product.get("tags") or [])}


def _finding(scope: str, key: str, severity: str, issue: str, detail: str = "") -> dict:
    return {"scope": scope, "key": key, "severity": severity, "issue": issue, "detail": detail}


def _collection_health(products: list[dict], settings: dict) -> dict:
    homepage = settings.get("homepage_content") or {}
    raw_registry = homepage.get("collections") or []
    registry = []
    for item in raw_registry if isinstance(raw_registry, list) else []:
        slug = _slug((item or {}).get("slug"))
        name = _text((item or {}).get("name"))
        if slug and name:
            registry.append({"slug": slug, "name": name})

    published = [p for p in products if p.get("status", "published") == "published"]
    registry_slugs = [item["slug"] for item in registry]
    registry_set = set(registry_slugs)
    findings = []
    rows = []

    slug_counts = Counter(registry_slugs)
    name_counts = Counter(item["name"].lower() for item in registry)
    for slug, count in slug_counts.items():
        if count > 1:
            findings.append(_finding("collection", slug, "critical", "Duplicate collection slug", f"{count} registry entries"))
    for name, count in name_counts.items():
        if count > 1:
            findings.append(_finding("collection", name, "review", "Duplicate collection name", f"{count} registry entries"))

    explicit_slugs = set()
    for product in products:
        explicit_slugs.update(_collection_slugs(product))
    for slug in sorted(explicit_slugs - registry_set):
        member_count = sum(slug in _collection_slugs(product) for product in products)
        findings.append(_finding("collection", slug, "critical", "Orphan collection membership tag", f"{member_count} products reference an unregistered collection"))

    for item in registry:
        slug = item["slug"]
        members = [p for p in published if slug in _collection_slugs(p)]
        categories = sorted({_text(p.get("category")) or "Uncategorised" for p in members})
        featured = [p for p in members if _featured_in_collection(p, slug)]
        local = []
        if not members:
            local.append(_finding("collection", slug, "critical", "Collection has no published members"))
        elif len(members) < 3:
            local.append(_finding("collection", slug, "review", "Collection has very few products", f"{len(members)} published members"))
        if members and len(categories) == 1:
            local.append(_finding("collection", slug, "review", "Collection has only one category represented", categories[0]))
        if members and not featured:
            local.append(_finding("collection", slug, "review", "No featured collection product selected"))
        findings.extend(local)
        rows.append({
            "slug": slug,
            "name": item["name"],
            "published_members": len(members),
            "categories": categories,
            "featured_products": len(featured),
            "findings": len(local),
        })

    return {
        "registered": len(registry),
        "healthy": sum(1 for row in rows if row["findings"] == 0),
        "rows": rows,
        "findings": findings,
    }


def _project_health(products: list[dict], settings: dict) -> dict:
    homepage = settings.get("homepage_content") or {}
    gallery = homepage.get("gallery") or {}
    items = gallery.get("items") or []
    projects = [item if isinstance(item, dict) else {} for item in items] if isinstance(items, list) else []
    slugs = _project_slugs(projects)

    product_by_id = {_text(p.get("id")): p for p in products if _text(p.get("id"))}
    product_names = {_text(p.get("name")).lower() for p in products if _text(p.get("name"))}
    title_counts = Counter(_text(p.get("title")).lower() for p in projects if _text(p.get("title")))

    findings = []
    rows = []
    for index, project in enumerate(projects):
        title = _text(project.get("title"))
        key = slugs[index]
        images = [_text(value) for value in (project.get("images") or []) if _text(value)]
        linked = [_text(value) for value in (project.get("products") or []) if _text(value)]
        local = []
        if not title:
            local.append(_finding("project", key, "critical", "Missing project title"))
        if not _text(project.get("location")):
            local.append(_finding("project", key, "review", "Missing project location"))
        if not images:
            local.append(_finding("project", key, "critical", "Project has no images"))
        elif len(images) != len(set(images)):
            local.append(_finding("project", key, "review", "Duplicate project image URL"))
        if not linked:
            local.append(_finding("project", key, "review", "Project has no linked catalogue product"))
        orphaned = [product_id for product_id in linked if product_id not in product_by_id]
        if orphaned:
            local.append(_finding("project", key, "critical", "Project has orphaned product links", f"{len(orphaned)} missing product IDs"))
        if not _text(project.get("note")) and not _text(project.get("fixture_details")):
            local.append(_finding("project", key, "review", "Project has no story or fixture details"))
        if title and title.lower() in product_names:
            local.append(_finding("project", key, "review", "Project title matches a product name", title))
        if title and title_counts[title.lower()] > 1:
            local.append(_finding("project", key, "review", "Duplicate project title", title))
        findings.extend(local)
        rows.append({
            "slug": key,
            "title": title or f"Untitled project {index + 1}",
            "location": _text(project.get("location")),
            "images": len(images),
            "linked_products": len(linked),
            "findings": len(local),
        })

    return {
        "projects": len(projects),
        "healthy": sum(1 for row in rows if row["findings"] == 0),
        "rows": rows,
        "findings": findings,
    }


def _route_integrity(products: list[dict], collection_health: dict, project_health: dict, product_slug_func) -> dict:
    published = [p for p in products if p.get("status", "published") == "published"]
    slugs = []
    for product in published:
        try:
            slugs.append(_text(product_slug_func(product)))
        except Exception:  # noqa: BLE001
            slugs.append("")
    counts = Counter(slugs)
    findings = []
    for slug, count in counts.items():
        if not slug:
            findings.append(_finding("route", "product", "critical", "Published product has no public slug"))
        elif count > 1:
            findings.append(_finding("route", slug, "critical", "Duplicate published product route", f"{count} products resolve to the same slug"))
    for row in collection_health.get("rows", []):
        if row.get("published_members", 0) == 0:
            findings.append(_finding("route", row.get("slug", "collection"), "critical", "Collection route has no published products"))
    return {
        "published_product_routes": len(published),
        "unique_product_routes": len({slug for slug in slugs if slug}),
        "collection_routes": collection_health.get("registered", 0),
        "project_routes": project_health.get("projects", 0),
        "findings": findings,
    }


def _demand_health(products: list[dict], inquiries: list[dict], now: datetime) -> dict:
    by_id = {_text(p.get("id")): p for p in products if _text(p.get("id"))}
    published = [p for p in products if p.get("status", "published") == "published"]
    cutoff_30 = now - timedelta(days=30)
    cutoff_90 = now - timedelta(days=90)

    demand_30 = defaultdict(lambda: {"inquiries": 0, "quantity": 0})
    demand_90 = defaultdict(lambda: {"inquiries": 0, "quantity": 0})
    inquiry_ids_seen_30 = defaultdict(set)
    inquiry_ids_seen_90 = defaultdict(set)

    for inquiry in inquiries:
        created_raw = _text(inquiry.get("created_at"))
        try:
            created = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
        except Exception:  # noqa: BLE001
            continue
        if created < cutoff_90:
            continue
        inquiry_id = _text(inquiry.get("id")) or created_raw
        for item in inquiry.get("items") or []:
            product_id = _text((item or {}).get("product_id"))
            if product_id not in by_id:
                continue
            quantity = int((item or {}).get("quantity") or 1)
            if inquiry_id not in inquiry_ids_seen_90[product_id]:
                demand_90[product_id]["inquiries"] += 1
                inquiry_ids_seen_90[product_id].add(inquiry_id)
            demand_90[product_id]["quantity"] += max(quantity, 1)
            if created >= cutoff_30:
                if inquiry_id not in inquiry_ids_seen_30[product_id]:
                    demand_30[product_id]["inquiries"] += 1
                    inquiry_ids_seen_30[product_id].add(inquiry_id)
                demand_30[product_id]["quantity"] += max(quantity, 1)

    rows = []
    for product_id, metrics in demand_90.items():
        product = by_id[product_id]
        rows.append({
            "product_id": product_id,
            "sku": _text(product.get("sku")),
            "name": _text(product.get("name")),
            "category": _text(product.get("category")),
            "inquiries_30d": demand_30[product_id]["inquiries"],
            "quantity_30d": demand_30[product_id]["quantity"],
            "inquiries_90d": metrics["inquiries"],
            "quantity_90d": metrics["quantity"],
        })
    rows.sort(key=lambda row: (row["inquiries_30d"], row["inquiries_90d"], row["quantity_90d"]), reverse=True)
    with_90 = set(demand_90)
    return {
        "metric_scope": "Website inquiry baskets only — not page views or completed sales",
        "products_with_inquiry_demand_30d": len(demand_30),
        "products_with_inquiry_demand_90d": len(demand_90),
        "published_products_without_inquiry_demand_90d": sum(1 for p in published if _text(p.get("id")) not in with_90),
        "top_products": rows[:20],
    }


async def build_growth_health(db, product_slug_func) -> dict:
    now = datetime.now(timezone.utc)
    products = await db.products.find({}, {"_id": 0}).to_list(length=10000)
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0}) or {}
    cutoff_90 = (now - timedelta(days=90)).isoformat()
    inquiries = await db.inquiries.find(
        {"created_at": {"$gte": cutoff_90}},
        {"_id": 0, "id": 1, "created_at": 1, "items": 1},
    ).to_list(length=10000)

    collections = _collection_health(products, settings)
    projects = _project_health(products, settings)
    routes = _route_integrity(products, collections, projects, product_slug_func)
    demand = _demand_health(products, inquiries, now)
    return {
        "generated_at": now.isoformat(),
        "collections": collections,
        "projects": projects,
        "route_integrity": routes,
        "product_demand": demand,
        "gsc": {
            "runtime_connected": False,
            "note": "Google Search Console indexing/crawl metrics still require a server-side GSC credential. This panel does not fabricate GSC data.",
        },
    }


def install_admin_health_growth(load_admin_func) -> None:
    try:
        import server as server_module
    except ImportError:
        try:
            from backend import server as server_module
        except ImportError:
            return

    app = getattr(server_module, "app", None)
    db = getattr(server_module, "db", None)
    product_slug_func = getattr(server_module, "product_slug", None)
    if app is None or db is None or product_slug_func is None:
        return
    if getattr(app.state, "sge_admin_health_growth_installed", False):
        return

    @app.get("/api/admin/health/growth")
    async def admin_health_growth(request: Request):
        user = await load_admin_func(db, request)
        if user is None:
            if request.cookies.get("session_token") or request.headers.get("Authorization"):
                raise HTTPException(status_code=403, detail="Not authorized for admin.")
            raise HTTPException(status_code=401, detail="Authentication required.")
        return await build_growth_health(db, product_slug_func)

    app.state.sge_admin_health_growth_installed = True
