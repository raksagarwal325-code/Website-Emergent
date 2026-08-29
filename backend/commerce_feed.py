"""Pure helpers for the OpenAI/Google-compatible commerce product feed.

Only published products with a genuine public price are exported. The Samrat
Glass storefront's public currency is INR, so legacy source-currency values
are reported as warnings while feed prices remain aligned with the INR shown
on product pages. A stored/internal price never leaks when ``price_display``
is ``on_request``.
"""

from __future__ import annotations

from collections import Counter
from typing import Callable, Iterable


REQUIRED_FIELDS = (
    "id", "title", "description", "link", "image_link",
    "availability", "price", "brand",
)


def _clean(value) -> str:
    return " ".join(str(value or "").split()).strip()


def _availability(doc: dict) -> str:
    try:
        stock = float(doc.get("stock") or 0)
    except (TypeError, ValueError):
        stock = 0
    return "in_stock" if stock > 0 else "preorder"


def build_feed_row(
    doc: dict,
    *,
    site_origin: str,
    slug_builder: Callable[[dict], str],
    image_url_builder: Callable[[str], str],
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

    return {
        "id": product_id,
        "title": title,
        "description": description,
        "link": link,
        "image_link": image_link,
        "availability": _availability(doc),
        "price": f"{price_value:.2f} INR",
        "brand": "Samrat Glass Emporium",
        "condition": "new",
        "_warnings": warnings,
    }, []


def build_feed(
    docs: Iterable[dict],
    *,
    site_origin: str,
    slug_builder: Callable[[dict], str],
    image_url_builder: Callable[[str], str],
) -> tuple[list[dict], list[dict], dict[str, int]]:
    rows: list[dict] = []
    excluded: list[dict] = []
    reason_counts: Counter[str] = Counter()
    for doc in docs:
        row, reasons = build_feed_row(
            doc,
            site_origin=site_origin,
            slug_builder=slug_builder,
            image_url_builder=image_url_builder,
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
