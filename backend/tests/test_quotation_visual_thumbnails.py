import io

from PIL import Image

from server import _quotation_visual_thumbnail


def test_catalogue_photo_is_bounded_before_full_catalogue_visual_scan():
    source = io.BytesIO()
    Image.new("RGB", (1600, 1000), (200, 100, 30)).save(source, format="PNG")

    result = _quotation_visual_thumbnail(source.getvalue())

    with Image.open(io.BytesIO(result)) as image:
        assert image.format == "JPEG"
        assert image.size == (420, 263)
        assert image.getpixel((200, 100))[0] > image.getpixel((200, 100))[2]
