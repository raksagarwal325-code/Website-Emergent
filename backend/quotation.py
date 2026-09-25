"""Validated, deterministic quotation snapshots for Admin enquiries."""
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional
import re
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


def normalise_quotation_product_name(value: str) -> str:
    """Keep AI-written variant names in one predictable customer-facing order."""
    name = quotation_text(value)
    if not name:
        return ""
    name = re.sub(r"\b(\d+)\s*[- ]?\s*(?:step|tier|layer)s?\b", r"\1-Step", name, flags=re.IGNORECASE)
    measurement = r"(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)"
    diameter_match = re.search(
        rf"(?:approx(?:imately)?\.?\s*)?{measurement}\s*(?:ft|feet|foot)\s*(?:dia(?:meter)?\.?)",
        name,
        flags=re.IGNORECASE,
    )
    height_match = re.search(
        rf"(?:approx(?:imately)?\.?\s*)?{measurement}\s*(?:ft|feet|foot)\s*(?:h(?:eight)?\.?)",
        name,
        flags=re.IGNORECASE,
    )
    if not diameter_match or not height_match:
        return name
    diameter = re.sub(r"\s+", "", diameter_match.group(1))
    height = re.sub(r"\s+", "", height_match.group(1))
    for match in sorted((diameter_match, height_match), key=lambda item: item.start(), reverse=True):
        name = f"{name[:match.start()]} {name[match.end():]}"
    name = re.sub(r"\s*[,xX]\s*(?=-|$)", " ", name)
    name = re.sub(r"(?:\s*-\s*){2,}", " - ", name)
    name = re.sub(r"\s{2,}", " ", name).strip(" ,-xX")
    return f"{name} - Approx. {diameter} ft Dia x {height} ft H"


class QuotationItemInput(BaseModel):
    line_id: Optional[str] = Field(default=None, min_length=1, max_length=100)
    image: Optional[str] = Field(default=None, max_length=2000)
    product_id: Optional[str] = None
    name: str = Field(min_length=1, max_length=300)
    name_user_edited: bool = False
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
    customisation_ai_warnings: List[str] = Field(default_factory=list, max_length=20)
    customisation_ai_prepared: bool = False
    customisation_reference_id: Optional[str] = Field(default=None, max_length=100)

    @field_validator(
        "name", "sku", "customisation_notes", "customisation_instruction",
        "customisation_ai_summary", mode="before",
    )
    @classmethod
    def _clean_item_text(cls, value):
        return quotation_text(value)

    @field_validator("customisation_ai_warnings", mode="before")
    @classmethod
    def _clean_item_warnings(cls, value):
        return [quotation_text(item) for item in (value or []) if quotation_text(item)]


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
    product_id: Optional[str] = Field(default=None, max_length=100)
    name: str = Field(min_length=1, max_length=300)
    sku: Optional[str] = Field(default=None, max_length=100)
    quantity: int = Field(default=1, ge=1, le=1000)


class QuotationAIAssistRequest(BaseModel):
    product_image_url: Optional[str] = Field(default=None, max_length=2000)
    reference_image_url: Optional[str] = Field(default=None, max_length=2000)
    # Kept for older mobile clients. It is treated as a reference image.
    image_url: Optional[str] = Field(default=None, max_length=2000)
    instruction: str = Field(min_length=3, max_length=3000)
    target_line_id: str = Field(min_length=1, max_length=100)
    items: List[QuotationAIAssistItem] = Field(min_length=1, max_length=100)

    @field_validator("product_image_url", "reference_image_url", "image_url", "instruction", mode="before")
    @classmethod
    def _clean_ai_request_text(cls, value):
        return str(value or "").strip()

    @field_validator("product_image_url", "reference_image_url", "image_url")
    @classmethod
    def _uploaded_ai_image_only(cls, value):
        if value is None or not str(value).strip():
            return None
        if not value.startswith("/api/files/"):
            raise ValueError("Quotation AI images must be uploaded before analysis.")
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
    approval_required: bool = False

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

        def customer_text(value: str) -> str:
            text = quotation_text(value)
            for index, request_item in enumerate(request.items):
                text = re.sub(
                    re.escape(request_item.line_id),
                    f"Item {index + 1}",
                    text,
                    flags=re.IGNORECASE,
                )
            return text

        self.summary = customer_text(self.summary)
        self.reference.title = customer_text(self.reference.title)
        self.reference.use_details = customer_text(self.reference.use_details)
        self.reference.exclude_details = customer_text(self.reference.exclude_details)
        self.warnings = [customer_text(warning) for warning in self.warnings]
        target = next(item for item in request.items if item.line_id == request.target_line_id)
        for item in self.item_updates:
            item.suggested_name = normalise_quotation_product_name(customer_text(item.suggested_name))
            item.customisation_notes = customer_text(item.customisation_notes)
            if item.body_basis == "match_item" and item.body_reference_line_id:
                reference_number = next(
                    index + 1
                    for index, request_item in enumerate(request.items)
                    if request_item.line_id == item.body_reference_line_id
                )
                component_rules = {
                    "glass_arms": (r"\bglass[- ]arms?\b", "clear glass arm construction"),
                    "crystal_bobeche": (r"\bbobeches?\b", "matching crystal bobeche"),
                    "crystal_drops": (r"\b(?:crystal\s+)?drops?\b", "matching crystal drops"),
                    "metal_finish": (r"\b(?:metal\s+)?finish\b", "the same metal finish"),
                }
                missing_components = [
                    label
                    for component in item.matching_components
                    for pattern, label in [component_rules[component]]
                    if not re.search(pattern, item.customisation_notes, flags=re.IGNORECASE)
                ]
                if missing_components:
                    item.customisation_notes = (
                        f"{item.customisation_notes.rstrip('.')}"
                        f". Match Item {reference_number} using {', '.join(missing_components)}."
                    )
            if target.quantity > 1 and re.search(r"\bproduce one\b", item.customisation_notes, flags=re.IGNORECASE):
                item.customisation_notes = re.sub(
                    r"\bproduce one\b",
                    "Produce a",
                    item.customisation_notes,
                    flags=re.IGNORECASE,
                )
                item.customisation_notes = f"Quantity: {target.quantity} identical units. {item.customisation_notes}"
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
            if item.unit_price <= 0:
                raise ValueError(f"Enter a price greater than zero for {item.name}.")
            if item.is_custom and item.customisation_ai_warnings:
                raise ValueError(f"Resolve the AI specification questions for {item.name} before saving.")
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
            "name_user_edited": raw.name_user_edited,
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
            "customisation_ai_warnings": list(raw.customisation_ai_warnings),
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
