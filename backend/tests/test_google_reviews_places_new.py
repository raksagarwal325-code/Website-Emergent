"""Regression checks for the Google Reviews Places API (New) migration."""

from pathlib import Path

SERVER_SOURCE = Path(__file__).resolve().parents[1].joinpath("server.py").read_text()


def test_google_reviews_uses_places_api_new_endpoint():
    assert "https://places.googleapis.com/v1/places/{place_id}" in SERVER_SOURCE
    assert "https://maps.googleapis.com/maps/api/place/details/json" not in SERVER_SOURCE


def test_google_reviews_requests_only_required_new_place_fields():
    assert (
        '"X-Goog-FieldMask": '
        '"displayName,rating,userRatingCount,reviews,googleMapsUri"'
    ) in SERVER_SOURCE
    assert '"X-Goog-Api-Key": api_key' in SERVER_SOURCE


def test_google_reviews_maps_new_review_shape_to_existing_public_contract():
    for expected in (
        'data.get("userRatingCount")',
        'rv.get("authorAttribution")',
        'rv.get("relativePublishTimeDescription")',
        '(rv.get("text") or {}).get("text")',
        'rv.get("googleMapsUri")',
    ):
        assert expected in SERVER_SOURCE
