from pathlib import Path


def _quotation_route_source():
    source = Path(__file__).resolve().parents[1].joinpath("server.py").read_text()
    route_start = source.index('def _build_quotation_candidate_board')
    route_end = source.index('@api.get("/admin/inquiries/{inquiry_id}/quotations")')
    return source[route_start:route_end]


def test_quotation_search_uses_two_path_design():
    route = _quotation_route_source()

    assert "perceptual_fingerprint_variants" in route
    assert '"perceptual_fingerprint": {"$exists": True, "$ne": None}' in route
    assert '"engine": "existing-perceptual-fingerprint"' in route
    assert "_discover_catalogue_candidates" in route
    assert "_verify_quotation_catalogue_candidates" in route
    assert "quotation_visual_index" not in route
    assert "describe_index_sheet" not in route
    assert "analyze_query_signature" not in route


def test_near_identical_catalogue_images_can_return_without_ai():
    route = _quotation_route_source()

    assert 'best["full_distance"] <= 18' in route
    assert 'second - best["full_distance"] >= 5' in route
    assert '"searched_images": 0' in route
    assert 'Near-identical existing catalogue photograph.' in route


def test_crop_or_whatsapp_candidates_skip_catalogue_wide_discovery():
    route = _quotation_route_source()

    assert 'row["variant_distance"] <= 34' in route
    assert 'if len(candidates) >= 6' in route
    assert 'if not candidates:' in route
    assert "Existing catalogue fingerprint candidate" in route


def test_final_verifier_uses_all_saved_images_for_shortlisted_skus():
    route = _quotation_route_source()

    assert "for image_index, image_url in enumerate(product.get(\"images\") or [])" in route
    assert "_build_quotation_candidate_board" in route
    assert "All saved product images are considered" in route
    assert "max_cells = 48" in route
    assert "A SKU may appear in several cells" in route
    assert "same_fixture_different_glass" in route
    assert 'threshold = 0.86 if relation == "same_fixture" else 0.92' in route


def test_quotation_search_has_no_heavy_local_ml_runtime():
    server = Path(__file__).resolve().parents[1].joinpath("server.py").read_text()
    requirements = Path(__file__).resolve().parents[1].joinpath("requirements.txt").read_text()

    assert "visual_embedding" not in server
    assert "torch==" not in requirements
    assert "transformers>=" not in requirements


def test_direct_fingerprint_match_groups_by_sku_and_accepts_crop_variant():
    route = _quotation_route_source()

    assert "product_fingerprint_hits" in route
    assert "variant_ranked = sorted" in route
    assert 'best["variant_distance"] <= 18' in route
    assert 'second_distance - best["variant_distance"] >= 5' in route
    assert "Existing catalogue photograph matched after crop/screenshot normalization." in route
    assert '"engine": "existing-perceptual-fingerprint"' in route


def test_nearby_fingerprint_candidates_are_product_level_not_image_level():
    route = _quotation_route_source()

    assert "row for row in variant_ranked" in route
    assert 'if row["variant_distance"] <= 34' in route
    assert "product = row[\"product\"]" in route
