from pathlib import Path


def _quotation_route_source():
    source = Path(__file__).resolve().parents[1].joinpath("server.py").read_text()
    route_start = source.index('async def _verify_quotation_catalogue_candidates')
    route_end = source.index('@api.get("/admin/inquiries/{inquiry_id}/quotations")')
    return source[route_start:route_end]


def test_quotation_search_reuses_existing_product_ai_catalogue_discovery():
    route = _quotation_route_source()

    assert "_discover_catalogue_candidates" in route
    assert "catalogue_manifest_row" not in route
    assert "_verify_quotation_catalogue_candidates" in route
    assert "same_fixture_different_glass" in route
    assert "Never force a" in route or "never force a" in route.lower()
    assert "quotation_visual_index" not in route
    assert "describe_index_sheet" not in route
    assert "analyze_query_signature" not in route


def test_quotation_search_verifies_only_shortlisted_candidate_images():
    route = _quotation_route_source()

    assert "if len(candidates) >= 8" in route
    assert "_resolve_product_image" in route
    assert "loaded = await asyncio.gather" in route
    assert "threshold = 0.84 if relation == \"same_fixture\" else 0.90" in route


def test_quotation_search_is_single_request_and_has_no_torch_runtime():
    server = Path(__file__).resolve().parents[1].joinpath("server.py").read_text()
    requirements = Path(__file__).resolve().parents[1].joinpath("requirements.txt").read_text()

    assert "quotation_visual_index" not in _quotation_route_source()
    assert "visual_embedding" not in server
    assert "torch==" not in requirements
    assert "transformers>=" not in requirements
