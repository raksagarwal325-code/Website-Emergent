"""Pure helpers for the OpenAI/Google-compatible commerce product feed.

Only published products with a genuine public price are exported. The Samrat
Glass storefront's public currency is INR, so legacy source-currency values
are reported as warnings while feed prices remain aligned with the INR shown
on product pages. A stored/internal price never leaks when ``price_display``
is ``on_request``.
"""

from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta
from typing import Callable, Iterable
from zoneinfo import ZoneInfo


REQUIRED_FIELDS = (
    "id", "title", "description", "link", "image_link",
    "availability", "price", "brand", "mpn",
)

OPENAI_REQUIRED_FIELDS = (
    "item_id", "title", "description", "url", "brand",
    "seller_name", "image_url", "availability", "price",
)

PREORDER_LEAD_DAYS = 30
STORE_TIMEZONE = ZoneInfo("Asia/Kolkata")


def _clean(value) -> str:
    return " ".join(str(value or "").split()).strip()


def _availability(doc: dict) -> str:
    try:
        stock = float(doc.get("stock") or 0)
    except (TypeError, ValueError):
        stock = 0
    return "in_stock" if stock > 0 else "preorder"


def _feed_date() -> date:
    """Return the storefront's local calendar date for a feed snapshot."""
    return datetime.now(STORE_TIMEZONE).date()


def build_feed_row(
    doc: dict,
    *,
    site_origin: str,
    slug_builder: Callable[[dict], str],
    image_url_builder: Callable[[str], str],
    as_of_date: date | None = None,
) -> tuple[dict | None, list[str]]:
    """Return one compliant feed row, or explicit reasons it is ineligible."""
    reasons: list[str] = []
    if doc.get("status") != "published":
        reasons.append("not_published")

    price_mode = _clean(doc.get("price_display") or "starting_from").lower()
    try:
        price_value = float(doc.get("price"))
    except (TypeError, ValueError):
        price_value = 0
    if price_mode == "on_request":
        reasons.append("price_on_request")
    elif price_value <= 0:
        reasons.append("missing_positive_price")

    currency = _clean(doc.get("currency")).upper()
    warnings = [] if currency == "INR" else ["source_currency_not_inr"]

    product_id = _clean(doc.get("sku") or doc.get("id"))
    title = _clean(doc.get("name"))
    description = _clean(doc.get("short_description") or doc.get("description"))
    slug = slug_builder(doc)
    link = f"{site_origin.rstrip('/')}/product/{slug}" if slug else ""
    raw_images = doc.get("images") or []
    image_link = next(
        (url for url in (image_url_builder(raw) for raw in raw_images) if url),
        "",
    )

    for field, value in (
        ("id", product_id), ("title", title), ("description", description),
        ("link", link), ("image_link", image_link),
    ):
        if not value:
            reasons.append(f"missing_{field}")

    if reasons:
        return None, sorted(set(reasons))

    availability = _availability(doc)
    availability_date = (
        ((as_of_date or _feed_date()) + timedelta(days=PREORDER_LEAD_DAYS)).isoformat()
        if availability == "preorder"
        else ""
    )

    return {
        "id": product_id,
        "title": title,
        "description": description,
        "link": link,
        "image_link": image_link,
        "availability": availability,
        "availability_date": availability_date,
        "price": f"{price_value:.2f} INR",
        "brand": "Samrat Glass Emporium",
        "mpn": product_id,
        "condition": "new",
        "_warnings": warnings,
    }, []


def build_feed(
    docs: Iterable[dict],
    *,
    site_origin: str,
    slug_builder: Callable[[dict], str],
    image_url_builder: Callable[[str], str],
    as_of_date: date | None = None,
) -> tuple[list[dict], list[dict], dict[str, int]]:
    rows: list[dict] = []
    excluded: list[dict] = []
    reason_counts: Counter[str] = Counter()
    snapshot_date = as_of_date or _feed_date()
    for doc in docs:
        row, reasons = build_feed_row(
            doc,
            site_origin=site_origin,
            slug_builder=slug_builder,
            image_url_builder=image_url_builder,
            as_of_date=snapshot_date,
        )
        if row:
            rows.append(row)
            continue
        reason_counts.update(reasons)
        excluded.append({
            "id": _clean(doc.get("id")),
            "sku": _clean(doc.get("sku")),
            "name": _clean(doc.get("name")),
            "reasons": reasons,
        })
    return rows, excluded, dict(sorted(reason_counts.items()))


