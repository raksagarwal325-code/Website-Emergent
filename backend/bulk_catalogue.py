"""Pure helpers for safe, preview-first catalogue bulk edits."""
from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from typing import Any


ALLOWED_BULK_FIELDS = (
    "category",
    "status",
    "featured",
    "price_display",
    "badge",
)


def normalize_bulk_changes(changes: dict[str, Any]) -> dict[str, Any]:
    """Return the allow-listed product patch, including legacy field sync."""
    patch = {
        field: deepcopy(value)
        for field, value in changes.items()
        if field in ALLOWED_BULK_FIELDS and value is not None
    }
    if "category" in patch:
        patch["category"] = str(patch["category"]).strip()
    if "badge" in patch:
        patch["badge"] = str(patch["badge"]).strip()
    if "price_display" in patch:
        patch["fixed_price"] = patch["price_display"] == "fixed"
    return patch


def build_bulk_change_plan(products: list[dict], changes: dict[str, Any]) -> list[dict]:
    """Build product-level old/new rows without mutating source documents."""
    patch = normalize_bulk_changes(changes)
    plan = []
    for product in products:
        rows = []
        product_patch = {}
        for field, new_value in patch.items():
            old_value = product.get(field)
            if old_value != new_value:
                product_patch[field] = deepcopy(new_value)
                rows.append({"field": field, "old": deepcopy(old_value), "new": deepcopy(new_value)})
        plan.append({
            "id": product.get("id"),
            "name": product.get("name", ""),
            "sku": product.get("sku", ""),
            "updated_at": product.get("updated_at", ""),
            "patch": product_patch,
            "changes": rows,
        })
    return plan


def bulk_preview_token(plan: list[dict]) -> str:
    """Bind approval to the exact products, versions and proposed values."""
    payload = [
        {
            "id": row["id"],
            "updated_at": row.get("updated_at", ""),
            "patch": row.get("patch", {}),
        }
        for row in plan
    ]
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()
