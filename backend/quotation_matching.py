"""Deterministic product-level decisions for quotation photo search."""


def exact_file_matches(file_rows, query_sha, query_pixel_hash):
    """Return storage paths for identical public bytes/pixels or original bytes."""
    return [row["storage_path"] for row in file_rows
            if row.get("storage_path") and (
                query_sha in (row.get("public_sha256"), row.get("ownership_fingerprint"), row.get("sha256"))
                or query_pixel_hash == row.get("public_pixel_hash")
            )]


def strongest_full_frame_match(photo_rows, products_by_url):
    """Accept a near-copy only when a different product is clearly farther away.

    Several catalogue/project photographs can represent the same product. They
    must not act as one another's runner-up. A photo shared by two products is
    ambiguous and cannot be returned as a single confident match.
    """
    best_by_product = {}
    for row in photo_rows:
        for product, _image_index in products_by_url.get(row["url"], []):
            product_id = product.get("id")
            if not product_id:
                continue
            old = best_by_product.get(product_id)
            if old is None or (row["full_distance"], row["variant_distance"]) < (
                old["full_distance"], old["variant_distance"]
            ):
                best_by_product[product_id] = row
    ranked = sorted(best_by_product.items(), key=lambda item: (
        item[1]["full_distance"], item[1]["variant_distance"], str(item[0])
    ))
    if not ranked:
        return None, None, False
    best_id, best = ranked[0]
    second_distance = ranked[1][1]["full_distance"] if len(ranked) > 1 else 999
    confident = best["full_distance"] <= 18 and second_distance - best["full_distance"] >= 5
    return best_id, best, confident
