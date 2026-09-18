"""Validated, deterministic quotation snapshots for Admin enquiries."""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid

from fastapi import HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator


DEFAULT_QUOTATION_BUSINESS = {'name': 'SAMRAT GLASS EMPORIUM', 'address': 'Raniwala Market, Babboo Ji Ki Jeen, Firozabad - 283203', 'gstin': '09ADCFS9258D1ZS', 'whatsapp': '+91 89203 92937', 'email': 'samratglassemp@gmail.com', 'bank': 'ICICI Bank', 'branch': 'Firozabad', 'accountType': 'Current Account', 'accountNumber': '097405000031', 'ifsc': 'ICIC0000974', 'signatory': 'Rakshit Agarwal'}


class QuotationItemInput(BaseModel):
    image: Optional[str] = Field(default=None, max_length=2000)
    product_id: Optional[str] = None
    name: str = Field(min_length=1, max_length=300)
    sku: Optional[str] = Field(default=None, max_length=100)
    quantity: int = Field(default=1, ge=1, le=1000)
    unit_price: float = Field(default=0, ge=0, le=100_000_000)


class QuotationCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=200)
    customer_email: Optional[EmailStr] = None
    customer_phone: str = Field(default="", max_length=50)
    billing_address: str = Field(default="", max_length=1000)
    shipping_address: str = Field(default="", max_length=1000)
    customer_gstin: str = Field(default="", max_length=30)
    items: List[QuotationItemInput] = Field(min_length=1, max_length=100)
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
        line_total = quote_money(raw.quantity * raw.unit_price)
        subtotal = quote_money(subtotal + line_total)
        items.append({
            "product_id": raw.product_id,
            "name": raw.name.strip(),
            "sku": (raw.sku or "").strip() or None,
            "quantity": raw.quantity,
            "unit_price": quote_money(raw.unit_price),
            "line_total": line_total,
            "image": raw.image or product_images.get(raw.product_id or "") or None,
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
