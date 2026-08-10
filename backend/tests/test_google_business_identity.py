"""
Regression: Google Business Profile CID / Place ID consistency.

Previously the stored `google_cid` (16850385744624001495) pointed at a
different business than the stored `google_place_id`
(ChIJqRfIkPVHdDkRreYAh5J1egk), so the "View all reviews on Google" and
"Visit our showroom" links opened the wrong Google Maps entity, while
"Review us on Google" (which uses the Place ID) opened Samrat Glass.

This test asserts the two identifiers are mathematically consistent — the
last 8 bytes of the base64-decoded Place ID must equal the CID as an
unsigned little-endian 64-bit integer.

Also asserts the Settings model default is the reconciled value so a
fresh install (or a settings collection wipe) does not regress.
"""
import base64
import struct

from server import Settings


def _cid_from_place_id(place_id: str) -> int:
    """Decode a Google Place ID to its canonical CID."""
    pad = "=" * (-len(place_id) % 4)
    raw = base64.urlsafe_b64decode(place_id + pad)
    # The trailing 8 bytes are the CID as unsigned little-endian int64.
    return struct.unpack("<Q", raw[-8:])[0]


def test_default_google_cid_matches_default_place_id():
    """Fresh install invariant: CID must decode from Place ID."""
    defaults = Settings()
    place_id = defaults.google_place_id
    cid_str = defaults.google_cid
    assert place_id, "default google_place_id should be set"
    assert cid_str, "default google_cid should be set"

    derived = _cid_from_place_id(place_id)
    assert derived == int(cid_str), (
        f"CID/Place-ID mismatch: default CID {cid_str} should equal "
        f"{derived} derived from Place ID {place_id}"
    )


def test_default_google_maps_url_uses_correct_cid():
    """The default maps URL must embed the reconciled CID."""
    defaults = Settings()
    assert defaults.google_maps_url == (
        f"https://www.google.com/maps?cid={defaults.google_cid}"
    )


def test_samrat_glass_place_id_decodes_to_expected_cid():
    """Nail the exact business identity as verified in this session."""
    place_id = "ChIJqRfIkPVHdDkRreYAh5J1egk"
    expected_cid = 682987565690709677
    assert _cid_from_place_id(place_id) == expected_cid
