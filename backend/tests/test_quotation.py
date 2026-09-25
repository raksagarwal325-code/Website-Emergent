from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from quotation import QuotationAIAssistRequest, QuotationAIDraft, QuotationCreate, build_quotation, format_quotation_number


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


def test_ai_customisation_draft_accepts_known_items_and_valid_match():
    request = QuotationAIAssistRequest(
        image_url="/api/files/reference.webp",
        instruction="Use the shade on both; make the wall light match the chandelier.",
        target_line_id="wall",
        items=[{"line_id": "chandelier", "name": "Chandelier"}, {"line_id": "wall", "name": "Wall light"}],
    )
    draft = QuotationAIDraft.model_validate({
        "summary": "Use one shade reference on both products.",
        "reference": {"category": "shade_design", "title": "Star-cut shade", "applies_to": ["wall"], "use_details": "Use the star-cut pattern.", "exclude_details": "Do not copy the reference body."},
        "item_updates": [{"line_id": "wall", "body_basis": "match_item", "body_reference_line_id": "chandelier", "matching_components": ["glass_arms"], "customisation_notes": "Match the chandelier body; change shades.", "approval_required": True}],
        "warnings": [],
    }).validate_for(request)
    assert draft.reference.applies_to == ["wall"]
    assert draft.item_updates[0].body_reference_line_id == "chandelier"


def test_ai_customisation_removes_internal_ids_and_respects_multi_unit_quantity():
    request = QuotationAIAssistRequest(
        instruction="Make a matching wall light.",
        target_line_id="line-wall-private",
        items=[
            {"line_id": "line-chandelier-private", "name": "Chandelier", "quantity": 1},
            {"line_id": "line-wall-private", "name": "Wall light", "quantity": 2},
        ],
    )
    draft = QuotationAIDraft.model_validate({
        "summary": "Match line-chandelier-private.",
        "reference": {
            "category": "shade_design", "title": "Matching shade",
            "applies_to": ["line-wall-private"], "use_details": "Use line-chandelier-private as context.",
        },
        "item_updates": [{
            "line_id": "line-wall-private", "body_basis": "match_item",
            "body_reference_line_id": "line-chandelier-private",
            "customisation_notes": "Produce one single-light wall sconce to match line-chandelier-private.",
        }],
    }).validate_for(request)

    assert draft.summary == "Match Item 1."
    assert draft.reference.use_details == "Use Item 1 as context."
    assert draft.item_updates[0].customisation_notes == "Quantity: 2 identical units. Produce a single-light wall sconce to match Item 1."


def test_ai_customisation_draft_rejects_unknown_item_mapping():
    request = QuotationAIAssistRequest(
        image_url="/api/files/reference.webp",
        instruction="Use this shade.",
        target_line_id="chandelier",
        items=[{"line_id": "chandelier", "name": "Chandelier"}],
    )
    draft = QuotationAIDraft.model_validate({
        "summary": "Use the shade.",
        "reference": {"category": "shade_design", "title": "Shade", "applies_to": ["unknown"], "use_details": "Use the cut pattern."},
        "item_updates": [{"line_id": "chandelier", "customisation_notes": "Change shade only."}],
    })
    with pytest.raises(ValueError, match="unknown quotation item"):
        draft.validate_for(request)


def test_ai_customisation_allows_written_instruction_without_reference_image():
    request = QuotationAIAssistRequest(
        image_url=None,
        instruction="Make this wall light match the chandelier with glass arms and crystal drops.",
        target_line_id="wall",
        items=[{"line_id": "chandelier", "name": "Chandelier"}, {"line_id": "wall", "name": "Wall light"}],
    )
    assert request.image_url is None
    assert request.target_line_id == "wall"


def test_ai_customisation_normalises_non_breaking_hyphens_for_pdf_output():
    draft = QuotationAIDraft.model_validate({
        "summary": "Six\u2011Light chandelier",
        "reference": {"category": "shade_design", "title": "Star\u2011Etched shade", "applies_to": ["item"], "use_details": "Globe\u2011to\u2011teardrop profile."},
        "item_updates": [{"line_id": "item", "suggested_name": "Six\u2011Light Chandelier", "customisation_notes": "Use star\u2011etched glass."}],
    })
    assert draft.summary == "Six-Light chandelier"
    assert draft.reference.title == "Star-Etched shade"
    assert draft.item_updates[0].suggested_name == "Six-Light Chandelier"


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


def test_custom_image_survives_snapshot():
    result = build_quotation(None, payload(items=[{"name": "Custom", "unit_price": 6000, "image": "/api/files/custom.webp"}]), "owner@example.com")
    assert result["items"][0]["image"] == "/api/files/custom.webp"


