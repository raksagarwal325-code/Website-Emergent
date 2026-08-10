"""
Backend contract tests for the required Mobile / WhatsApp Number field on
lead-capture endpoints.

Covers:
  * `server_phone.normalize_phone` — accepts India-first + international
    formats, rejects invalid, normalises to E.164.
  * `ContactCreate` — new /api/contact submissions REQUIRE `phone` and
    the value is normalised at model validation time.
  * `InquiryCreate` — new /api/inquiries submissions REQUIRE
    `customer_phone` and the value is normalised at model validation time.
  * Storage-model legacy compatibility: `ContactMessage` and `Inquiry`
    still hydrate rows that have empty/missing phone (so `list_contact`
    and `list_inquiries` don't 500 on historical data).
"""
import pytest
from pydantic import ValidationError

from server import ContactCreate, ContactMessage, Inquiry, InquiryCreate
from server_phone import normalize_phone


# ------------------------------------------------------------------ helpers

BASE_CONTACT = {
    "name": "Priya",
    "email": "priya@example.com",
    "subject": "Chandelier",
    "message": "Need 3 pieces",
}

BASE_INQUIRY = {
    "customer_name": "Rahul",
    "customer_email": "rahul@example.com",
    "message": "Interested",
    "items": [],
}


# ------------------------------------------------------------------ normalizer

class TestNormalizePhone:
    def test_rejects_empty(self):
        for bad in ("", "   ", None):
            with pytest.raises(ValueError, match="required"):
                normalize_phone(bad)

    def test_rejects_non_numeric(self):
        with pytest.raises(ValueError):
            normalize_phone("hello world")

    def test_ten_digit_indian_mobile_becomes_e164(self):
        assert normalize_phone("8920392937") == "+918920392937"

    def test_plus_91_prefix_preserved(self):
        assert normalize_phone("+918920392937") == "+918920392937"

    def test_bare_91_prefix_gains_plus(self):
        assert normalize_phone("918920392937") == "+918920392937"

    def test_leading_zero_indian_mobile(self):
        assert normalize_phone("08920392937") == "+918920392937"

    def test_strips_spaces_hyphens_parens(self):
        assert normalize_phone("+91 89203-92937") == "+918920392937"
        assert normalize_phone("(892) 039-2937") == "+918920392937"

    def test_international_us(self):
        assert normalize_phone("+14155552671") == "+14155552671"

    def test_international_uk_with_spaces(self):
        assert normalize_phone("+44 20 7946 0018") == "+442079460018"

    def test_too_short_rejected(self):
        with pytest.raises(ValueError):
            normalize_phone("1234")

    def test_too_long_rejected(self):
        with pytest.raises(ValueError):
            normalize_phone("+1234567890123456")


# ------------------------------------------------------------------ ContactCreate

class TestContactCreate:
    def test_phone_is_required(self):
        with pytest.raises(ValidationError) as exc:
            ContactCreate(**BASE_CONTACT)
        assert any(err["loc"] == ("phone",) for err in exc.value.errors())

    def test_empty_phone_rejected(self):
        with pytest.raises(ValidationError):
            ContactCreate(**BASE_CONTACT, phone="")

    def test_indian_10_digit_accepted_and_normalised(self):
        model = ContactCreate(**BASE_CONTACT, phone="8920392937")
        assert model.phone == "+918920392937"

    def test_plus_91_accepted(self):
        model = ContactCreate(**BASE_CONTACT, phone="+918920392937")
        assert model.phone == "+918920392937"

    def test_international_accepted(self):
        model = ContactCreate(**BASE_CONTACT, phone="+14155552671")
        assert model.phone == "+14155552671"

    def test_junk_rejected(self):
        with pytest.raises(ValidationError):
            ContactCreate(**BASE_CONTACT, phone="not a phone")


# ------------------------------------------------------------------ InquiryCreate

class TestInquiryCreate:
    def test_customer_phone_is_required(self):
        with pytest.raises(ValidationError) as exc:
            InquiryCreate(**BASE_INQUIRY)
        assert any(err["loc"] == ("customer_phone",) for err in exc.value.errors())

    def test_indian_10_digit_accepted(self):
        m = InquiryCreate(**BASE_INQUIRY, customer_phone="8920392937")
        assert m.customer_phone == "+918920392937"

    def test_junk_rejected(self):
        with pytest.raises(ValidationError):
            InquiryCreate(**BASE_INQUIRY, customer_phone="nope")


# ------------------------------------------------------------------ Legacy compat

class TestLegacyStorageCompat:
    """Historical rows without a phone must still hydrate for the admin
    list endpoints — this is the guarantee that promised in the model
    that `list_contact` and `list_inquiries` won't 500 after this change.
    """
    def test_contact_message_accepts_missing_phone(self):
        m = ContactMessage(
            name="Legacy",
            email="legacy@example.com",
            message="pre-phone-era row",
        )
        assert m.phone == ""

    def test_contact_message_accepts_empty_phone(self):
        m = ContactMessage(
            name="Legacy",
            email="legacy@example.com",
            phone="",
            message="row",
        )
        assert m.phone == ""

    def test_inquiry_accepts_missing_customer_phone(self):
        m = Inquiry(customer_name="Legacy")
        # Default is empty string; no exception raised on hydration.
        assert m.customer_phone == ""
