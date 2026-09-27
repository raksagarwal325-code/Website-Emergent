from pathlib import Path


def test_quotation_visual_search_is_resumable_and_single_step_per_request():
    source = Path(__file__).resolve().parents[1].joinpath("server.py").read_text()

    route_start = source.index('@api.post("/admin/quotations/product-match-by-image")')
    route_end = source.index('@api.get("/admin/inquiries/{inquiry_id}/quotations")')
    route = source[route_start:route_end]

    assert "quotation_visual_search_jobs" in route
    assert '"next_offset": 0' in route
    assert "STEP 1: classify the client image only" in route
    assert "process ONE contact sheet per request" in route
    assert "FINAL STEP: rerank only the strongest candidate image" in route
    assert '"index_ready": False' in route
    assert "catalogue_signature" in route


def test_quotation_visual_search_does_not_use_local_torch_runtime():
    server = Path(__file__).resolve().parents[1].joinpath("server.py").read_text()
    requirements = Path(__file__).resolve().parents[1].joinpath("requirements.txt").read_text()

    assert "visual_embedding" not in server
    assert "torch==" not in requirements
    assert "transformers>=" not in requirements
