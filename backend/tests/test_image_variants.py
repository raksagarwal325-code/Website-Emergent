import io

from PIL import Image

import security_runtime


def test_product_variant_path_is_restricted_and_stable():
    path = "lumiere-catalog/products/abc-123.png"
    assert security_runtime._valid_product_path(path)
    assert not security_runtime._valid_product_path("lumiere-catalog/originals/abc.png")
    assert not security_runtime._valid_product_path("../secret.png")
    assert security_runtime._variant_storage_path(path, 640) == (
        "lumiere-catalog/product-variants/webp/640/abc-123.png.webp"
    )


def test_render_webp_variant_preserves_aspect_ratio_and_caps_width():
    source = Image.new("RGB", (1200, 1600), (220, 210, 200))
    buf = io.BytesIO()
    source.save(buf, format="PNG")

    rendered = security_runtime._render_webp_variant(buf.getvalue(), 640)

    with Image.open(io.BytesIO(rendered)) as result:
        assert result.format == "WEBP"
        assert result.size == (640, 853)


def test_render_webp_variant_never_upscales_small_source():
    source = Image.new("RGBA", (240, 320), (255, 255, 255, 0))
    buf = io.BytesIO()
    source.save(buf, format="PNG")

    rendered = security_runtime._render_webp_variant(buf.getvalue(), 640)

    with Image.open(io.BytesIO(rendered)) as result:
        assert result.size == (240, 320)


def test_social_preview_is_compact_jpeg_with_bounded_width():
    source = Image.new("RGB", (1254, 1254), (10, 80, 40))
    buf = io.BytesIO()
    source.save(buf, format="PNG")

    rendered = security_runtime._render_social_preview(buf.getvalue())
    with Image.open(io.BytesIO(rendered)) as result:
        assert result.format == "JPEG"
        assert result.mode == "RGB"
        assert result.size == (640, 640)
    assert len(rendered) < len(buf.getvalue())


def test_social_preview_storage_path_is_separate_from_master_and_webp_variants():
    path = "lumiere-catalog/products/example.png"
    assert security_runtime._social_preview_storage_path(path) == (
        "lumiere-catalog/product-variants/jpeg/social-640/example.png.jpg"
    )
