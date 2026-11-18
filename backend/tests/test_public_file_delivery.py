"""Unit coverage for public file delivery without touching object storage."""
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException
from starlette.requests import Request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def request(etag=""):
    return Request({"type": "http", "headers": [(b"if-none-match", etag.encode())]})


@pytest.mark.asyncio
async def test_file_etag_revalidation_and_replacement(monkeypatch):
    import server
    record = AsyncMock(return_value={"public_sha256": "a" * 64, "content_type": "image/png"})
    monkeypatch.setattr(server, "db", SimpleNamespace(files=SimpleNamespace(find_one=record)))
    read = Mock(return_value=(b"image", "image/png"))
    monkeypatch.setattr(server, "get_object", read)
    first = await server.serve_file("test/products/x.png", request())
    assert first.status_code == 200 and first.headers["etag"] == '"' + "a" * 64 + '"'
    same = await server.serve_file("test/products/x.png", request("W/" + first.headers["etag"]))
    assert same.status_code == 304 and same.body == b""
    assert read.call_count == 1
    record.return_value = {"public_sha256": "b" * 64}
    changed = await server.serve_file("test/products/x.png", request(first.headers["etag"]))
    assert changed.status_code == 200 and changed.headers["etag"] != first.headers["etag"]
    assert read.call_count == 2


@pytest.mark.asyncio
async def test_private_original_rejected_before_conditional_response(monkeypatch):
    import server
    read = Mock()
    monkeypatch.setattr(server, "get_object", read)
    with pytest.raises(HTTPException) as exc:
        await server.serve_file("test/products/originals/x.png", request('"'+ "a"*64 + '"'))
    assert exc.value.status_code == 404
    read.assert_not_called()
