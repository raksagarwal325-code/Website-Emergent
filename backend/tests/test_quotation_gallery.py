from quotation_gallery import catalogue_photo_views, linked_project_photos


def test_project_photos_find_each_linked_published_catalogue_product():
    products = [
        {"id": "clear", "sku": "SGE-CH-101"},
        {"id": "ruby", "sku": "SGE-CH-004"},
    ]
    projects = [
        {
            "images": ["https://shop.example/api/files/installation.jpg", "/api/files/alternate.jpg"],
            "products": ["clear", "ruby", "clear", "draft", "deleted"],
        },
        {"images": ["/api/files/installation.jpg"], "products": ["ruby"]},
        {"images": ["/api/files/unlinked.jpg"], "products": ["draft"]},
        {"images": ["https://unrelated.example/image.jpg"], "products": ["clear"]},
    ]

    mapped = linked_project_photos(projects, products)

    assert {url: [product["sku"] for product in linked] for url, linked in mapped.items()} == {
        "/api/files/installation.jpg": ["SGE-CH-101", "SGE-CH-004"],
        "/api/files/alternate.jpg": ["SGE-CH-101", "SGE-CH-004"],
    }


def test_different_angle_discovery_sees_alternate_views_and_linked_installations():
    chandelier = {
        "id": "chandelier", "sku": "SGE-CH-046",
        "images": ["/api/files/studio.jpg", "/api/files/side.jpg"],
    }
    lantern = {"id": "lantern", "sku": "SGE-GL-011", "images": ["/api/files/lantern.jpg"]}
    projects = [{
        "products": ["chandelier", "lantern"],
        "images": ["https://shop.example/api/files/installation.jpg", "/api/files/side.jpg"],
    }]
    linked = linked_project_photos(projects, [chandelier, lantern])

    views = catalogue_photo_views([chandelier, lantern], linked)
    assert [(product["sku"], url, index) for product, url, index in views] == [
        ("SGE-CH-046", "/api/files/studio.jpg", 0),
        ("SGE-CH-046", "/api/files/side.jpg", 1),
        ("SGE-GL-011", "/api/files/lantern.jpg", 0),
        ("SGE-CH-046", "/api/files/installation.jpg", -1),
        ("SGE-GL-011", "/api/files/installation.jpg", -1),
        ("SGE-GL-011", "/api/files/side.jpg", -1),
    ]
