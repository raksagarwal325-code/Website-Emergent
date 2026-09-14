"""Helpers for durable, restorable product edit history.

Only administrator-editable catalogue fields are snapshotted. Runtime fields
such as ratings, timestamps and database ids stay owned by the live product so
restoring an old catalogue version cannot roll back customer review data.
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any


EDITABLE_PRODUCT_FIELDS = (
    "name", "sku", "category", "price", "compare_at_price", "currency",
    "short_description", "description", "images", "tags", "specs", "stock",
    "featured", "badge", "fixed_price", "price_display", "status",
)


def editable_product_snapshot(product: dict[str, Any]) -> dict[str, Any]:
    """Return an isolated allow-listed snapshot suitable for restoration."""
    return {
        field: deepcopy(product.get(field))
        for field in EDITABLE_PRODUCT_FIELDS
        if field in product
    }


def _diff_values(before: Any, after: Any, path: str, out: dict[str, dict[str, Any]]) -> None:
    if isinstance(before, dict) and isinstance(after, dict):
        for key in sorted(set(before) | set(after)):
            child_path = f"{path}.{key}" if path else str(key)
            _diff_values(before.get(key), after.get(key), child_path, out)
        return
    if before != after:
        out[path] = {"old": deepcopy(before), "new": deepcopy(after)}


def product_changes(
    before: dict[str, Any], after: dict[str, Any]
) -> dict[str, dict[str, Any]]:
    """Return field-level old/new values, including nested specification keys."""
    changes: dict[str, dict[str, Any]] = {}
    _diff_values(
        editable_product_snapshot(before),
        editable_product_snapshot(after),
        "",
        changes,
    )
    return changes
