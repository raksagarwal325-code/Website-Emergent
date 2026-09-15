"""Fast, public-safe summaries for the customer-facing Collections index."""

import re


LEGACY_MEMBERS = {
    "gulzar": {
        "name": "Gulzar",
        "skus": {
            "SGE-CH-054", "SGE-CH-055", "SGE-CH-056", "SGE-CH-057", "SGE-CH-058",
            "SGE-CH-059", "SGE-CH-060", "SGE-CH-067", "SGE-CH-070", "SGE-CH-071",
            "SGE-CH-072", "SGE-CH-074", "SGE-CH-075", "SGE-FL-015", "SGE-TL-017",
            "SGE-TL-018", "SGE-TL-019", "SGE-TL-020", "SGE-TL-021",
        },
    },
}


def _slug(value):
    value = str(value or "").strip().lower()
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", value))


def _tags(product):
    return product.get("tags") if isinstance(product.get("tags"), list) else []


def _registered_collections(settings: dict | None) -> list[dict]:
    homepage = ((settings or {}).get("homepage_content") or {})
    raw = homepage.get("collections")
    registry = raw if isinstance(raw, list) else [
        {"slug": slug, "name": data["name"]} for slug, data in LEGACY_MEMBERS.items()
    ]
    # A previous migration registered every historical product tag as public.
    # Until the reviewed v2 registry is stored, only the established Gulzar
    # collection is safe to expose. A single legacy row remains compatible.
    if int(homepage.get("collections_registry_version") or 0) < 2 and len(registry) > 1:
        registry = [row for row in registry if isinstance(row, dict) and _slug(row.get("slug")) == "gulzar"]
    return registry


def _collection_members(products: list[dict], slug: str) -> list[dict]:
    token = f"collection:{slug}"
    members = [product for product in products if token in _tags(product)]
    if not members and slug in LEGACY_MEMBERS:
        allowed = LEGACY_MEMBERS[slug]["skus"]
        members = [product for product in products if product.get("sku") in allowed]
    return members


def build_collection_detail(settings: dict | None, products: list[dict], requested_slug: str) -> dict | None:
    """Resolve one public collection from the reviewed registry and its exact members."""
    wanted = _slug(requested_slug)
    registered = next((
        row for row in _registered_collections(settings)
        if isinstance(row, dict) and _slug(row.get("slug")) == wanted
    ), None)
    if not registered:
        return None
    name = str(registered.get("name") or "").strip()
    members = _collection_members(products, wanted)
    if not wanted or not name or not members:
        return None
    return {
        "slug": wanted,
        "name": name,
        "title": f"The {name} Collection",
        "eyebrow": "A coordinated lighting family",
        "description": f"Explore the {name} family across coordinated lighting forms, categories and variants designed to work together throughout an interior.",
        "items": members,
    }


def build_collection_index(settings: dict | None, products: list[dict]) -> list[dict]:
    """Build compact cards without exposing product tags or unpublished data."""
    registry = _registered_collections(settings)
    output = []
    seen = set()
    for registered in registry:
        slug = _slug(registered.get("slug")) if isinstance(registered, dict) else ""
        name = str(registered.get("name") or "").strip() if isinstance(registered, dict) else ""
        if not slug or not name or slug in seen:
            continue
        seen.add(slug)
        members = _collection_members(products, slug)
        if not members:
            continue
        featured_token = f"collection-featured:{slug}"
        cover = next((product for product in members if featured_token in _tags(product) and product.get("images")), None)
        cover = cover or next((product for product in members if product.get("images")), members[0])
        output.append({
            "slug": slug,
            "name": name,
            "description": f"Explore the {name} family across coordinated lighting forms, categories and variants designed to work together throughout an interior.",
            "piece_count": len(members),
            "category_count": len({product.get("category") or "Other" for product in members}),
            "cover_image": (cover.get("images") or [""])[0],
            "cover_sku": cover.get("sku") or "",
        })
    return sorted(output, key=lambda item: item["name"].lower())
