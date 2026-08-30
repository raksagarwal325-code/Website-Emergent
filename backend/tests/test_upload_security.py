import io

import pytest
from PIL import Image
from starlette.applications import Starlette
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import PlainTextResponse
from starlette.testclient import TestClient

from upload_security import configured_cors_origins, validate_upload_bytes


def _png_bytes() -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (2, 2), (255, 255, 255)).save(output, format="PNG")
    return output.getvalue()


def test_valid_png_is_verified_from_real_bytes():
    assert validate_upload_bytes(_png_bytes(), "image/png") == "image/png"


def test_spoofed_image_mime_is_rejected():
    with pytest.raises(ValueError, match="does not match"):
        validate_upload_bytes(_png_bytes(), "image/jpeg")


def test_polyglot_trailing_payload_is_rejected():
    payload = _png_bytes() + b"<script>alert(1)</script>"
    with pytest.raises(ValueError, match="trailing|malformed"):
        validate_upload_bytes(payload, "image/png")


def test_fake_video_bytes_are_rejected():
    with pytest.raises(ValueError, match="does not match"):
        validate_upload_bytes(b"not-an-mp4-at-all", "video/mp4")


def test_cors_origins_are_static_exact_production_origins():
    assert configured_cors_origins() == [
        "https://samratglass.com",
        "https://www.samratglass.com",
    ]


def test_untrusted_origin_fails_credentialed_cors_preflight():
    inner = Starlette()

    @inner.route("/")
    async def homepage(_request):
        return PlainTextResponse("ok")

    app = CORSMiddleware(
        inner,
        allow_credentials=True,
        allow_origins=configured_cors_origins(),
        allow_origin_regex=None,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    )
    client = TestClient(app)
    response = client.options(
        "/",
        headers={
            "Origin": "https://attacker.preview.emergentagent.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 400
    assert response.headers.get("access-control-allow-origin") is None
