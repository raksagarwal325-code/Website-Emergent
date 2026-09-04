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


def test_standard_two_image_product_auto_pairs_on_then_off():
    doc = {
        "id": "p3",
        "images": ["/black-on.jpg", "/white-off.jpg"],
        "specs": {},
    }

    public = sanitize_public_product(doc)

    assert public["catalog_image_on"] == "/black-on.jpg"
    assert public["catalog_image_off"] == "/white-off.jpg"


def test_explicit_catalogue_pair_overrides_two_image_convention():
    doc = {
        "id": "p4",
        "images": ["/gallery-1.jpg", "/gallery-2.jpg"],
        "specs": {
            "Catalogue Image ON": "/manual-on.jpg",
            "Catalogue Image OFF": "/manual-off.jpg",
        },
    }

    public = sanitize_public_product(doc)

    assert public["catalog_image_on"] == "/manual-on.jpg"
    assert public["catalog_image_off"] == "/manual-off.jpg"


def test_single_image_product_does_not_invent_pair():
    public = sanitize_public_product({"id": "p5", "images": ["/only.jpg"], "specs": {}})

    assert "catalog_image_on" not in public
    assert "catalog_image_off" not in public


def test_three_or_more_images_require_explicit_pairing():
    public = sanitize_public_product(
        {"id": "p6", "images": ["/a.jpg", "/b.jpg", "/c.jpg"], "specs": {}}
    )

    assert "catalog_image_on" not in public
    assert "catalog_image_off" not in public
