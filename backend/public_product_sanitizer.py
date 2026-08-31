"""Sanitize product documents at the public API boundary.

Admin/database records intentionally retain catalogue tags and unresolved spec
placeholders. Anonymous product responses must not expose those internal values,
so every public product route should pass documents through this helper before
returning them.
"""

PUBLIC_SPEC_PLACEHOLDERS = {
    "",
    "-",
    "—",
    "n/a",
    "na",
    "not available",
    "unknown",
    "none",
    "null",
    "needs confirmation",
    "to be confirmed",
    "to be confirmed before order",
}

PUBLIC_INTERNAL_SPEC_VALUES = {
    "heritage / classical indian luxury",
}


def sanitize_public_product(doc: dict | None):
    """Return a customer-safe copy without mutating the stored source doc."""
    if not isinstance(doc, dict):
        return doc

    out = dict(doc)
    out["tags"] = []

    specs = doc.get("specs")
    if isinstance(specs, dict):
        clean_specs = {}
        for key, value in specs.items():
            if value is None:
                continue
            normalized = str(value).strip().lower()
            if not normalized:
                continue
            if normalized in PUBLIC_SPEC_PLACEHOLDERS:
                continue
            if normalized in PUBLIC_INTERNAL_SPEC_VALUES:
                continue
            clean_specs[key] = value
        out["specs"] = clean_specs

    return out
