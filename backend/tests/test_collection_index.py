from collection_index import build_collection_detail, build_collection_index


def test_builds_registered_collection_card_without_exposing_members():
    settings = {"homepage_content": {"collections": [{"slug": "rajsri", "name": "Rajsri"}]}}
    products = [
        {"sku": "SGE-TL-057", "category": "Table Lamp", "images": ["/rajsri.jpg"], "tags": ["collection:rajsri"]},
        {"sku": "SGE-WL-020", "category": "Wall Light", "images": ["/wall.jpg"], "tags": ["collection:rajsri", "collection-featured:rajsri"]},
    ]

    result = build_collection_index(settings, products)

    assert result == [{
        "slug": "rajsri",
        "name": "Rajsri",
        "description": "Explore the Rajsri family across coordinated lighting forms, categories and variants designed to work together throughout an interior.",
        "piece_count": 2,
        "category_count": 2,
        "cover_image": "/wall.jpg",
        "cover_sku": "SGE-WL-020",
    }]


def test_ignores_unregistered_orphan_tags_on_public_index():
    settings = {"homepage_content": {"collections": [{"slug": "gulzar", "name": "Gulzar"}]}}
    products = [{"sku": "X-1", "category": "Lamp", "images": ["/x.jpg"], "tags": ["collection:private-draft"]}]

    assert build_collection_index(settings, products) == []


def test_unversioned_multi_collection_registry_exposes_only_verified_gulzar():
    settings = {"homepage_content": {"collections": [
        {"slug": "gulzar", "name": "Gulzar"},
        {"slug": "rajsri", "name": "Rajsri"},
    ]}}
    products = [
        {"sku": "SGE-CH-054", "category": "Chandelier", "images": ["/gulzar.jpg"], "tags": ["collection:gulzar"]},
        {"sku": "SGE-TL-057", "category": "Table Lamp", "images": ["/rajsri.jpg"], "tags": ["collection:rajsri"]},
    ]

    result = build_collection_index(settings, products)

    assert [item["slug"] for item in result] == ["gulzar"]


def test_builds_registered_collection_detail_with_exact_members():
    settings = {"homepage_content": {
        "collections_registry_version": 2,
        "collections": [{"slug": "meher", "name": "Meher"}],
    }}
    products = [
        {"id": "ch", "sku": "SGE-CH-129", "category": "Chandelier", "tags": ["collection:meher"]},
        {"id": "wl", "sku": "SGE-WL-101", "category": "Wall Light", "tags": ["collection:meher"]},
        {"id": "other", "sku": "OTHER", "category": "Lamp", "tags": []},
    ]

    result = build_collection_detail(settings, products, "Meher")

    assert result["slug"] == "meher"
    assert result["title"] == "The Meher Collection"
    assert [item["id"] for item in result["items"]] == ["ch", "wl"]


def test_collection_detail_rejects_unregistered_tag():
    settings = {"homepage_content": {
        "collections_registry_version": 2,
        "collections": [{"slug": "gulzar", "name": "Gulzar"}],
    }}
    products = [{"id": "x", "tags": ["collection:meher"]}]

    assert build_collection_detail(settings, products, "meher") is None
