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
    assert "_visually_shortlist_quotation_products" in route
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
    assert 'if not verified:' in route
    assert "Existing catalogue fingerprint candidate" in route


def test_photo_signatures_return_before_ai_and_require_selection():
    route = _quotation_route_source()
    fast = route.index("if quick:")
    discovery = route.index("candidates = await _visually_shortlist_quotation_products")
    assert fast < discovery
    assert '"engine": "photo-signature"' in route[fast:discovery]
    assert "color_histogram_distance" in route[fast:discovery]
    assert "visual_phash" in route[fast:discovery]


def test_different_angle_search_compares_actual_catalogue_photos_and_shows_reviewable_candidates():
    route = _quotation_route_source()
    assert "catalogue_photo_views(products, project_photos)" in route
    assert "compare_board(loaded[offset:offset + 32], 3)" in route
    assert '"image_bytes": thumbnail' in route
    assert "if not verified:" in route
    assert '"match_label": "candidate"' in route
    assert '"engine": "visual-catalogue-v3"' in route


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


def test_quotation_image_diagnostic_is_local_and_reports_mapping_health():
    source = Path(__file__).resolve().parents[1].joinpath("server.py").read_text()
    start = source.index('@api.post("/admin/quotations/product-match-diagnostics")')
    end = source.index('@api.post("/admin/quotations/product-match-by-image")')
    route = source[start:end]

    assert "quotation_image_index_rows" in route
    assert "fingerprinted_db_file_rows" in route
    assert "unmapped_app_owned_urls" in route
    assert "full_distance" in route
    assert "variant_distance" in route
    assert "would_enter_ai_fallback" in route
    assert "_discover_catalogue_candidates" not in route
    assert "_verify_quotation_catalogue_candidates" not in route
