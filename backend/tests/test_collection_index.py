from collection_index import build_collection_index


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
