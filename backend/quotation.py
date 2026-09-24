"""Validated, deterministic quotation snapshots for Admin enquiries."""
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional
import uuid

from fastapi import HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


DEFAULT_QUOTATION_BUSINESS = {'name': 'SAMRAT GLASS EMPORIUM', 'address': 'Raniwala Market, Babboo Ji Ki Jeen, Firozabad - 283203', 'gstin': '09ADCFS9258D1ZS', 'whatsapp': '+91 89203 92937', 'email': 'samratglassemp@gmail.com', 'bank': 'ICICI Bank', 'branch': 'Firozabad', 'accountType': 'Current Account', 'accountNumber': '097405000031', 'ifsc': 'ICIC0000974', 'signatory': 'Rakshit Agarwal'}


def quotation_text(value) -> str:
    """Keep AI/customer text compatible with the built-in PDF fonts."""
    return str(value or "").translate(str.maketrans({
        "\u00a0": " ", "\u00ad": "-", "\u2010": "-", "\u2011": "-",
        "\u2012": "-", "\u2013": "-", "\u2014": "-", "\u2015": "-",
        "\u2212": "-",
    })).strip()


class QuotationItemInput(BaseModel):
    line_id: Optional[str] = Field(default=None, min_length=1, max_length=100)
    image: Optional[str] = Field(default=None, max_length=2000)
    product_id: Optional[str] = None
    name: str = Field(min_length=1, max_length=300)
    sku: Optional[str] = Field(default=None, max_length=100)
    quantity: int = Field(default=1, ge=1, le=1000)
    unit_price: float = Field(default=0, ge=0, le=100_000_000)
    is_custom: bool = False
    body_basis: Literal["product", "match_item", "drawing", "drawing_pending"] = "product"
    body_reference_line_id: Optional[str] = Field(default=None, max_length=100)
    matching_components: List[Literal[
        "glass_arms", "crystal_bobeche", "crystal_drops", "metal_finish",
    ]] = Field(default_factory=list, max_length=4)
    customisation_notes: str = Field(default="", max_length=1500)
    approval_required: bool = False
    customisation_instruction: str = Field(default="", max_length=3000)
    customisation_reference_image: Optional[str] = Field(default=None, max_length=2000)
    customisation_ai_summary: str = Field(default="", max_length=1000)
    customisation_ai_prepared: bool = False
    customisation_reference_id: Optional[str] = Field(default=None, max_length=100)

    @field_validator(
        "name", "sku", "customisation_notes", "customisation_instruction",
        "customisation_ai_summary", mode="before",
    )
    @classmethod
    def _clean_item_text(cls, value):
        return quotation_text(value)


class QuotationDesignReferenceInput(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=30, pattern=r"^[A-Z0-9-]+$")
    category: Literal[
        "shade_design", "metal_finish", "crystal_arrangement",
        "body_design", "dimensions", "other",
    ] = "other"
    title: str = Field(min_length=1, max_length=200)
    image: Optional[str] = Field(default=None, max_length=2000)
    applies_to: List[str] = Field(default_factory=list, max_length=100)
    use_details: str = Field(default="", max_length=1500)
    exclude_details: str = Field(default="", max_length=1500)

    @field_validator("code", mode="before")
    @classmethod
    def _normalise_reference_code(cls, value):
        return str(value or "").strip().upper()

    @field_validator("title", "use_details", "exclude_details", mode="before")
    @classmethod
    def _clean_reference_text(cls, value):
        return quotation_text(value)


class QuotationAIAssistItem(BaseModel):
    line_id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=300)
    sku: Optional[str] = Field(default=None, max_length=100)


class QuotationAIAssistRequest(BaseModel):
    image_url: Optional[str] = Field(default=None, max_length=2000)
    instruction: str = Field(min_length=3, max_length=3000)
    target_line_id: str = Field(min_length=1, max_length=100)
    items: List[QuotationAIAssistItem] = Field(min_length=1, max_length=100)

    @field_validator("image_url", "instruction", mode="before")
    @classmethod
    def _clean_ai_request_text(cls, value):
        return str(value or "").strip()

    @field_validator("image_url")
    @classmethod
    def _uploaded_reference_only(cls, value):
        if value is None or not str(value).strip():
            return None
        if not value.startswith("/api/files/"):
            raise ValueError("Reference image must be uploaded before AI analysis.")
        return value

    @model_validator(mode="after")
    def _unique_ai_item_ids(self):
        line_ids = [item.line_id for item in self.items]
        if len(line_ids) != len(set(line_ids)):
            raise ValueError("Quotation item line IDs must be unique.")
        if self.target_line_id not in set(line_ids):
            raise ValueError("Target quotation item is not present in the request.")
        return self


