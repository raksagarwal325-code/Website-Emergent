"""Map saved project installation photos to their linked catalogue products."""

from media_library import canonical_media_url


def linked_project_photos(projects: list[dict], published_products: list[dict]) -> dict[str, list[dict]]:
    """Only owner-linked, published products are eligible for quotation matches."""
    by_id = {product["id"]: product for product in published_products if product.get("id")}
    mapped: dict[str, list[dict]] = {}
    for project in projects:
        linked = [by_id[pid] for pid in dict.fromkeys(project.get("products") or []) if pid in by_id]
        if not linked:
            continue
        for raw_url in project.get("images") or []:
            url = canonical_media_url(raw_url)
            if not url.startswith("/api/files/"):
                continue
            rows = mapped.setdefault(url, [])
            seen = {product["id"] for product in rows}
            rows.extend(product for product in linked if product["id"] not in seen)
    return mapped
