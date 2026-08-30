"""Regression tests for commerce-feed access control."""

import os

import httpx


BASE = os.environ.get("BACKEND_BASE_URL", "http://localhost:8001")


def test_old_public_commerce_feed_is_not_exposed():
    response = httpx.get(f"{BASE}/api/commerce/products.csv", timeout=20)
    assert response.status_code == 404


def test_admin_commerce_feed_requires_authentication():
    response = httpx.get(f"{BASE}/api/admin/commerce/products.csv", timeout=20)
    assert response.status_code == 401
