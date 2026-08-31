from public_product_sanitizer import sanitize_public_product


def test_public_product_sanitizer_removes_internal_tags_and_placeholders():
    source = {
        "id": "product-1",
        "name": "Test Light",
        "tags": [
            "collection:tarangrekha",
            "collection-label:tarangrekha:Tarangrekha",
            "luxury chandelier firozabad lighting",
        ],
        "specs": {
            "Height": "To be confirmed before order",
            "Width": "",
            "Style": "heritage / classical indian luxury",
            "Material": "Glass and metal",
            "Finish": "Antique gold",
        },
    }

    result = sanitize_public_product(source)

    assert result["tags"] == []
    assert result["specs"] == {
        "Material": "Glass and metal",
        "Finish": "Antique gold",
    }
    assert source["tags"][0] == "collection:tarangrekha"
    assert source["specs"]["Height"] == "To be confirmed before order"


def test_public_product_sanitizer_leaves_non_dict_values_unchanged():
    assert sanitize_public_product(None) is None
