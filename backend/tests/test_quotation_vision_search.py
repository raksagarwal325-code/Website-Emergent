import io

from PIL import Image

from quotation_vision_search import SHEET_CAPACITY, build_contact_sheet, normalize_visual_signature, visual_signature_score


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


def test_visual_signature_score_prefers_same_fixture_geometry():
    query = normalize_visual_signature({
        "category": "Chandelier",
        "fixture_type": "chandelier",
        "arm_count": 8,
        "light_count": 8,
        "tier_count": 2,
        "shade_count": 8,
        "glass_shape": "tulip",
        "body_shape": "central bowl",
        "frame_shape": "scroll arms",
        "crystal_layout": "basket fringe",
        "silhouette": "wide tiered",
        "distinctive_parts": ["central glass bowl", "eight scroll arms", "crystal basket"],
        "visual_tokens": ["tulip glass", "scroll arms", "basket crystal fringe"],
    })
    same = normalize_visual_signature({
        "category": "Chandelier",
        "fixture_type": "chandelier",
        "arm_count": 8,
        "light_count": 8,
        "tier_count": 2,
        "shade_count": 8,
        "glass_shape": "tulip",
        "body_shape": "central bowl",
        "frame_shape": "scroll arms",
        "crystal_layout": "basket fringe",
        "silhouette": "wide tiered",
        "distinctive_parts": ["central glass bowl", "eight scroll arms", "crystal basket"],
        "visual_tokens": ["tulip glass", "scroll arms", "basket crystal fringe"],
    })
    different = normalize_visual_signature({
        "category": "Wall Light",
        "fixture_type": "wall sconce",
        "arm_count": 2,
        "light_count": 2,
        "shade_count": 2,
        "glass_shape": "bell",
        "frame_shape": "twin curved arms",
        "silhouette": "compact wall mounted",
        "visual_tokens": ["wall sconce", "two bell shades"],
    })

    assert visual_signature_score(query, same) > 95
    assert visual_signature_score(query, same) > visual_signature_score(query, different)


def test_visual_signature_score_penalizes_count_conflicts():
    base = normalize_visual_signature({
        "category": "Chandelier",
        "fixture_type": "chandelier",
        "arm_count": 6,
        "light_count": 6,
        "visual_tokens": ["six scroll arms", "clear tulip glass"],
    })
    wrong_count = normalize_visual_signature({
        "category": "Chandelier",
        "fixture_type": "chandelier",
        "arm_count": 12,
        "light_count": 12,
        "visual_tokens": ["twelve scroll arms", "clear tulip glass"],
    })
    exact_count = normalize_visual_signature({
        "category": "Chandelier",
        "fixture_type": "chandelier",
        "arm_count": 6,
        "light_count": 6,
        "visual_tokens": ["six scroll arms", "clear tulip glass"],
    })

    assert visual_signature_score(base, exact_count) > visual_signature_score(base, wrong_count)