class QuotationAIReferenceDraft(BaseModel):
    category: Literal[
        "shade_design", "metal_finish", "crystal_arrangement",
        "body_design", "dimensions", "other",
    ] = "other"
    title: str = Field(min_length=1, max_length=200)
    applies_to: List[str] = Field(min_length=1, max_length=100)
    use_details: str = Field(min_length=1, max_length=1500)
    exclude_details: str = Field(default="", max_length=1500)

    @field_validator("title", "use_details", "exclude_details", mode="before")
    @classmethod
    def _clean_reference_text(cls, value):
        return quotation_text(value)


class QuotationAIItemDraft(BaseModel):
    line_id: str = Field(min_length=1, max_length=100)
    suggested_name: str = Field(default="", max_length=300)
    body_basis: Literal["product", "match_item", "drawing", "drawing_pending"] = "product"
    body_reference_line_id: Optional[str] = Field(default=None, max_length=100)
    matching_components: List[Literal[
        "glass_arms", "crystal_bobeche", "crystal_drops", "metal_finish",
    ]] = Field(default_factory=list, max_length=4)
    customisation_notes: str = Field(min_length=1, max_length=1500)
    approval_required: bool = True

    @field_validator("suggested_name", "customisation_notes", mode="before")
    @classmethod
    def _clean_item_text(cls, value):
        return quotation_text(value)


class QuotationAIDraft(BaseModel):
    summary: str = Field(min_length=1, max_length=1000)
    reference: QuotationAIReferenceDraft
    item_updates: List[QuotationAIItemDraft] = Field(min_length=1, max_length=100)
    warnings: List[str] = Field(default_factory=list, max_length=20)

    @field_validator("summary", mode="before")
    @classmethod
    def _clean_ai_summary(cls, value):
        return quotation_text(value)

    @field_validator("warnings", mode="before")
    @classmethod
    def _clean_warnings(cls, value):
        return [quotation_text(item) for item in (value or [])]

    def validate_for(self, request: QuotationAIAssistRequest):
        known = {item.line_id for item in request.items}
        if any(line_id not in known for line_id in self.reference.applies_to):
            raise ValueError("AI reference points to an unknown quotation item.")
        update_ids = [item.line_id for item in self.item_updates]
        if len(update_ids) != len(set(update_ids)) or any(line_id not in known for line_id in update_ids):
            raise ValueError("AI returned invalid quotation item mappings.")
        if update_ids != [request.target_line_id]:
            raise ValueError("AI must update only the selected quotation item.")
        if self.reference.applies_to != [request.target_line_id]:
            raise ValueError("AI reference must apply only to the selected quotation item.")
        for item in self.item_updates:
            if item.body_basis == "match_item" and (
                not item.body_reference_line_id
                or item.body_reference_line_id == item.line_id
                or item.body_reference_line_id not in known
            ):
                raise ValueError("AI returned an invalid matching-product relationship.")
            if item.body_basis != "match_item":
                item.body_reference_line_id = None
                item.matching_components = []
        return self


class QuotationCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=200)
    customer_email: Optional[EmailStr] = None
    customer_phone: str = Field(default="", max_length=50)
    billing_address: str = Field(default="", max_length=1000)
    shipping_address: str = Field(default="", max_length=1000)
    customer_gstin: str = Field(default="", max_length=30)
    items: List[QuotationItemInput] = Field(min_length=1, max_length=100)
    design_references: List[QuotationDesignReferenceInput] = Field(default_factory=list, max_length=30)
    discount: float = Field(default=0, ge=0, le=100_000_000)
    shipping: float = Field(default=0, ge=0, le=100_000_000)
    tax_rate: float = Field(default=0, ge=0, le=100)
    validity_days: int = Field(default=15, ge=1, le=365)
    terms: str = Field(default="", max_length=3000)
    notes: str = Field(default="", max_length=3000)

    @field_validator(
        "customer_name", "customer_phone", "billing_address",
        "shipping_address", "customer_gstin", "terms", "notes", mode="before",
    )
    @classmethod
    def _clean_quote_text(cls, value):
        return str(value or "").strip()

    @field_validator("customer_email", mode="before")
    @classmethod
    def _blank_quote_email_to_none(cls, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        return value

    @model_validator(mode="after")
    def _validate_customisation_links(self):
        line_ids = [item.line_id for item in self.items if item.line_id]
        if len(line_ids) != len(set(line_ids)):
            raise ValueError("Quotation item line IDs must be unique.")
        codes = [reference.code for reference in self.design_references]
        if len(codes) != len(set(codes)):
            raise ValueError("Design reference codes must be unique.")
        known = set(line_ids)
        for item in self.items:
            if item.body_basis == "match_item" and (
                not item.body_reference_line_id
                or item.body_reference_line_id == item.line_id
                or item.body_reference_line_id not in known
            ):
                raise ValueError("A matching product must refer to another quotation item.")
        for reference in self.design_references:
            if not reference.applies_to:
                raise ValueError(f"Design reference {reference.code} must apply to at least one item.")
            if any(line_id not in known for line_id in reference.applies_to):
                raise ValueError(f"Design reference {reference.code} points to an unknown item.")
        return self


def quote_money(value: float) -> float:
    """Keep persisted quotation arithmetic stable to two decimal places."""
    return round(float(value or 0) + 1e-10, 2)


def format_quotation_number(year: int, sequence: int) -> str:
    """Format the owner-facing yearly quotation sequence."""
    if sequence < 1:
        raise ValueError("Quotation sequence must be positive")
    return f"SGE-{int(year):04d}-{int(sequence):04d}"


def build_quotation(
    inquiry_id: Optional[str],
    payload: QuotationCreate,
    admin_email: str,
    *,
    created_at: Optional[datetime] = None,
    quote_id: Optional[str] = None,
    quote_number: Optional[str] = None,
    product_images: Optional[dict[str, str]] = None,
    branding: Optional[dict[str, str]] = None,
    business: Optional[dict[str, str]] = None,
) -> dict:
    product_images = product_images or {}
    branding = branding or {}
    items = []
    subtotal = 0.0
    for raw in payload.items:
        line_id = raw.line_id or str(uuid.uuid4())
        line_total = quote_money(raw.quantity * raw.unit_price)
        subtotal = quote_money(subtotal + line_total)
        items.append({
            "line_id": line_id,
            "product_id": raw.product_id,
            "name": raw.name.strip(),
            "sku": (raw.sku or "").strip() or None,
            "quantity": raw.quantity,
            "unit_price": quote_money(raw.unit_price),
            "line_total": line_total,
            "image": raw.image or product_images.get(raw.product_id or "") or None,
            "is_custom": raw.is_custom,
            "body_basis": raw.body_basis,
            "body_reference_line_id": raw.body_reference_line_id,
            "matching_components": list(raw.matching_components),
            "customisation_notes": raw.customisation_notes,
            "approval_required": raw.approval_required,
            "customisation_instruction": raw.customisation_instruction,
            "customisation_reference_image": raw.customisation_reference_image,
            "customisation_ai_summary": raw.customisation_ai_summary,
            "customisation_ai_prepared": raw.customisation_ai_prepared,
            "customisation_reference_id": raw.customisation_reference_id,
        })

    discount = quote_money(payload.discount)
    shipping = quote_money(payload.shipping)
    if discount > subtotal:
        raise HTTPException(422, "Discount cannot exceed the product subtotal.")
    taxable_amount = quote_money(subtotal - discount + shipping)
    tax_amount = quote_money(taxable_amount * payload.tax_rate / 100)
    created = created_at or datetime.now(timezone.utc)
    identifier = quote_id or str(uuid.uuid4())
    return {
        "id": identifier,
        "quote_number": quote_number or f"SGE-Q-{created:%Y%m%d}-{identifier[:6].upper()}",
        "inquiry_id": inquiry_id,
        "customer_name": payload.customer_name.strip(),
        "customer_email": str(payload.customer_email) if payload.customer_email else None,
        "customer_phone": payload.customer_phone.strip(),
        "billing_address": payload.billing_address,
        "shipping_address": payload.shipping_address,
        "customer_gstin": payload.customer_gstin,
        "items": items,
        "design_references": [reference.model_dump() for reference in payload.design_references],
        "subtotal": subtotal,
        "discount": discount,
        "shipping": shipping,
        "tax_rate": quote_money(payload.tax_rate),
        "tax_amount": tax_amount,
        "total": quote_money(taxable_amount + tax_amount),
        "validity_days": payload.validity_days,
        "valid_until": (created.date() + timedelta(days=payload.validity_days)).isoformat(),
        "terms": payload.terms,
        "notes": payload.notes,
        "business": {**DEFAULT_QUOTATION_BUSINESS, **(business or {})},
        "signature_url": branding.get("signature_url") or None,
        "stamp_url": branding.get("stamp_url") or None,
        "status": "draft",
        "created_by": admin_email,
        "created_at": created.isoformat(),
    }
