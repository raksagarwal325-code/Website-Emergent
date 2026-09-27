from pathlib import Path


def _quotation_route_source():
    source = Path(__file__).resolve().parents[1].joinpath("server.py").read_text()
    route_start = source.index('@api.post("/admin/quotations/product-match-by-image")')
    route_end = source.index('@api.get("/admin/inquiries/{inquiry_id}/quotations")')
    return source[route_start:route_end]


def test_quotation_search_uses_persistent_reusable_visual_index():
    route = _quotation_route_source()

    assert "quotation_visual_index" in route
    assert "VISUAL_INDEX_VERSION" in route
    assert "describe_index_sheet" in route
    assert "analyze_query_signature" in route
    assert "visual_signature_score" in route
    assert "primary_refs" in route
    assert "missing_refs" in route
    assert '"index_kind": "reusable_catalogue"' in route
    assert "process ONE contact sheet per request" not in route


def test_quotation_index_is_incremental_per_product_image():
    route = _quotation_route_source()

    assert '"product_id": ref.get("product_id")' in route
    assert '"image_url": ref.get("url")' in route
    assert "covered_keys" in route
    assert "missing_refs" in route
    assert "catalogue_signature" in route


def test_quotation_visual_search_does_not_use_local_torch_runtime():
    server = Path(__file__).resolve().parents[1].joinpath("server.py").read_text()
    requirements = Path(__file__).resolve().parents[1].joinpath("requirements.txt").read_text()

    assert "visual_embedding" not in server
    assert "torch==" not in requirements
    assert "transformers>=" not in requirements
