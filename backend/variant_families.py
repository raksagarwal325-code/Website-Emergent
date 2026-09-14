"""Helpers for the reviewed product-variant registry stored in Settings."""

import re


def normalize_variant_slug(value: str) -> str:
    value = str(value or "").lower().replace("&", " and ")
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", value))


def normalized_variant_families(settings: dict | None) -> list[dict]:
    homepage = (settings or {}).get("homepage_content") or {}
    raw = homepage.get("variant_families") or []
    if not isinstance(raw, list):
        return []
    families = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        slug = normalize_variant_slug(row.get("slug") or row.get("name"))
        name = str(row.get("name") or "").strip()
        product_ids = list(dict.fromkeys(
            str(item).strip() for item in (row.get("product_ids") or []) if str(item).strip()
        ))
        if slug and name and len(product_ids) >= 2:
            families.append({"slug": slug, "name": name, "product_ids": product_ids})
    return families


def family_for_product(settings: dict | None, product_id: str) -> dict | None:
    target = str(product_id or "").strip()
    for family in normalized_variant_families(settings):
        if target in family["product_ids"]:
            return family
    return None
