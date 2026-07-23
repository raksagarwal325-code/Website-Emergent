"""
Thin wrapper over Emergent Object Storage for the Hero Slider feature.

Contract:
  * `init_storage()` — call once at FastAPI startup. Reuses `_storage_key`.
  * `put_object(path, data, content_type)` — upload bytes to storage.
  * `get_object(path)` — download bytes + content type.
  * `image_path(slide_id, ext)` — canonical path builder for hero images.

Every helper is defensive: if the storage service is unreachable or the
key is not configured, the caller sees a specific `StorageError` — and
routes upstream MUST decide whether to surface a 5xx or gracefully fall
back to the existing hero image, per the "loading fails → keep current
image" product requirement.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import requests

logger = logging.getLogger("hero_storage")

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "samrat-glass"

_storage_key: Optional[str] = None


class StorageError(RuntimeError):
    pass


def init_storage() -> str:
    """Fetch a session-scoped storage key. Cached in-process."""
    global _storage_key
    if _storage_key:
        return _storage_key
    emergent_key = os.environ.get("EMERGENT_LLM_KEY")
    if not emergent_key:
        raise StorageError("EMERGENT_LLM_KEY missing from environment")
    resp = requests.post(
        f"{STORAGE_URL}/init",
        json={"emergent_key": emergent_key},
        timeout=30,
    )
    if not resp.ok:
        raise StorageError(f"init failed: HTTP {resp.status_code}")
    _storage_key = resp.json().get("storage_key")
    if not _storage_key:
        raise StorageError("init succeeded but no storage_key returned")
    logger.info("hero_storage initialised")
    return _storage_key


def _refresh_key():
    global _storage_key
    _storage_key = None
    return init_storage()


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        key = _refresh_key()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    if not resp.ok:
        raise StorageError(f"put failed: HTTP {resp.status_code}")
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 403:
        key = _refresh_key()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    if not resp.ok:
        raise StorageError(f"get failed: HTTP {resp.status_code}")
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def image_path(slide_id: str, ext: str) -> str:
    ext = (ext or "bin").strip(".").lower()[:5]
    return f"{APP_NAME}/hero/{slide_id}.{ext}"
