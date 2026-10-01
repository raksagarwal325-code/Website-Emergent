import server


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


def _doc(**overrides):
    base = {
        "google_cid": "682987565690709677",
        "google_place_id": "ChIJqRfIkPVHdDkRreYAh5J1egk",
        "google_maps_api_key": "SECRET_KEY_VALUE",
    }
    base.update(overrides)
    return base


def test_google_reviews_diagnostic_reports_google_status_without_key(monkeypatch):
    monkeypatch.setattr(
        server.requests,
        "get",
        lambda *args, **kwargs: FakeResponse({
            "status": "REQUEST_DENIED",
            "error_message": "The provided API key is invalid.",
        }),
    )

    public, diagnostic = server._google_reviews_snapshot(_doc())

    assert public["enabled"] is False
    assert public["api_key_set"] is True
    assert diagnostic == {
        "configured": True,
        "place_id_set": True,
        "api_key_set": True,
        "http_status": 200,
        "places_status": "REQUEST_DENIED",
        "error_message": "The provided API key is invalid.",
        "rating": None,
        "total_ratings": None,
        "reviews_returned": 0,
    }
    assert "SECRET_KEY_VALUE" not in repr(diagnostic)
    assert "SECRET_KEY_VALUE" not in repr(public)


def test_google_reviews_diagnostic_reports_success_counts(monkeypatch):
    monkeypatch.setattr(
        server.requests,
        "get",
        lambda *args, **kwargs: FakeResponse({
            "status": "OK",
            "result": {
                "rating": 4.9,
                "user_ratings_total": 252,
                "url": "https://www.google.com/maps?cid=682987565690709677",
                "reviews": [
                    {"author_name": "A", "rating": 5, "text": "Excellent"},
                    {"author_name": "B", "rating": 5, "text": "Beautiful"},
                ],
            },
        }),
    )

    public, diagnostic = server._google_reviews_snapshot(_doc())

    assert public["enabled"] is True
    assert public["rating"] == 4.9
    assert public["total_ratings"] == 252
    assert len(public["reviews"]) == 2
    assert diagnostic["places_status"] == "OK"
    assert diagnostic["rating"] == 4.9
    assert diagnostic["total_ratings"] == 252
    assert diagnostic["reviews_returned"] == 2


def test_google_reviews_diagnostic_handles_missing_key_without_request(monkeypatch):
    called = False

    def fail_if_called(*args, **kwargs):
        nonlocal called
        called = True
        raise AssertionError("request must not run")

    monkeypatch.setattr(server.requests, "get", fail_if_called)

    public, diagnostic = server._google_reviews_snapshot(
        _doc(google_maps_api_key="")
    )

    assert called is False
    assert public["enabled"] is False
    assert diagnostic["configured"] is False
    assert diagnostic["api_key_set"] is False
    assert diagnostic["error_message"] == "Google Maps API key is missing"
