from public_product_sanitizer import sanitize_public_product


def test_catalogue_lighting_specs_are_exposed_as_internal_image_fields_only():
    doc = {
        "id": "p1",
        "name": "Lamp",
        "images": ["/primary.jpg"],
        "specs": {
            "Material": "Glass",
            "Catalogue Image OFF": "/white-off.jpg",
            "Catalogue Image ON": "/black-on.jpg",
        },
    }

    public = sanitize_public_product(doc)

    assert public["catalog_image_off"] == "/white-off.jpg"
    assert public["catalog_image_on"] == "/black-on.jpg"
    assert public["specs"] == {"Material": "Glass"}


def test_underscore_catalogue_lighting_keys_are_supported_and_hidden():
    doc = {
        "id": "p2",
        "specs": {
            "_catalog_image_off": "/off.jpg",
            "_catalog_image_on": "/on.jpg",
        },
    }

    public = sanitize_public_product(doc)

    assert public["catalog_image_off"] == "/off.jpg"
    assert public["catalog_image_on"] == "/on.jpg"
    assert public["specs"] == {}
