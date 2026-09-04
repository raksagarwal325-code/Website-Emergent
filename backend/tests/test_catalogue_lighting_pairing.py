from catalogue_lighting import apply_catalogue_light_pairing


def test_two_image_create_auto_pairs_on_then_off():
    data = apply_catalogue_light_pairing({"images": ["black.png", "white.png"]})
    assert data["catalog_image_on"] == "black.png"
    assert data["catalog_image_off"] == "white.png"


def test_one_image_create_does_not_guess_pair():
    data = apply_catalogue_light_pairing({"images": ["only.png"]})
    assert data["catalog_image_on"] is None
    assert data["catalog_image_off"] is None


def test_three_image_create_does_not_guess_pair():
    data = apply_catalogue_light_pairing({"images": ["a.png", "b.png", "c.png"]})
    assert data["catalog_image_on"] is None
    assert data["catalog_image_off"] is None


def test_explicit_admin_pair_wins():
    data = apply_catalogue_light_pairing(
        {
            "images": ["black.png", "white.png", "detail.png"],
            "catalog_image_on": "detail.png",
            "catalog_image_off": "white.png",
        },
        explicit_fields={"catalog_image_on", "catalog_image_off"},
    )
    assert data["catalog_image_on"] == "detail.png"
    assert data["catalog_image_off"] == "white.png"


def test_auto_pair_tracks_changed_two_image_gallery_on_update():
    existing = {
        "images": ["old-black.png", "old-white.png"],
        "catalog_image_on": "old-black.png",
        "catalog_image_off": "old-white.png",
    }
    data = apply_catalogue_light_pairing(
        {"images": ["new-black.png", "new-white.png"]},
        existing=existing,
    )
    assert data["catalog_image_on"] == "new-black.png"
    assert data["catalog_image_off"] == "new-white.png"


def test_manual_nonstandard_pair_is_preserved_on_update():
    existing = {
        "images": ["black.png", "white.png", "detail.png"],
        "catalog_image_on": "detail.png",
        "catalog_image_off": "white.png",
    }
    data = apply_catalogue_light_pairing(
        {"images": ["black2.png", "white2.png", "detail2.png"]},
        existing=existing,
    )
    assert data["catalog_image_on"] == "detail.png"
    assert data["catalog_image_off"] == "white.png"


def test_explicit_clear_is_honoured():
    existing = {
        "images": ["black.png", "white.png"],
        "catalog_image_on": "black.png",
        "catalog_image_off": "white.png",
    }
    data = apply_catalogue_light_pairing(
        {
            "images": ["black.png", "white.png"],
            "catalog_image_on": None,
        },
        existing=existing,
        explicit_fields={"catalog_image_on"},
    )
    assert data["catalog_image_on"] is None
    assert data["catalog_image_off"] == "white.png"
