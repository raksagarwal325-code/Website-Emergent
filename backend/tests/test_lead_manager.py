from lead_manager import (
    build_unified_leads,
    duplicate_groups,
    map_legacy_status,
    normalize_email_key,
    normalize_phone_key,
)


def test_duplicate_keys_are_normalized_conservatively():
    assert normalize_phone_key("+91 98765 43210") == "9876543210"
    assert normalize_phone_key("123") == ""
    assert normalize_email_key(" SALES@Example.COM ") == "sales@example.com"


def test_legacy_closed_requires_review_without_marking_won_or_lost():
    assert map_legacy_status("new") == ("new", False)
    assert map_legacy_status("in_progress") == ("contacted", False)
    assert map_legacy_status("closed") == ("contacted", True)


def test_duplicate_groups_match_phone_or_email_and_never_self():
    leads = [
        {"id": "inquiry:1", "mobile": "+91 98765 43210", "email": "a@example.com"},
        {"id": "contact:2", "mobile": "9876543210", "email": ""},
        {"id": "manual:3", "mobile": "", "email": "A@example.com"},
        {"id": "manual:4", "mobile": "", "email": "unique@example.com"},
    ]
    result = duplicate_groups(leads)
    assert result["inquiry:1"] == ["contact:2", "manual:3"]
    assert result["contact:2"] == ["inquiry:1"]
    assert result["manual:3"] == ["inquiry:1"]
    assert result["manual:4"] == []


def test_unified_report_preserves_origins_and_applies_profile_overlay():
    inquiries = [{
        "id": "i1",
        "customer_name": "Rita",
        "customer_phone": "+919000000001",
        "customer_email": "rita@example.com",
        "message": "Need two",
        "items": [{"product_id": "p1", "name": "Lamp", "sku": "SGE-TL-001", "quantity": 2}],
        "total": 0,
        "status": "closed",
        "created_at": "2026-09-01T10:00:00+00:00",
    }]
    contacts = [{
        "id": "c1",
        "name": "Anil",
        "phone": "+919000000002",
        "email": "anil@example.com",
        "subject": "Bulk",
        "message": "Need catalogue",
        "enquiry_type": "bulk",
        "created_at": "2026-09-02T10:00:00+00:00",
    }]
    manuals = [{
        "id": "m1",
        "customer_name": "Meera",
        "mobile": "+919000000003",
        "email": "",
        "city": "Delhi",
        "source": "whatsapp",
        "message": "Shared a photo",
        "requested_products": [],
        "created_at": "2026-09-03T10:00:00+00:00",
    }]
    profiles = [{
        "lead_id": "inquiry:i1",
        "status": "qualified",
        "source": "google",
        "city": "Agra",
        "follow_up_at": "2026-09-10T09:00:00+00:00",
        "assigned_to": "Sales",
        "high_value": True,
        "estimated_value": 150000,
        "qualification": "Hotel project",
        "updated_at": "2026-09-04T10:00:00+00:00",
        "activities": [{
            "id": "a1", "type": "note", "at": "2026-09-04T10:00:00+00:00",
            "by": "admin@example.com", "text": "Called customer",
        }],
    }]

    leads = build_unified_leads(inquiries, contacts, manuals, profiles)
    by_id = {lead["id"]: lead for lead in leads}

    assert set(by_id) == {"inquiry:i1", "contact:c1", "manual:m1"}
    assert by_id["inquiry:i1"]["status"] == "qualified"
    assert by_id["inquiry:i1"]["source"] == "google"
    assert by_id["inquiry:i1"]["requested_products"][0]["quantity"] == 2
    assert by_id["inquiry:i1"]["activities"][-1]["text"] == "Called customer"
    assert by_id["contact:c1"]["source"] == "website_contact"
    assert by_id["contact:c1"]["message"] == "Bulk: Need catalogue"
    assert by_id["manual:m1"]["source"] == "whatsapp"


def test_unprofiled_legacy_closed_is_contacted_and_flagged_for_review():
    leads = build_unified_leads([{
        "id": "i1",
        "status": "closed",
        "created_at": "2026-09-01T10:00:00+00:00",
        "items": [],
    }], [], [], [])
    assert leads[0]["status"] == "contacted"
    assert leads[0]["needs_status_review"] is True
