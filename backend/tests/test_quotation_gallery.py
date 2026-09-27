from quotation_gallery import linked_project_photos


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
