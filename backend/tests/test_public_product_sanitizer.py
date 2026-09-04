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
            "Suspension Type": "Adjustable chain suspension; hanging length to be confirmed before order",
            "Holder Type": "B22 or compatible holders; confirm before order",
            "Bulb Type": "LED-compatible bulbs; confirm holder compatibility before order",
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
    assert "Suspension Type" in source["specs"]
    assert "Holder Type" in source["specs"]
    assert "Bulb Type" in source["specs"]


def test_public_product_sanitizer_removes_multiline_keyword_leak_from_copy():
    leaked_line = (
        "Tarangrekha chandelier eight-light chandelier eight-arm chandelier "
        "gold scroll glass frosted glass chandelier antique brass chandelier "
        "Firozabad handcrafted collection:tarangrekha "
        "collection-label:tarangrekha:Tarangrekha"
    )
    source = {
        "id": "product-2",
        "name": "Tarangrekha Gold-Scroll Frosted Glass Eight-Light Chandelier",
        "short_description": "A refined eight-light chandelier with frosted glass shades.",
        "description": (
            "Eight ivory frosted glass shades distribute a warm, softly diffused glow.\n\n"
            f"{leaked_line}"
        ),
        "tags": ["collection:tarangrekha"],
    }

    result = sanitize_public_product(source)

    assert result["short_description"] == source["short_description"]
    assert result["description"] == (
        "Eight ivory frosted glass shades distribute a warm, softly diffused glow."
    )
    assert "collection:" not in result["description"]
    assert "eight-arm chandelier" not in result["description"]
    # Admin/source text remains unchanged.
    assert leaked_line in source["description"]


def test_public_product_sanitizer_suppresses_single_line_metadata_only_copy():
    source = {
        "id": "product-3",
        "name": "Ratnanchal Diamond-Cut Crystal-Fringe Hanging Lantern",
        "description": (
            "Ratnanchal hanging lantern crystal fringe light diamond cut crystal "
            "teardrop crystal drops single-light lantern antique brass hanging light "
            "Firozabad handcrafted collection:ratnanchal "
            "collection-label:ratnanchal:Ratnanchal"
        ),
    }

    result = sanitize_public_product(source)

    assert result["description"] == ""
    assert "collection:" in source["description"]


def test_public_product_sanitizer_preserves_completed_prose_before_single_line_metadata_tail():
    source = {
        "id": "product-4",
        "description": (
            "Clear fluted glass creates layered reflections. "
            "Leherpushp hanging light fluted glass pendant Firozabad handcrafted "
            "collection:leherpushp collection-label:leherpushp:Leherpushp"
        ),
    }

    result = sanitize_public_product(source)

    assert result["description"] == "Clear fluted glass creates layered reflections."


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