def _all_public_image_values(doc: dict) -> list[str]:
    """Return gallery + catalogue light-mode variants without duplicates."""
    specs = doc.get("specs") if isinstance(doc.get("specs"), dict) else {}
    candidates = [
        *(doc.get("images") or []),
        doc.get("catalog_image_off"),
        doc.get("catalog_image_on"),
        specs.get("_catalog_image_off"),
        specs.get("_catalog_image_on"),
        specs.get("catalogue image off"),
        specs.get("catalogue image on"),
    ]
    seen = set()
    result = []
    for value in candidates:
        value = _clean(value)
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def build_openai_feed_row(
    doc: dict,
    *,
    site_origin: str,
    slug_builder: Callable[[dict], str],
    image_url_builder: Callable[[str], str],
    as_of_date: date | None = None,
) -> tuple[dict | None, list[str]]:
    """Build a row for OpenAI's stable native discovery-feed schema.

    This is intentionally discovery-only: checkout and ads eligibility stay
    disabled until separately enabled during OpenAI onboarding.
    """
    base, reasons = build_feed_row(
        doc,
        site_origin=site_origin,
        slug_builder=slug_builder,
        image_url_builder=image_url_builder,
        as_of_date=as_of_date,
    )
    if not base:
        return None, reasons

    image_urls = [
        url
        for url in (image_url_builder(raw) for raw in _all_public_image_values(doc))
        if url
    ]
    primary = image_urls[0] if image_urls else base["image_link"]
    additional = [url for url in image_urls if url != primary]

    availability = {
        "preorder": "pre_order",
        "in_stock": "in_stock",
        "out_of_stock": "out_of_stock",
        "backorder": "backorder",
    }.get(base["availability"], "unknown")

    row = {
        "item_id": base["id"],
        "title": base["title"],
        "description": base["description"],
        "url": base["link"],
        "brand": base["brand"],
        "seller_name": "Samrat Glass Emporium",
        "seller_url": site_origin.rstrip("/"),
        "image_url": primary,
        "availability": availability,
        "price": base["price"],
        "mpn": base["mpn"],
        "condition": "new",
        "product_type": _clean(doc.get("category")),
        "is_eligible_search": True,
        "is_eligible_checkout": False,
        "accepts_returns": False,
        "return_policy": f"{site_origin.rstrip('/')}/legal/returns",
        **({"additional_image_urls": additional} if additional else {}),
        "_warnings": base.get("_warnings", []),
    }
    missing = [field for field in OPENAI_REQUIRED_FIELDS if not row.get(field)]
    if missing:
        return None, [f"missing_{field}" for field in missing]
    return row, []


def build_openai_feed(
    docs: Iterable[dict],
    *,
    site_origin: str,
    slug_builder: Callable[[dict], str],
    image_url_builder: Callable[[str], str],
    as_of_date: date | None = None,
) -> tuple[list[dict], list[dict], dict[str, int]]:
    rows: list[dict] = []
    excluded: list[dict] = []
    reason_counts: Counter[str] = Counter()
    snapshot_date = as_of_date or _feed_date()
    for doc in docs:
        row, reasons = build_openai_feed_row(
            doc,
            site_origin=site_origin,
            slug_builder=slug_builder,
            image_url_builder=image_url_builder,
            as_of_date=snapshot_date,
        )
        if row:
            rows.append(row)
            continue
        reason_counts.update(reasons)
        excluded.append({
            "id": _clean(doc.get("id")),
            "sku": _clean(doc.get("sku")),
            "name": _clean(doc.get("name")),
            "reasons": reasons,
        })
    return rows, excluded, dict(sorted(reason_counts.items()))
