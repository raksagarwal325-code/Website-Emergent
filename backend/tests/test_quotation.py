from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from quotation import QuotationCreate, build_quotation, format_quotation_number


def payload(**overrides):
    data = {
        "customer_name": "Kishor A Lalwani",
        "customer_email": "kishor@example.com",
        "customer_phone": "+919820700130",
        "billing_address": "Raniwala Market, Firozabad",
        "shipping_address": "Same as billing address",
        "customer_gstin": "09ADCFS9258D1ZS",
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
        quote_number="SGE-2026-0041",
        product_images={"wall": "https://cdn.example/wall.webp"},
        branding={
            "signature_url": "/api/files/signature.png",
            "stamp_url": "/api/files/stamp.png",
        },
    )

    assert result["quote_number"] == "SGE-2026-0041"
    assert result["subtotal"] == 9400
    assert result["discount"] == 400
    assert result["shipping"] == 1000
    assert result["tax_amount"] == 1800
    assert result["total"] == 11800
    assert result["valid_until"] == "2026-10-01"
    assert result["items"][1]["line_total"] == 3400
    assert result["items"][0]["image"] == "https://cdn.example/wall.webp"
    assert result["items"][1]["image"] is None
    assert result["created_by"] == "owner@samratglass.com"
    assert result["billing_address"] == "Raniwala Market, Firozabad"
    assert result["shipping_address"] == "Same as billing address"
    assert result["customer_gstin"] == "09ADCFS9258D1ZS"
    assert result["signature_url"] == "/api/files/signature.png"
    assert result["stamp_url"] == "/api/files/stamp.png"


def test_yearly_quotation_number_has_four_digit_sequence():
    assert format_quotation_number(2026, 1) == "SGE-2026-0001"
    assert format_quotation_number(2026, 41) == "SGE-2026-0041"
    with pytest.raises(ValueError, match="positive"):
        format_quotation_number(2026, 0)


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


def test_standalone_quote_snapshots_editable_business_details():
    details = {"accountNumber": "001234567890", "bank": "Edited Bank"}
    result = build_quotation(None, payload(), "owner@example.com", business=details)
    details["accountNumber"] = "changed later"
    assert result["inquiry_id"] is None
    assert result["business"]["accountNumber"] == "001234567890"
    assert result["business"]["bank"] == "Edited Bank"
    assert build_quotation(None, payload(), "owner@example.com")["business"]["accountNumber"] == "097405000031"


def test_standalone_create_uses_shared_sequence_and_does_not_mutate_inquiries():
    import ast
    import asyncio
    from pathlib import Path
    from types import SimpleNamespace
    from unittest.mock import AsyncMock

    source = ast.parse((Path(__file__).resolve().parents[1] / "server.py").read_text())
    node = next(n for n in source.body if isinstance(n, ast.AsyncFunctionDef) and n.name == "_create_quotation")
    db = SimpleNamespace(
        settings=SimpleNamespace(find_one=AsyncMock(return_value={"quotation_business": {"accountNumber": "001234"}})),
        quotations=SimpleNamespace(insert_one=AsyncMock()),
        inquiries=SimpleNamespace(find_one=AsyncMock(), update_one=AsyncMock()),
    )
    sequence = AsyncMock(return_value="SGE-2026-0042")
    namespace = {"db": db, "datetime": datetime, "timezone": timezone,
                 "_next_quotation_number": sequence, "build_quotation": build_quotation, "HTTPException": HTTPException}
    exec(compile(ast.Module(body=[node], type_ignores=[]), "server.py", "exec"), namespace)
    data = payload(items=[{"name": "Custom shade", "quantity": 1, "unit_price": 500}], discount=0)
    result = asyncio.run(namespace["_create_quotation"](None, data, SimpleNamespace(email="owner@example.com")))
    assert result["quote_number"] == "SGE-2026-0042"
    assert result["business"]["accountNumber"] == "001234"
    db.quotations.insert_one.assert_awaited_once()
    db.inquiries.find_one.assert_not_awaited()
    db.inquiries.update_one.assert_not_awaited()
