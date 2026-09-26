import io

from PIL import Image

from image_ownership import embed_ownership_metadata, ownership_fingerprint, perceptual_distance, perceptual_fingerprint
import security_runtime


def _jpeg_bytes():
    image = Image.new("RGB", (64, 48), (120, 80, 40))
    out = io.BytesIO()
    image.save(out, format="JPEG", quality=90)
    return out.getvalue()


def _png_bytes():
    image = Image.new("RGB", (64, 48), (120, 80, 40))
    out = io.BytesIO()
    image.save(out, format="PNG")
    return out.getvalue()


def test_fingerprint_is_stable_sha256():
    data = b"samrat-original-image"
    first = ownership_fingerprint(data)
    second = ownership_fingerprint(data)
    assert first == second
    assert len(first) == 64


def test_jpeg_gets_copyright_and_asset_metadata():
    source = _jpeg_bytes()
    fp = ownership_fingerprint(source)
    stamped = embed_ownership_metadata(
        source,
        content_type="image/jpeg",
        asset_id="asset-123",
        fingerprint=fp,
    )
    with Image.open(io.BytesIO(stamped)) as image:
        exif = image.getexif()
        assert exif.get(315) == "Samrat Glass Emporium"
        assert "Samrat Glass Emporium" in exif.get(33432, "")
        assert "asset-123" in exif.get(270, "")
        assert fp in exif.get(270, "")


def test_png_gets_invisible_text_metadata():
    source = _png_bytes()
    fp = ownership_fingerprint(source)
    stamped = embed_ownership_metadata(
        source,
        content_type="image/png",
        asset_id="asset-456",
        fingerprint=fp,
    )
    with Image.open(io.BytesIO(stamped)) as image:
        assert image.info.get("Author") == "Samrat Glass Emporium"
        assert image.info.get("SGEAssetID") == "asset-456"
        assert image.info.get("SGEFingerprint") == f"sha256:{fp}"


def test_hotlink_policy_allows_own_site_and_discovery_referrers():
    assert security_runtime._hotlink_referrer_allowed(None)
    assert security_runtime._hotlink_referrer_allowed("https://samratglass.com/product/test")
    assert security_runtime._hotlink_referrer_allowed("https://www.google.co.in/search?q=chandelier")
    assert security_runtime._hotlink_referrer_allowed("https://images.google.com/")


def test_hotlink_policy_blocks_unrelated_website_referrer():
    assert not security_runtime._hotlink_referrer_allowed(
        "https://copycat-lighting.example/product/123"
    )


def test_perceptual_fingerprint_survives_resize_and_recompression():
    image = Image.new("RGB", (320, 240))
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            pixels[x, y] = (
                (x * 5 + y * 2) % 256,
                (x * 3 + y * 7) % 256,
                (x + y * 4) % 256,
            )

    original = io.BytesIO()
    image.save(original, format="PNG")

    resized = image.resize((160, 120), Image.Resampling.LANCZOS)
    recompressed = io.BytesIO()
    resized.save(recompressed, format="JPEG", quality=72)

    left = perceptual_fingerprint(original.getvalue())
    right = perceptual_fingerprint(recompressed.getvalue())

    assert len(left) == 64
    assert len(right) == 64
    assert perceptual_distance(left, right) <= 12


def test_embedded_png_contains_visual_fingerprint():
    source = _png_bytes()
    exact = ownership_fingerprint(source)
    visual = perceptual_fingerprint(source)
    stamped = embed_ownership_metadata(
        source,
        content_type="image/png",
        asset_id="asset-visual",
        fingerprint=exact,
        visual_fingerprint=visual,
    )
    with Image.open(io.BytesIO(stamped)) as image:
        assert image.info.get("SGEVisualFingerprint") == f"dhash256:{visual}"
