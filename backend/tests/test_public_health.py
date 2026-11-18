import asyncio
from unittest.mock import AsyncMock

import pytest
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient

import public_health


def build_client(command):
    class Database:
        pass

    database = Database()
    database.command = command
    router = APIRouter(prefix="/api")
    public_health.install_public_health(router, database)
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


@pytest.mark.parametrize("method", ["GET", "HEAD"])
@pytest.mark.parametrize("result,status", [({"ok": 1}, 200), ({"ok": 0}, 503)])
def test_ping_result(method, result, status):
    command = AsyncMock(return_value=result)
    with build_client(command) as client:
        response = client.request(method, "/api/health")
    assert response.status_code == status
    assert response.content == b""
    assert "no-store" in response.headers["cache-control"]
    command.assert_awaited_once_with("ping")


@pytest.mark.parametrize("method", ["GET", "HEAD"])
def test_database_failure(method):
    command = AsyncMock(side_effect=RuntimeError("private connection details"))
    with build_client(command) as client:
        response = client.request(method, "/api/health")
    assert response.status_code == 503
    assert response.content == b""


def test_timeout(monkeypatch):
    monkeypatch.setattr(public_health, "PING_TIMEOUT_SECONDS", 0.01)

    async def slow_ping(*args):
        await asyncio.sleep(10)

    with build_client(slow_ping) as client:
        response = client.head("/api/health")
    assert response.status_code == 503
    assert response.content == b""


def test_post_not_supported():
    command = AsyncMock(return_value={"ok": 1})
    with build_client(command) as client:
        response = client.post("/api/health")
    assert response.status_code == 405
    command.assert_not_awaited()
