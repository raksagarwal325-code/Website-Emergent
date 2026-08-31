from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from security_runtime import _install_public_api_sanitization


class _AuthStub:
    async def load_admin(self, _db, request):
        return {"email": "admin@example.com"} if request.headers.get("x-test-admin") == "1" else None


def _app():
    app = FastAPI()
    server = SimpleNamespace(app=app, db=object(), _auth=_AuthStub())
    _install_public_api_sanitization(server)

    @app.get("/api/products")
    async def products():
        return {
            "items": [
                {
                    "id": "p1",
                    "name": "Test",
                    "tags": ["collection:test", "seo phrase"],
                    "specs": {
                        "Height": "To be confirmed before order",
                        "Material": "Glass",
                    },
                }
            ],
            "total": 1,
            "page": 1,
            "limit": 24,
            "total_pages": 1,
        }

    @app.get("/api/products/p1")
    async def product():
        return {
            "id": "p1",
            "name": "Test",
            "tags": ["collection:test"],
            "specs": {
                "Style": "heritage / classical indian luxury",
                "Finish": "Antique brass",
            },
        }

    @app.get("/api/settings")
    async def settings():
        return {
            "delivery_info": "Pan-India shipping",
            "homepage_content": {
                "reasons": {
                    "items": [
                        {
                            "body": "Every piece is hand-blown, hand-cut and hand-assembled using time-honoured techniques."
                        }
                    ]
                },
                "collage": {"title": "1000+ Designs"},
            },
        }

    return app


def test_anonymous_product_list_and_detail_are_sanitized():
    with TestClient(_app()) as client:
        listing = client.get("/api/products").json()
        detail = client.get("/api/products/p1").json()

    assert listing["items"][0]["tags"] == []
    assert listing["items"][0]["specs"] == {"Material": "Glass"}
    assert detail["tags"] == []
    assert detail["specs"] == {"Finish": "Antique brass"}


def test_authenticated_product_read_stays_raw_for_admin():
    with TestClient(_app()) as client:
        data = client.get("/api/products/p1", headers={"x-test-admin": "1"}).json()

    assert data["tags"] == ["collection:test"]
    assert data["specs"]["Style"] == "heritage / classical indian luxury"


def test_public_settings_are_normalized_and_1000_claim_is_preserved():
    with TestClient(_app()) as client:
        data = client.get("/api/settings").json()

    assert "Dispatch typically in 7–10 business days" in data["delivery_info"]
    assert "transit varies by destination" in data["delivery_info"]
    reason = data["homepage_content"]["reasons"]["items"][0]["body"]
    assert reason.startswith("Handcrafted and hand-assembled in Firozabad")
    assert data["homepage_content"]["collage"]["title"] == "1000+ Designs"
