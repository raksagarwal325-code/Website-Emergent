import io

from PIL import Image

from image_ownership import perceptual_fingerprint, salvage_truncated_image


def _jpeg_bytes():
    image = Image.new("RGB", (300, 420), (80, 40, 20))
    out = io.BytesIO()
    image.save(out, format="JPEG", quality=90)
    return out.getvalue()


def test_salvage_truncated_jpeg_reencodes_to_strict_valid_image():
    original = _jpeg_bytes()
    truncated = original[:-32]

    salvaged, content_type = salvage_truncated_image(truncated, "image/jpeg")

    assert content_type == "image/jpeg"
    assert salvaged
    # Strict downstream decode/fingerprint must now succeed.
    assert perceptual_fingerprint(salvaged)


def test_salvage_preserves_dimensions():
    original = _jpeg_bytes()
    truncated = original[:-24]

    salvaged, _ = salvage_truncated_image(truncated, "image/jpeg")

    with Image.open(io.BytesIO(salvaged)) as image:
        assert image.size == (300, 420)
