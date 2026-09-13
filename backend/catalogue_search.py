"""Small, dependency-free catalogue query normalization helpers."""
import re
from typing import Optional


CATALOGUE_QUERY_ALIASES = {
    "chandlier": "chandelier",
    "chandeliar": "chandelier",
    "chandalier": "chandelier",
    "chandeller": "chandelier",
}

CATALOGUE_COLOURS = {
    "amber", "black", "blue", "bronze", "brown", "clear", "copper",
    "cream", "gold", "green", "grey", "pink", "red", "silver", "smoked",
    "transparent", "white", "yellow",
}


def resolve_catalogue_query(value: Optional[str]) -> tuple[str, Optional[str]]:
    """Return a safe, normalized catalogue query and an optional correction."""
    normalized = re.sub(r"\s+", " ", (value or "").strip()).lower()
    resolved = CATALOGUE_QUERY_ALIASES.get(normalized, normalized)
    return resolved, resolved if normalized and resolved != normalized else None


def catalogue_search_filter(resolved_query: str) -> list[dict]:
    """Build field-aware search clauses without interpreting user regex syntax."""
    escaped = re.escape(resolved_query)
    token_pattern = rf"\b{escaped}\b"
    common = [
        {"name": {"$regex": token_pattern, "$options": "i"}},
        {"sku": {"$regex": escaped, "$options": "i"}},
        {"tags": {"$regex": token_pattern, "$options": "i"}},
    ]
    if resolved_query in CATALOGUE_COLOURS:
        # Colour searches deliberately avoid the free-form description field:
        # substring matching there made values such as "red" match
        # "handcrafted" and overwhelmed genuinely red products.
        return common + [
            {f"specs.{key}": {"$regex": token_pattern, "$options": "i"}}
            for key in (
                "Colour", "Color", "Glass Colour", "Glass Color",
                "Finish", "Glass Finish", "Shade Colour", "Shade Color",
            )
        ]
    return common + [
        {"description": {"$regex": escaped, "$options": "i"}},
        {"short_description": {"$regex": escaped, "$options": "i"}},
    ]