def test_custom_product_references_survive_as_structured_snapshot():
    result = build_quotation(None, payload(
        items=[
            {
                "line_id": "chandelier", "name": "Six-Light Crystal Chandelier",
                "quantity": 1, "unit_price": 28000, "is_custom": True,
                "body_basis": "product", "customisation_notes": "Retain chandelier proportions.",
                "customisation_instruction": "Keep the body and change the shades.",
                "customisation_reference_image": "/api/files/shade-reference.webp",
                "customisation_ai_summary": "Shade change prepared.",
                "customisation_ai_prepared": True,
                },
            {
                "line_id": "wall-light", "name": "Matching Crystal Glass Wall Light",
                "quantity": 2, "unit_price": 9000, "is_custom": True,
                "body_basis": "match_item", "body_reference_line_id": "chandelier",
                "matching_components": ["glass_arms", "crystal_bobeche", "crystal_drops", "metal_finish"],
                "approval_required": True,
            },
        ],
        design_references=[{
            "id": "shade-reference", "code": "SD-01", "category": "shade_design",
            "title": "Hand-cut starburst glass-shade design", "image": "/api/files/shade-reference.webp",
            "applies_to": ["chandelier", "wall-light"],
            "use_details": "Use the starburst motifs and lower radiating cuts.",
            "exclude_details": "Do not copy the swan body, wall plate or metalwork.",
        }],
        discount=0,
    ), "owner@example.com")

    assert result["items"][1]["body_reference_line_id"] == "chandelier"
    assert result["items"][1]["matching_components"] == [
        "glass_arms", "crystal_bobeche", "crystal_drops", "metal_finish",
    ]
    assert result["items"][1]["approval_required"] is True
    assert result["items"][0]["customisation_instruction"] == "Keep the body and change the shades."
    assert result["items"][0]["customisation_ai_prepared"] is True
    assert result["design_references"][0]["code"] == "SD-01"
    assert result["design_references"][0]["applies_to"] == ["chandelier", "wall-light"]


def test_custom_reference_rejects_unknown_item_links():
    with pytest.raises(ValidationError, match="unknown item"):
        payload(
            items=[{"line_id": "item-1", "name": "Chandelier", "unit_price": 1000}],
            design_references=[{
                "id": "ref-1", "code": "SD-01", "category": "shade_design",
                "title": "Shade design", "applies_to": ["missing-item"],
            }],
        )


def test_edit_keeps_identity_and_recalculates_persisted_values():
    import ast
    import asyncio
    from pathlib import Path
    from types import SimpleNamespace
    from unittest.mock import AsyncMock
    existing = build_quotation(None, payload(), "owner@example.com", quote_number="SGE-2026-0042")
    db = SimpleNamespace(quotations=SimpleNamespace(
        find_one=AsyncMock(return_value=existing),
        update_one=AsyncMock(return_value=SimpleNamespace(matched_count=1)),
    ))
    source = ast.parse((Path(__file__).resolve().parents[1] / "server.py").read_text())
    node = next(n for n in source.body if isinstance(n, ast.AsyncFunctionDef) and n.name == "update_quotation")
    node.decorator_list = []
    node.args.defaults = []
    namespace = {"db": db, "datetime": datetime, "timezone": timezone, "QuotationCreate": QuotationCreate,
                 "_AdminUser": object, "build_quotation": build_quotation, "HTTPException": HTTPException}
    exec(compile(ast.Module(body=[node], type_ignores=[]), "server.py", "exec"), namespace)
    revised = payload(items=[{"name": "Custom", "unit_price": 500, "quantity": 2, "image": "/api/files/new.webp"}], discount=0, shipping=0, tax_rate=0)
    result = asyncio.run(namespace["update_quotation"](existing["id"], revised, SimpleNamespace(email="editor@example.com")))
    assert result["id"] == existing["id"]
    assert result["quote_number"] == existing["quote_number"]
    assert result["created_at"] == existing["created_at"]
    assert result["business"] == existing["business"]
    assert result["total"] == 1000
    assert result["items"][0]["image"] == "/api/files/new.webp"
    db.quotations.update_one.assert_awaited_once_with({"id": existing["id"]}, {"$set": result})
    db.quotations.find_one.return_value = None
    with pytest.raises(HTTPException) as error:
        asyncio.run(namespace["update_quotation"]("missing", revised, SimpleNamespace(email="editor@example.com")))
    assert error.value.status_code == 404


def test_delete_quotation_repairs_latest_inquiry_reference():
    import ast
    import asyncio
    from pathlib import Path
    from types import SimpleNamespace
    from unittest.mock import AsyncMock

    source = ast.parse((Path(__file__).resolve().parents[1] / "server.py").read_text())
    node = next(n for n in source.body if isinstance(n, ast.AsyncFunctionDef) and n.name == "delete_quotation")
    node.decorator_list = []
    node.args.defaults = []
    db = SimpleNamespace(
        quotations=SimpleNamespace(
            find_one=AsyncMock(side_effect=[
                {"inquiry_id": "inq-1"},
                {"id": "quote-older", "quote_number": "SGE-2026-0001"},
            ]),
            delete_one=AsyncMock(return_value=SimpleNamespace(deleted_count=1)),
        ),
        inquiries=SimpleNamespace(
            find_one=AsyncMock(return_value={"latest_quotation_id": "quote-latest"}),
            update_one=AsyncMock(),
        ),
    )
    namespace = {"db": db, "_AdminUser": object, "HTTPException": HTTPException}
    exec(compile(ast.Module(body=[node], type_ignores=[]), "server.py", "exec"), namespace)

    result = asyncio.run(namespace["delete_quotation"]("quote-latest", SimpleNamespace()))

    assert result == {"ok": True, "deleted": 1, "id": "quote-latest"}
    db.quotations.delete_one.assert_awaited_once_with({"id": "quote-latest"})
    db.inquiries.update_one.assert_awaited_once_with(
        {"id": "inq-1"},
        {"$set": {
            "latest_quotation_id": "quote-older",
            "latest_quotation_number": "SGE-2026-0001",
        }},
    )
