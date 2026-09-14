"""Unified, backwards-compatible lead manager.

Existing cart enquiries and contact messages remain in their original
collections. CRM fields live in lead_profiles, keyed by a stable prefixed ID,
and manual/WhatsApp leads live in manual_leads.
"""
import re
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator


LeadStatus = Literal["new", "contacted", "qualified", "quote_sent", "won", "lost"]
LeadSource = Literal[
    "website_cart", "website_contact", "whatsapp", "google", "instagram",
    "pinterest", "referral", "walk_in", "manual", "other",
]
LEAD_STATUSES = ["new", "contacted", "qualified", "quote_sent", "won", "lost"]
LEAD_SOURCES = [
    "website_cart", "website_contact", "whatsapp", "google", "instagram",
    "pinterest", "referral", "walk_in", "manual", "other",
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_phone_key(value: str) -> str:
    """Return a conservative duplicate-detection key, never a display value."""
    digits = re.sub(r"\D", "", str(value or ""))
    return digits[-10:] if len(digits) >= 10 else ""


def normalize_email_key(value: str) -> str:
    value = str(value or "").strip().lower()
    return value if "@" in value else ""


def map_legacy_status(value: str) -> tuple[str, bool]:
    """Map the old 3-state enquiry workflow without inventing a sale result."""
    value = str(value or "new").strip().lower()
    if value == "new":
        return "new", False
    if value == "in_progress":
        return "contacted", False
    if value == "closed":
        return "contacted", True
    if value in LEAD_STATUSES:
        return value, False
    return "new", True


def duplicate_groups(leads: list[dict]) -> dict[str, list[str]]:
    """Return lead-id -> matching lead IDs using phone or email."""
    buckets: dict[str, set[str]] = {}
    for lead in leads:
        lead_id = lead["id"]
        phone = normalize_phone_key(lead.get("mobile", ""))
        email = normalize_email_key(lead.get("email", ""))
        for key in ([f"p:{phone}"] if phone else []) + ([f"e:{email}"] if email else []):
            buckets.setdefault(key, set()).add(lead_id)

    result: dict[str, set[str]] = {lead["id"]: set() for lead in leads}
    for ids in buckets.values():
        if len(ids) < 2:
            continue
        for lead_id in ids:
            result[lead_id].update(ids - {lead_id})
    return {key: sorted(value) for key, value in result.items()}


class RequestedProduct(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str = ""
    name: str = ""
    sku: str = ""
    quantity: int = Field(default=1, ge=1, le=10000)


class ManualLeadCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    customer_name: str = Field(min_length=2, max_length=120)
    mobile: str = Field(default="", max_length=40)
    email: str = Field(default="", max_length=254)
    city: str = Field(default="", max_length=100)
    source: LeadSource = "whatsapp"
    message: str = Field(default="", max_length=5000)
    requested_products: list[RequestedProduct] = Field(default_factory=list, max_length=100)
    follow_up_at: Optional[str] = None
    assigned_to: str = Field(default="", max_length=120)
    high_value: bool = False
    estimated_value: Optional[float] = Field(default=None, ge=0)

    @field_validator("customer_name", "mobile", "email", "city", "message", "assigned_to", mode="before")
    @classmethod
    def clean_text(cls, value):
        return str(value or "").strip()

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        if value and ("@" not in value or "." not in value.rsplit("@", 1)[-1]):
            raise ValueError("Enter a valid email address")
        return value.lower()

    @field_validator("mobile")
    @classmethod
    def require_contact_method(cls, value):
        return value


class LeadUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Optional[LeadStatus] = None
    city: Optional[str] = Field(default=None, max_length=100)
    source: Optional[LeadSource] = None
    follow_up_at: Optional[str] = None
    assigned_to: Optional[str] = Field(default=None, max_length=120)
    high_value: Optional[bool] = None
    estimated_value: Optional[float] = Field(default=None, ge=0)
    qualification: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("city", "assigned_to", "qualification", mode="before")
    @classmethod
    def clean_optional_text(cls, value):
        return None if value is None else str(value).strip()


class LeadNoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    note: str = Field(min_length=1, max_length=5000)

    @field_validator("note", mode="before")
    @classmethod
    def clean_note(cls, value):
        return str(value or "").strip()


def _base_activity(lead: dict) -> dict:
    return {
        "id": f"origin:{lead['id']}",
        "type": "received",
        "at": lead.get("created_at") or utc_now_iso(),
        "by": "Website" if lead["origin_type"] != "manual" else "Admin",
        "text": lead.get("message") or "Lead created",
    }


def build_unified_leads(
    inquiries: list[dict],
    contacts: list[dict],
    manuals: list[dict],
    profiles: list[dict],
) -> list[dict]:
    profile_map = {row.get("lead_id"): row for row in profiles if row.get("lead_id")}
    leads: list[dict] = []

    for row in inquiries:
        origin_id = str(row.get("id") or "")
        if not origin_id:
            continue
        legacy_status, review = map_legacy_status(row.get("status"))
        items = []
        for item in row.get("items") or []:
            if not isinstance(item, dict):
                continue
            items.append({
                "product_id": str(item.get("product_id") or ""),
                "name": str(item.get("name") or ""),
                "sku": str(item.get("sku") or ""),
                "quantity": max(1, int(item.get("quantity") or 1)),
            })
        leads.append({
            "id": f"inquiry:{origin_id}",
            "origin_type": "inquiry",
            "origin_id": origin_id,
            "customer_name": str(row.get("customer_name") or "").strip(),
            "mobile": str(row.get("customer_phone") or "").strip(),
            "email": str(row.get("customer_email") or "").strip().lower(),
            "message": str(row.get("message") or "").strip(),
            "requested_products": items,
            "website_total": float(row.get("total") or 0),
            "created_at": row.get("created_at") or "",
            "default_status": legacy_status,
            "default_source": "website_cart",
            "legacy_status": row.get("status") or "new",
            "needs_status_review": review,
        })

    for row in contacts:
        origin_id = str(row.get("id") or "")
        if not origin_id:
            continue
        subject = str(row.get("subject") or "").strip()
        message = str(row.get("message") or "").strip()
        leads.append({
            "id": f"contact:{origin_id}",
            "origin_type": "contact",
            "origin_id": origin_id,
            "customer_name": str(row.get("name") or "").strip(),
            "mobile": str(row.get("phone") or "").strip(),
            "email": str(row.get("email") or "").strip().lower(),
            "message": f"{subject}: {message}".strip(": "),
            "requested_products": [],
            "website_total": 0,
            "created_at": row.get("created_at") or "",
            "default_status": "new",
            "default_source": "website_contact",
            "legacy_status": "",
            "needs_status_review": False,
            "enquiry_type": row.get("enquiry_type") or "general",
        })

    for row in manuals:
        origin_id = str(row.get("id") or "")
        if not origin_id:
            continue
        leads.append({
            "id": f"manual:{origin_id}",
            "origin_type": "manual",
            "origin_id": origin_id,
            "customer_name": str(row.get("customer_name") or "").strip(),
            "mobile": str(row.get("mobile") or "").strip(),
            "email": str(row.get("email") or "").strip().lower(),
            "message": str(row.get("message") or "").strip(),
            "requested_products": row.get("requested_products") or [],
            "website_total": 0,
            "created_at": row.get("created_at") or "",
            "default_status": "new",
            "default_source": row.get("source") or "manual",
            "legacy_status": "",
            "needs_status_review": False,
        })

    for lead in leads:
        profile = profile_map.get(lead["id"], {})
        lead["status"] = profile.get("status") or lead.pop("default_status")
        lead["source"] = profile.get("source") or lead.pop("default_source")
        lead["city"] = profile.get("city") or ""
        lead["follow_up_at"] = profile.get("follow_up_at")
        lead["assigned_to"] = profile.get("assigned_to") or ""
        lead["high_value"] = bool(profile.get("high_value", False))
        lead["estimated_value"] = profile.get("estimated_value")
        lead["qualification"] = profile.get("qualification") or ""
        lead["updated_at"] = profile.get("updated_at") or lead["created_at"]
        activities = [_base_activity(lead)] + list(profile.get("activities") or [])
        activities.sort(key=lambda item: str(item.get("at") or ""))
        lead["activities"] = activities
        lead["last_activity_at"] = activities[-1]["at"] if activities else lead["created_at"]

    matches = duplicate_groups(leads)
    for lead in leads:
        lead["duplicate_lead_ids"] = matches.get(lead["id"], [])
        lead["possible_duplicate"] = bool(lead["duplicate_lead_ids"])

    leads.sort(key=lambda item: str(item.get("updated_at") or item.get("created_at") or ""), reverse=True)
    return leads


async def _lead_exists(db, lead_id: str) -> bool:
    if ":" not in lead_id:
        return False
    prefix, origin_id = lead_id.split(":", 1)
    collection = {
        "inquiry": db.inquiries,
        "contact": db.contact_messages,
        "manual": db.manual_leads,
    }.get(prefix)
    if collection is None or not origin_id:
        return False
    return bool(await collection.find_one({"id": origin_id}, {"_id": 1}))


def install_lead_manager(api, db, require_admin):
    @api.get("/admin/leads")
    async def list_admin_leads(admin=Depends(require_admin)):
        inquiries = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
        contacts = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
        manuals = await db.manual_leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
        profiles = await db.lead_profiles.find({}, {"_id": 0}).to_list(15000)
        leads = build_unified_leads(inquiries, contacts, manuals, profiles)
        now = datetime.now(timezone.utc)
        open_leads = [row for row in leads if row["status"] not in ("won", "lost")]
        overdue = 0
        for row in open_leads:
            try:
                due = datetime.fromisoformat(str(row.get("follow_up_at") or "").replace("Z", "+00:00"))
                overdue += int(due < now)
            except (TypeError, ValueError):
                pass
        return {
            "leads": leads,
            "summary": {
                "total": len(leads),
                "open": len(open_leads),
                "overdue": overdue,
                "high_value": sum(1 for row in open_leads if row["high_value"]),
                "possible_duplicates": sum(1 for row in leads if row["possible_duplicate"]),
            },
            "statuses": LEAD_STATUSES,
            "sources": LEAD_SOURCES,
        }

    @api.post("/admin/leads")
    async def create_admin_lead(payload: ManualLeadCreate, admin=Depends(require_admin)):
        if not payload.mobile and not payload.email:
            raise HTTPException(status_code=422, detail="Mobile or email is required")
        created_at = utc_now_iso()
        row = payload.model_dump()
        follow_up_at = row.pop("follow_up_at", None)
        assigned_to = row.pop("assigned_to", "")
        high_value = row.pop("high_value", False)
        estimated_value = row.pop("estimated_value", None)
        row.update({"id": str(uuid.uuid4()), "created_at": created_at, "created_by": admin.email})
        await db.manual_leads.insert_one(row)
        lead_id = f"manual:{row['id']}"
        profile = {
            "lead_id": lead_id,
            "status": "new",
            "source": row["source"],
            "city": row.get("city", ""),
            "follow_up_at": follow_up_at,
            "assigned_to": assigned_to,
            "high_value": high_value,
            "estimated_value": estimated_value,
            "qualification": "",
            "activities": [],
            "updated_at": created_at,
            "updated_by": admin.email,
        }
        await db.lead_profiles.insert_one(profile)
        return {"ok": True, "lead_id": lead_id}

    @api.patch("/admin/leads/{lead_id}")
    async def update_admin_lead(lead_id: str, payload: LeadUpdate, admin=Depends(require_admin)):
        if not await _lead_exists(db, lead_id):
            raise HTTPException(status_code=404, detail="Lead not found")
        changes = payload.model_dump(exclude_unset=True)
        if not changes:
            return {"ok": True, "lead_id": lead_id}
        previous = await db.lead_profiles.find_one({"lead_id": lead_id}, {"_id": 0}) or {}
        updated_at = utc_now_iso()
        set_fields = {**changes, "updated_at": updated_at, "updated_by": admin.email}
        change_labels = []
        for key, value in changes.items():
            old = previous.get(key)
            if old != value:
                change_labels.append(f"{key.replace('_', ' ')}: {old or '—'} → {value or '—'}")
        update = {"$set": set_fields, "$setOnInsert": {"lead_id": lead_id}}
        if change_labels:
            update["$push"] = {"activities": {
                "id": str(uuid.uuid4()),
                "type": "updated",
                "at": updated_at,
                "by": admin.email,
                "text": "; ".join(change_labels),
            }}
        await db.lead_profiles.update_one({"lead_id": lead_id}, update, upsert=True)
        return {"ok": True, "lead_id": lead_id}

    @api.post("/admin/leads/{lead_id}/notes")
    async def add_admin_lead_note(lead_id: str, payload: LeadNoteCreate, admin=Depends(require_admin)):
        if not await _lead_exists(db, lead_id):
            raise HTTPException(status_code=404, detail="Lead not found")
        updated_at = utc_now_iso()
        activity = {
            "id": str(uuid.uuid4()),
            "type": "note",
            "at": updated_at,
            "by": admin.email,
            "text": payload.note,
        }
        await db.lead_profiles.update_one(
            {"lead_id": lead_id},
            {
                "$set": {"updated_at": updated_at, "updated_by": admin.email},
                "$setOnInsert": {"lead_id": lead_id},
                "$push": {"activities": activity},
            },
            upsert=True,
        )
        return {"ok": True, "lead_id": lead_id, "activity": activity}
