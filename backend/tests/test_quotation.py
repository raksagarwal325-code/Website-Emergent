from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from quotation import QuotationCreate, build_quotation


def payload(**overrides):
    data = {
        "customer_name": "Kishor A Lalwani",
        "customer_email": "kishor@example.com",
        "customer_phone": "+919820700130",
        "items": [
            {"product_id": "wall", "name": "Wall Lantern", "sku": "SGE-WL-089", "quantity": 1, "unit_price": 6000},
            {"product_id": "candle", "name": "Candle Stand", "sku": "SGE-CS-013", "quantity": 2, "unit_price": 1700},
        ],
        "discount": 400,
        "shipping": 1000,
        "tax_rate": 18,
        "validity_days": 15,
        "terms": "Confirmed terms only.",
        "notes": "Emerald finish.",
    }
    data.update(overrides)
    return QuotationCreate(**data)


def test_build_quotation_recomputes_every_amount_server_side():
    created = datetime(2026, 9, 16, 8, 30, tzinfo=timezone.utc)
    result = build_quotation(
        "inq-1", payload(), "owner@samratglass.com",
        created_at=created, quote_id="abcdef12-0000-0000-0000-000000000000",
    )

    assert result["quote_number"] == "SGE-Q-20260916-ABCDEF"
    assert result["subtotal"] == 9400
    assert result["discount"] == 400
    assert result["shipping"] == 1000
    assert result["tax_amount"] == 1800
    assert result["total"] == 11800
    assert result["valid_until"] == "2026-10-01"
    assert result["items"][1]["line_total"] == 3400
    assert result["created_by"] == "owner@samratglass.com"


def test_discount_cannot_exceed_product_subtotal():
    with pytest.raises(HTTPException, match="Discount cannot exceed"):
        build_quotation("inq-1", payload(discount=9500), "owner@samratglass.com")


def test_quote_requires_at_least_one_valid_item():
    with pytest.raises(ValidationError):
        payload(items=[])
    with pytest.raises(ValidationError):
        payload(items=[{"name": "", "quantity": 1, "unit_price": 1}])


def test_blank_optional_email_is_allowed():
    result = build_quotation("inq-1", payload(customer_email=""), "owner@samratglass.com")
    assert result["customer_email"] is None
