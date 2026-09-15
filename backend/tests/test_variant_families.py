from variant_families import build_variant_family_index, family_for_product, normalize_variant_slug, normalized_variant_families


def test_registry_ignores_unreviewed_or_incomplete_rows():
    settings = {"homepage_content": {"variant_families": [
        {"name": "Neelpushp", "product_ids": ["p1", "p2", "p2"]},
        {"name": "Only one", "product_ids": ["p3"]},
        {"name": "", "product_ids": ["p4", "p5"]},
    ]}}
    assert normalized_variant_families(settings) == [
        {"slug": "neelpushp", "name": "Neelpushp", "product_ids": ["p1", "p2"], "axes": []}
    ]


def test_family_lookup_resolves_only_explicit_membership():
    settings = {"homepage_content": {"variant_families": [
        {"slug": "rajsi-urn", "name": "Rajsi Urn", "product_ids": ["amber", "clear"],
         "axes": ["glass_colour", "metal_finish", "unknown", "glass_colour"]},
    ]}}
    assert family_for_product(settings, "clear") == {
        "slug": "rajsi-urn", "name": "Rajsi Urn", "product_ids": ["amber", "clear"],
        "axes": ["glass_colour", "metal_finish"],
    }
    assert family_for_product(settings, "red") is None
    assert normalize_variant_slug("Rajsi Urn & Scroll") == "rajsi-urn-and-scroll"


def test_matching_piece_index_uses_only_published_cross_category_members():
    settings = {"homepage_content": {"variant_families": [{
        "name": "Bagh-e-Noor", "product_ids": ["ch", "wl", "draft"], "axes": ["glass_colour", "use"],
    }]}}
    products = [
        {"id": "ch", "category": "Chandelier", "status": "published"},
        {"id": "wl", "category": "Wall Light", "status": "published"},
        {"id": "draft", "category": "Table Lamp", "status": "draft"},
    ]

    assert build_variant_family_index(settings, products) == {
        "ch": {"family": "Bagh-e-Noor", "categories": ["Wall Light"]},
        "wl": {"family": "Bagh-e-Noor", "categories": ["Chandelier"]},
    }

    settings["homepage_content"]["variant_families"][0]["axes"] = ["glass_colour"]
    assert build_variant_family_index(settings, products) == {}
