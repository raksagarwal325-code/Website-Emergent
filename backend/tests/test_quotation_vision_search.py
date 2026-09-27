import io

from PIL import Image

from quotation_vision_search import SHEET_CAPACITY, build_contact_sheet


def _image_bytes(color):
    image = Image.new("RGB", (400, 500), color)
    out = io.BytesIO()
    image.save(out, format="JPEG")
    return out.getvalue()


def test_contact_sheet_labels_and_capacity():
    items = [
        {
            "image_bytes": _image_bytes((120, 80, 40)),
            "product": {"id": "p1", "name": "One"},
            "image_index": 0,
            "url": "/api/files/one.jpg",
        },
        {
            "image_bytes": _image_bytes((30, 60, 90)),
            "product": {"id": "p2", "name": "Two"},
            "image_index": 0,
            "url": "/api/files/two.jpg",
        },
    ]
    sheet, mapping = build_contact_sheet(items)
    assert sheet
    assert list(mapping.keys()) == ["C01", "C02"]
    assert mapping["C01"]["product"]["id"] == "p1"
    assert SHEET_CAPACITY == 64


def test_contact_sheet_is_valid_jpeg():
    sheet, _mapping = build_contact_sheet([
        {
            "image_bytes": _image_bytes((200, 200, 200)),
            "product": {"id": "p1"},
            "image_index": 0,
            "url": "/api/files/one.jpg",
        }
    ])
    with Image.open(io.BytesIO(sheet)) as image:
        assert image.format == "JPEG"
        assert image.width > 0
        assert image.height > 0
