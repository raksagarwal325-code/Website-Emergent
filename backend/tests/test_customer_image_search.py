"""Independent public-search identity, visibility and upload-boundary tests."""
import io
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from customer_visual_features import decode_image, image_hashes, model_input, rank_images, MAX_BYTES, EMBEDDING_DIM
from customer_image_search import CustomerImageSearch, catalogue_urls, search_router


def photo(colour="gold", fmt="PNG"):
    stream = io.BytesIO()
    Image.new("RGB", (50, 80), colour).save(stream, format=fmt)
    return stream.getvalue()


def vector(axis=0):
    v = np.zeros(EMBEDDING_DIM); v[axis] = 1
    return [v.tolist(), v.tolist()]


def test_pixel_identity_survives_container_changes_but_not_colour_changes():
    png = photo()
    image = decode_image(png)
    alternate = io.BytesIO(); image.save(alternate, format="PNG", compress_level=0)
    assert image_hashes(png, image)["sha256"] != image_hashes(alternate.getvalue(), image)["sha256"]
    assert image_hashes(png, image)["pixels"] == image_hashes(alternate.getvalue(), decode_image(alternate.getvalue()))["pixels"]
    assert image_hashes(png, image)["pixels"] != image_hashes(photo("blue"), decode_image(photo("blue")))["pixels"]


def test_rank_deduplicates_products_and_never_calls_vector_similarity_exact():
    p = {"id": "a"}; q = {"id": "b"}
    rows = [{"url": "1", "sha256": "same", "vectors": vector()}, {"url": "2", "vectors": vector()}, {"url": "3", "vectors": vector()}]
    ranked = rank_images({"sha256": "same", "pixels": "x"}, vector(), rows, {"1": [p], "2": [p], "3": [q]})
    assert [(m["product"]["id"], m["match_type"]) for m in ranked] == [("a", "exact"), ("b", "similar")]


def test_unrelated_and_removed_images_do_not_become_results():
    rows = [{"url": "a", "vectors": vector(1)}, {"url": "removed", "sha256": "same"}]
    assert not rank_images({"sha256": "same", "pixels": "x"}, vector(), rows, {"a": [{"id": "a"}]})


def test_shared_exact_photo_keeps_both_products_without_claiming_unique_identity():
    result = rank_images({"sha256": "same", "pixels": "x"}, None, [{"url": "a", "sha256": "same"}], {"a": [{"id": "a"}, {"id": "b"}]})
    assert len(result) == 2
    assert all(m["match_type"] == "exact" for m in result)


def test_legacy_vectors_cannot_be_compared_with_new_model_but_hashes_still_match():
    rows = [{"url": "old", "vectors": np.ones((2, 512)).tolist()},
            {"url": "exact", "sha256": "same", "vectors": np.ones((2, 512)).tolist()}]
    result = rank_images({"sha256": "same", "pixels": "x"}, vector(), rows,
                         {"old": [{"id": "old"}], "exact": [{"id": "exact"}]})
    assert [(m["product"]["id"], m["match_type"]) for m in result] == [("exact", "exact")]


def test_preprocessing_and_invalid_inputs():
    assert model_input(decode_image(photo())).shape == (1, 3, 224, 224)
    with pytest.raises(Exception): decode_image(b"not an image")
    with pytest.raises(ValueError): decode_image(b"x" * (MAX_BYTES + 1))
    with pytest.raises(ValueError): decode_image(photo(fmt="GIF"))


@pytest.mark.asyncio
async def test_catalogue_reads_only_published_records_with_public_projection():
    class Products:
        def find(self, query, projection):
            assert query == {"status": "published", "images.0": {"$exists": True}}
            assert "admin_notes" not in projection and "price" not in projection
            return SimpleNamespace(to_list=AsyncMock(return_value=[{"id": "public", "images": ["/a"]}]))
    service = CustomerImageSearch(SimpleNamespace(products=Products()), AsyncMock())
    assert list(catalogue_urls(await service.catalogue())) == ["/a"]


@pytest.mark.asyncio
async def test_search_uses_persistent_index_without_loading_catalogue_photos_or_model():
    data = photo(); image = decode_image(data)
    load = AsyncMock(side_effect=AssertionError("query must not fetch catalogue images"))
    service = CustomerImageSearch(None, load)
    service.catalogue = AsyncMock(return_value=[{"id": "p", "name": "Light", "images": ["/a"]}])
    service.manifest = AsyncMock(return_value={"/a": "key"})
    service.rows = AsyncMock(return_value=[{"url": "/a", **image_hashes(data, image)}])
    response = await service.search(data)
    assert response["matches"][0]["match_type"] == "exact"
    assert response["similarity_available"] is False
    assert "score" not in response["matches"][0]
    load.assert_not_awaited()


def test_public_upload_endpoint_validates_type_and_size_and_runs_without_admin_session():
    service = SimpleNamespace(search=AsyncMock(return_value={"matches": []}))
    app = FastAPI(); app.include_router(search_router(service, lambda: None), prefix="/api")
    with TestClient(app) as client:
        assert client.post("/api/search/image", files={"file": ("x.svg", b"x", "image/svg+xml")}).status_code == 400
        assert client.post("/api/search/image", files={"file": ("x.png", b"x" * (MAX_BYTES + 1), "image/png")}).status_code == 413
        assert client.post("/api/search/image", files={"file": ("x.png", photo(), "image/png")}).status_code == 200
    assert service.search.await_count == 1


