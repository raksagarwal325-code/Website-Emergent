from product_upload_sop import DIMENSION_FALLBACK, SCHEMAS, normalize_ai_record, validate_record


def _ai():
    return {
        "name": "Rajsi Diamond-Cut Clear Glass Chandelier",
        "short_description": "A suspended clear glass chandelier with diamond-cut detailing, a layered silhouette and warm reflective character for statement residential and hospitality interiors.",
        "paragraph_1": "A diamond-cut glass composition creates a layered, reflective silhouette around the central frame.",
        "paragraph_2": "Designed as a suspended centrepiece, it brings decorative focus to living, dining and hospitality spaces.",
        "key_features": [f"Verified product feature {i}" for i in range(1, 9)],
        "tags": ["chandelier", "clear glass"],
        "specs": {},
    }


def test_every_attached_sop_category_has_a_fixed_schema():
    assert {category: len(fields) for category, fields in SCHEMAS.items()} == {
        "Candle Stand": 16, "Chandelier": 18, "Floor Chandelier": 18,
        "Floor Lamp": 18, "Gate Light": 20, "Hanging Light": 18,
        "Table Chandelier": 18, "Table Lamp": 16, "Wall Light": 17,
    }


def test_normalization_enforces_order_dimensions_and_description_shape():
    record = normalize_ai_record(_ai(), "Chandelier")
    assert list(record["specs"]) == SCHEMAS["Chandelier"]
    assert record["specs"]["Height"] == DIMENSION_FALLBACK
    assert record["specs"]["Width"] == DIMENSION_FALLBACK
    assert record["description"].count("\n\n") == 2
    assert record["description"].count("\n• ") == 8
    record["status"] = "draft"
    assert validate_record(record, "Chandelier") == []


def test_missing_ai_features_block_creation_instead_of_inventing_copy():
    ai = _ai()
    ai["key_features"] = ["Only verified feature"]
    record = normalize_ai_record(ai, "Wall Light")
    record["status"] = "draft"
    assert "AI did not supply eight product-specific Key Features" in validate_record(record, "Wall Light")


def test_string_confidence_note_stays_one_complete_warning():
    ai = _ai()
    ai["confidence_notes"] = "The count of six lights is visible but should be confirmed."
    record = normalize_ai_record(ai, "Chandelier")
    assert record["confidence_notes"] == ["The count of six lights is visible but should be confirmed."]


def test_multiline_confidence_notes_become_complete_warnings():
    ai = _ai()
    ai["confidence_notes"] = "Confirm the glass colour.\nConfirm the suspension height."
    record = normalize_ai_record(ai, "Chandelier")
    assert record["confidence_notes"] == ["Confirm the glass colour.", "Confirm the suspension height."]
