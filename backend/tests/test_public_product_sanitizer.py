from public_product_sanitizer import (
    PUBLIC_DELIVERY_INFO,
    sanitize_public_product,
    sanitize_public_settings,
)


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


def test_public_settings_normalizes_live_delivery_and_legacy_claims_without_mutation():
    source = {
        "delivery_info": "Pan-India shipping",
        "homepage_content": {
            "collage": {
                "eyebrow": "1000+ Light Options Inside",
                "title": "1000+ Designs",
            },
            "reasons": {
                "items": [
                    {
                        "body": "Every piece is hand-blown, hand-cut and hand-assembled using time-honoured techniques."
                    },
                    {
                        "body": "Based in the City of Glass — India's spiritual home of glass-making."
                    },
                ]
            },
        },
    }

    result = sanitize_public_settings(source)

    assert result["delivery_info"] == PUBLIC_DELIVERY_INFO
    reasons = result["homepage_content"]["reasons"]["items"]
    assert reasons[0]["body"].startswith("Handcrafted and hand-assembled in Firozabad")
    assert reasons[1]["body"] == "Based in Firozabad, one of India's best-known centres for glass-making."
    assert result["homepage_content"]["collage"]["eyebrow"] == "1000+ Light Options Inside"
    assert result["homepage_content"]["collage"]["title"] == "1000+ Designs"

    # Source/Admin values stay exactly as stored.
    assert source["delivery_info"] == "Pan-India shipping"
    assert source["homepage_content"]["reasons"]["items"][0]["body"].startswith("Every piece is hand-blown")


def test_public_settings_preserves_unrelated_custom_copy():
    source = {
        "delivery_info": "Custom delivery wording",
        "homepage_content": {
            "reasons": {"items": [{"body": "Owner-authored custom statement"}]},
        },
    }

    result = sanitize_public_settings(source)

    assert result == source
    assert result is not source