@pytest.mark.asyncio
async def test_replacing_stored_image_changes_its_index_key():
    files = SimpleNamespace(find=lambda *args: SimpleNamespace(to_list=AsyncMock(return_value=[{"storage_path": "light.png", "public_sha256": "old"}])))
    service = CustomerImageSearch(SimpleNamespace(files=files), AsyncMock())
    before = await service.manifest({"/api/files/light.png": []})
    files.find = lambda *args: SimpleNamespace(to_list=AsyncMock(return_value=[{"storage_path": "light.png", "public_sha256": "new"}]))
    after = await service.manifest({"/api/files/light.png": []})
    assert before != after


@pytest.mark.asyncio
async def test_refresh_indexes_new_images_and_continues_past_a_failed_image():
    from unittest.mock import Mock
    images = SimpleNamespace(update_one=AsyncMock(), delete_many=AsyncMock())
    state = SimpleNamespace(update_one=AsyncMock(return_value=SimpleNamespace(matched_count=1)))
    load = AsyncMock(side_effect=[ValueError("unavailable"), photo()])
    service = CustomerImageSearch(SimpleNamespace(customer_visual_images=images, customer_visual_state=state), load)
    service.catalogue = AsyncMock(return_value=[{"id": "p", "images": ["/bad", "/good"]}])
    service.manifest = AsyncMock(return_value={"/bad": "bad-key", "/good": "good-key"})
    service.rows = AsyncMock(return_value=[])
    service.encoder = SimpleNamespace(session=True, load=Mock(), encode=Mock(return_value=vector()))
    await service.refresh()
    assert load.await_count == 2
    writes = images.update_one.call_args_list
    assert "retry_after" in writes[0].args[1]["$set"]
    assert writes[1].args[1]["$set"]["pixels"]
    assert writes[2].args[1]["$set"]["vectors"] == vector()
    images.delete_many.assert_awaited_once_with({"_id": {"$nin": ["bad-key", "good-key"]}})


def scored_vector(score):
    v = np.zeros(EMBEDDING_DIM)
    v[0], v[1] = score, np.sqrt(1 - score ** 2)
    return [v.tolist(), v.tolist()]


def test_weaker_whole_photo_matches_are_explicitly_tentative_and_bounded():
    rows = [{"url": str(i), "vectors": scored_vector(s)}
            for i, s in enumerate([.714, .70, .69, .68, .67, .60, .54])]
    products = {r["url"]: [{"id": r["url"]}] for r in rows}
    result = rank_images({"sha256": "q", "pixels": "q"}, vector(), rows, products)
    assert [r["product"]["id"] for r in result] == ["0", "1", "2", "3"]
    assert all(r["match_type"] == "possible" for r in result)


def test_regional_match_recovers_fixture_without_promoting_weak_background_objects():
    query = vector() + vector(2)
    rows = [{"url": "fixture", "vectors": vector(2)}]
    products = {"fixture": [{"id": "fixture"}]}
    result = rank_images({"sha256": "q", "pixels": "q"}, query, rows, products)
    assert result[0]["match_type"] == "similar"
    weak = np.zeros(EMBEDDING_DIM); weak[2] = .60; weak[3] = .80
    rows[0]["vectors"] = [weak.tolist(), weak.tolist()]
    assert rank_images({"sha256": "q", "pixels": "q"}, query, rows, products) == []


def test_strong_results_suppress_tentative_fallback_and_exact_still_wins():
    rows = [{"url": "strong", "vectors": vector()},
            {"url": "weak", "vectors": scored_vector(.70)},
            {"url": "exact", "sha256": "q"}]
    products = {r["url"]: [{"id": r["url"]}] for r in rows}
    result = rank_images({"sha256": "q", "pixels": "q"}, vector(), rows, products)
    assert [(r["product"]["id"], r["match_type"]) for r in result] == [
        ("exact", "exact"), ("strong", "similar")]


@pytest.mark.asyncio
async def test_design_backfill_retains_existing_global_vectors(monkeypatch):
    from unittest.mock import Mock
    import customer_image_search as module
    images = SimpleNamespace(update_one=AsyncMock(), delete_many=AsyncMock())
    state = SimpleNamespace(update_one=AsyncMock(return_value=SimpleNamespace(matched_count=1)))
    service = CustomerImageSearch(SimpleNamespace(customer_visual_images=images, customer_visual_state=state), AsyncMock(return_value=photo()))
    service.catalogue = AsyncMock(return_value=[{"id": "p", "images": ["/a"]}])
    service.manifest = AsyncMock(return_value={"/a": "key"})
    service.rows = AsyncMock(return_value=[{"url": "/a", "vectors": vector()}])
    service.encoder = SimpleNamespace(session=True, load=Mock(), encode=Mock(side_effect=AssertionError("do not rebuild global vectors")))
    monkeypatch.setattr(module, "encode_details", lambda encoder, image: b"compact-details")
    await service.refresh()
    service.encoder.encode.assert_not_called()
    writes = images.update_one.call_args_list
    assert writes[-1].args[1]["$set"]["design_vectors"] == b"compact-details"
    assert all("retry_after" not in call.args[1].get("$set", {}) for call in writes)


@pytest.mark.asyncio
async def test_queries_exclude_detail_bytes_until_shortlist_and_keep_missing_rows():
    from unittest.mock import Mock
    collection = SimpleNamespace(find=Mock(return_value=SimpleNamespace(to_list=AsyncMock(return_value=[]))))
    service = CustomerImageSearch(SimpleNamespace(customer_visual_images=collection), AsyncMock())
    await service.rows({"/a": "a"})
    assert collection.find.call_args.args[1]["design_vectors"] == 0
    urls = {"/a": [{"id": "p"}], "/b": [{"id": "other"}]}
    result = await service.detail_rows({"/a": "a", "/b": "b"}, urls, [{"product": {"id": "p"}}])
    assert collection.find.call_args.args[0] == {"_id": {"$in": ["a"]}}
    assert result == [{"url": "/a"}]
