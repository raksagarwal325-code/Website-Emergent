from product_upload_sop import CATEGORY_PROFILES, DIMENSION_FALLBACK, SCHEMAS, apply_owner_facts, conversation_facts, find_similar_product, normalize_ai_record, owner_facts, sop_prompt, validate_record


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


def test_duplicate_name_matching_ignores_case_punctuation_and_spacing():
    products = [{"sku": "SGE-CH-114", "name": "Rajsi Diamond-Lattice Urn-Shaped Six-Light Glass Chandelier — Gold Accents"}]
    match, score = find_similar_product("rajsi diamond lattice urn shaped six light glass chandelier gold accents", products)
    assert match["sku"] == "SGE-CH-114"
    assert score == 1.0


def test_distinct_family_variant_is_not_a_duplicate():
    products = [{"sku": "SGE-CH-114", "name": "Rajsi Diamond-Lattice Urn-Shaped Six-Light Glass Chandelier — Gold Accents"}]
    assert find_similar_product("Meher Diamond-Cut Tulip Twelve-Light Clear Glass Chandelier", products) is None


def test_owner_family_and_light_count_override_ai_inference():
    record = normalize_ai_record(_ai(), "Chandelier")
    record["name"] = "Prastara Diamond-Lattice Tulip Nine-Light Glass Chandelier"
    record["specs"]["Collection / Family"] = "Prastara"
    record["specs"]["Number of Lights"] = "9"
    corrected = apply_owner_facts(record, "Rajsi family; same as SGE-CH-050; 6 Lights")
    assert corrected["name"] == "Rajsi Diamond-Lattice Tulip Six-Light Glass Chandelier"
    assert corrected["specs"]["Collection / Family"] == "Rajsi"
    assert corrected["specs"]["Number of Lights"] == "6"


def test_owner_fact_parser_accepts_label_style_notes():
    assert owner_facts("Family: Rajsi; 6 light holders") == {"family": "Rajsi", "lights": 6}


def test_every_schema_has_an_embedded_category_profile():
    assert set(CATEGORY_PROFILES) == set(SCHEMAS)
    assert CATEGORY_PROFILES["Gate Light"]["special"].startswith("Mounting Type is required")
    assert "Candle Type" in CATEGORY_PROFILES["Candle Stand"]["special"]
    assert "Shade Type" in CATEGORY_PROFILES["Table Lamp"]["special"]


def test_prompt_embeds_global_and_category_specific_sop_controls():
    prompt = sop_prompt("Gate Light")
    assert "Owner notes are confirmed facts" in prompt
    assert "duplicate SKU, name and image use" in prompt
    assert "exactly two narrative paragraphs" in prompt
    assert "exactly 8" in prompt
    assert "Mounting Type is required" in prompt
    assert "Never claim an IP rating" in prompt
    assert ", ".join(SCHEMAS["Gate Light"]) in prompt


def test_validation_blocks_wrong_product_name_dimension_and_placeholder():
    record = normalize_ai_record(_ai(), "Chandelier", height="24", width='18"')
    record["name"] = "Rajsi [Variant]"
    record["status"] = "draft"
    errors = validate_record(record, "Chandelier")
    assert "Product name must identify the item as Chandelier" in errors
    assert "Height must include a unit or use the approved confirmation fallback" in errors
    assert "Template placeholders must be removed" in errors


def test_validation_blocks_made_to_order_as_a_factual_value():
    record = normalize_ai_record(_ai(), "Chandelier")
    record["status"] = "draft"
    record["specs"]["Height"] = "Made to Order"
    errors = validate_record(record, "Chandelier")
    assert "Made to Order cannot be used as a factual value" in errors


def test_conversation_facts_restore_confirmed_six_light_decision_from_filename():
    facts = conversation_facts(
        ["ChatGPT Image Sep 8, 2026, 05_13_43 PM.png", "ChatGPT Image Sep 8, 2026, 05_13_49 PM.png"],
        "Chandelier",
    )
    assert facts["lights"] == 6
    assert facts["source"] == "approved uploaded conversation"


def test_conversation_facts_do_not_leak_across_categories():
    assert conversation_facts(["ChatGPT Image Sep 8, 2026, 05_13_43 PM.png"], "Table Lamp") == {}


def test_unconfirmed_ai_family_is_removed_instead_of_invented():
    record = normalize_ai_record(_ai(), "Chandelier")
    record["name"] = "Meher Diamond-Cut Tulip Six-Light Glass Chandelier"
    record["specs"]["Collection / Family"] = "Meher"
    corrected = apply_owner_facts(record, "")
    assert corrected["name"] == "Diamond-Cut Tulip Six-Light Glass Chandelier"
    assert corrected["specs"]["Collection / Family"] == DIMENSION_FALLBACK


def test_long_title_may_continue_after_product_type_per_approved_sop_style():
    record = normalize_ai_record(_ai(), "Chandelier")
    record["name"] = "Diamond-Cut Tulip Chandelier — Six-Light Clear Glass"
    record["status"] = "draft"
    assert "Product name must identify the item as Chandelier" not in validate_record(record, "Chandelier")
