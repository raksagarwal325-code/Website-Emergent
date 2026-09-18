"""Regression coverage for the single-currency INR product contract."""

import os

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "test_currency_contract")

from server import Product, ProductCreate  # noqa: E402


BASE_PRODUCT = {
    "name": "Test Chandelier",
    "sku": "TEST-INR-001",
    "category": "Chandelier",
    "price": 20000,
}


def test_product_models_default_to_inr():
    assert Product(**BASE_PRODUCT).currency == "INR"
    assert ProductCreate(**BASE_PRODUCT).currency == "INR"


def test_product_create_normalizes_client_supplied_usd_without_converting_price():
    product = ProductCreate(**BASE_PRODUCT, currency="USD")
    assert product.currency == "INR"
    assert product.price == 20000


def test_product_response_normalizes_legacy_stored_currency():
    product = Product(**BASE_PRODUCT, currency="usd")
    assert product.currency == "INR"
    assert product.price == 20000
