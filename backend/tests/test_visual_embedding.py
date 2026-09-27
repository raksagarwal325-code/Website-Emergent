import io

from PIL import Image

from visual_embedding import MODEL, cosine_similarity, image_variants, normalize_vector, prepare_image


def _webp_bytes():
    image = Image.new("RGB", (2200, 1400), (120, 80, 40))
    out = io.BytesIO()
    image.save(out, format="WEBP", quality=90)
    return out.getvalue()


def test_prepare_image_normalizes_webp_to_bounded_jpeg():
    prepared, content_type = prepare_image(_webp_bytes(), "image/webp")
    assert content_type == "image/jpeg"
    with Image.open(io.BytesIO(prepared)) as image:
        assert image.format == "JPEG"
        assert max(image.size) <= 1600


def test_normalize_vector_has_unit_length():
    vector = normalize_vector([3.0, 4.0])
    assert round(sum(value * value for value in vector), 6) == 1.0


def test_cosine_similarity_prefers_same_direction():
    query = normalize_vector([1.0, 2.0, 3.0])
    same = normalize_vector([1.0, 2.0, 3.0])
    other = normalize_vector([3.0, -2.0, 1.0])
    assert cosine_similarity(query, same) > cosine_similarity(query, other)
    assert cosine_similarity(query, same) > 0.999


def test_local_visual_model_requires_no_api_key():
    assert MODEL == "facebook/dinov2-small"


def test_query_uses_full_image_and_center_crops():
    variants = image_variants(_webp_bytes(), "image/webp")
    assert len(variants) == 3
    assert variants[1].size[0] < variants[0].size[0]
    assert variants[2].size[0] < variants[1].size[0]
