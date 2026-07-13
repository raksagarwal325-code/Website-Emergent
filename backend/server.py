"""Product Catalog API - Lumière."""
import csv
import io
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from storage import MIME_TYPES, get_object, init_storage, put_object  # noqa: E402
from watermark import apply_watermark  # noqa: E402
from seed_data import build_seed_docs  # noqa: E402

# --- Setup ---
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]
APP_NAME = os.environ.get("APP_NAME", "catalog-app")

app = FastAPI(title="Lumière Catalog API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# --- Models ---
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    sku: str
    category: str
    price: float
    compare_at_price: Optional[float] = None
    currency: str = "USD"
    short_description: str = ""
    description: str = ""
    images: List[str] = []
    tags: List[str] = []
    specs: dict = {}
    stock: int = 0
    featured: bool = False
    badge: str = ""
    fixed_price: bool = False
    price_display: str = "starting_from"  # starting_from | fixed | on_request
    rating: float = 0.0
    review_count: int = 0
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
    # "published" — visible on the public site (catalog, home).
    # "draft"     — hidden from the public site; awaiting admin review
    #               (e.g. AI-generated products default to this).
    status: str = "published"


class ProductCreate(BaseModel):
    name: str
    sku: str
    category: str
    price: float
    compare_at_price: Optional[float] = None
    currency: str = "USD"
    short_description: str = ""
    description: str = ""
    images: List[str] = []
    tags: List[str] = []
    specs: dict = {}
    stock: int = 0
    featured: bool = False
    badge: str = ""
    fixed_price: bool = False
    price_display: str = "starting_from"
    status: str = "published"


class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    author: str
    rating: int
    title: str = ""
    body: str = ""
    created_at: str = Field(default_factory=now_iso)


class ReviewCreate(BaseModel):
    product_id: str
    author: str
    rating: int
    title: str = ""
    body: str = ""


class InquiryItem(BaseModel):
    product_id: str
    name: str
    sku: Optional[str] = None
    quantity: int = 1
    price: float


class Inquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    customer_email: EmailStr
    customer_phone: str = ""
    message: str = ""
    items: List[InquiryItem] = []
    total: float = 0.0
    status: str = "new"
    created_at: str = Field(default_factory=now_iso)


class InquiryCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: str = ""
    message: str = ""
    items: List[InquiryItem] = []


class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    subject: str = ""
    message: str
    created_at: str = Field(default_factory=now_iso)


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    subject: str = ""
    message: str


class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "settings"
    brand_name: str = "Samrat Glass Emporium"
    tagline: str = "Fancy lights, chandeliers & decorative lighting — handcrafted in Firozabad."
    whatsapp_number: str = "+918920392937"
    admin_email: str = "samratglassemp@gmail.com"
    hero_image: str = "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15"
    address: str = "Raniwala Market, Babboo Ji Ki Jeen, Firozabad - 283203, Uttar Pradesh, India"
    gstin: str = "09ADCFS9258D1ZS"
    delivery_info: str = "Pan-India shipping · 7–10 business days"
    payment_methods: str = "UPI · Net Banking"
    currency_symbol: str = "₹"
    google_cid: str = "16850385744624001495"
    google_place_id: str = ""
    google_maps_api_key: str = ""
    homepage_content: dict = Field(default_factory=dict)
    instagram_url: str = ""
    facebook_url: str = ""
    youtube_url: str = ""
    pinterest_url: str = ""
    business_hours: str = "Mon – Sun: 10:00 AM – 8:00 PM"
    google_maps_url: str = "https://www.google.com/maps?cid=16850385744624001495"
    watermark: dict = Field(default_factory=lambda: {
        "enabled": True,
        "opacity": 0.15,
        "size_pct": 0.30,
        "position": "center",
        "adaptive_tone": True,
    })


class SettingsUpdate(BaseModel):
    brand_name: Optional[str] = None
    tagline: Optional[str] = None
    whatsapp_number: Optional[str] = None
    admin_email: Optional[str] = None
    hero_image: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    delivery_info: Optional[str] = None
    payment_methods: Optional[str] = None
    currency_symbol: Optional[str] = None
    google_cid: Optional[str] = None
    google_place_id: Optional[str] = None
    google_maps_api_key: Optional[str] = None
    homepage_content: Optional[dict] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    youtube_url: Optional[str] = None
    pinterest_url: Optional[str] = None
    business_hours: Optional[str] = None
    google_maps_url: Optional[str] = None
    watermark: Optional[dict] = None


# --- Helpers ---
async def recalc_product_rating(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(1000)
    if not reviews:
        await db.products.update_one({"id": product_id}, {"$set": {"rating": 0.0, "review_count": 0}})
        return
    total = sum(r["rating"] for r in reviews)
    avg = round(total / len(reviews), 2)
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"rating": avg, "review_count": len(reviews), "updated_at": now_iso()}},
    )


# --- Product routes ---
@api.get("/products", response_model=List[Product])
async def list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    featured: Optional[bool] = None,
    sort: str = "newest",
    status: Optional[str] = None,  # "draft" | "published" | None (=published only for public)
    include_drafts: bool = False,   # convenience flag for the admin UI
):
    query = {}
    # Public callers get only published products by default; admin passes
    # include_drafts=1 (or an explicit status) to see the "Needs Review" pile.
    if not include_drafts and not status:
        query["status"] = {"$ne": "draft"}
    elif status:
        query["status"] = status
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"sku": {"$regex": q, "$options": "i"}},
        ]
    if category and category != "all":
        query["category"] = category
    if tag:
        query["tags"] = tag
    if min_price is not None or max_price is not None:
        price_q = {}
        if min_price is not None:
            price_q["$gte"] = min_price
        if max_price is not None:
            price_q["$lte"] = max_price
        query["price"] = price_q
    if featured is not None:
        query["featured"] = featured

    sort_map = {
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "rating": [("rating", -1)],
        "newest": [("created_at", -1)],
        "name": [("name", 1)],
    }
    cursor = db.products.find(query, {"_id": 0}).sort(sort_map.get(sort, sort_map["newest"]))
    return await cursor.to_list(1000)


@api.get("/products/categories")
async def list_categories():
    cats = await db.products.distinct("category")
    return sorted(cats)


@api.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Product not found")
    return doc


@api.post("/products", response_model=Product)
async def create_product(payload: ProductCreate):
    product = Product(**payload.model_dump())
    await db.products.insert_one(product.model_dump())
    return product


@api.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, payload: ProductCreate):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Product not found")
    data = payload.model_dump()
    data["updated_at"] = now_iso()
    await db.products.update_one({"id": product_id}, {"$set": data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated


@api.delete("/products/{product_id}")
async def delete_product(product_id: str):
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    await db.reviews.delete_many({"product_id": product_id})
    return {"ok": True}


# --- Reviews ---
@api.get("/reviews", response_model=List[Review])
async def list_reviews(product_id: str):
    docs = await db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.post("/reviews", response_model=Review)
async def create_review(payload: ReviewCreate):
    if not 1 <= payload.rating <= 5:
        raise HTTPException(400, "Rating must be 1-5")
    review = Review(**payload.model_dump())
    await db.reviews.insert_one(review.model_dump())
    await recalc_product_rating(payload.product_id)
    return review


# --- Inquiries (Cart submissions) ---
@api.post("/inquiries", response_model=Inquiry)
async def create_inquiry(payload: InquiryCreate):
    total = sum(i.price * i.quantity for i in payload.items)
    inquiry = Inquiry(**payload.model_dump(), total=total)
    await db.inquiries.insert_one(inquiry.model_dump())
    return inquiry


@api.get("/inquiries", response_model=List[Inquiry])
async def list_inquiries():
    return await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.patch("/inquiries/{inquiry_id}")
async def update_inquiry_status(inquiry_id: str, status: str = Query(...)):
    res = await db.inquiries.update_one({"id": inquiry_id}, {"$set": {"status": status}})
    if res.matched_count == 0:
        raise HTTPException(404, "Inquiry not found")
    return {"ok": True}


# --- Contact ---
@api.post("/contact", response_model=ContactMessage)
async def create_contact(payload: ContactCreate):
    msg = ContactMessage(**payload.model_dump())
    await db.contact_messages.insert_one(msg.model_dump())
    return msg


@api.get("/contact", response_model=List[ContactMessage])
async def list_contact():
    return await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


class CatalogueRequest(BaseModel):
    name: str
    phone: str
    source: str = "contact_page"


@api.post("/catalogue-request")
async def create_catalogue_request(payload: CatalogueRequest):
    """Store a name + phone lead every time someone requests the PDF catalogue
    via the "Send catalogue on WhatsApp" flow. Also visible under Admin →
    Inquiries so the shop owner can follow up if the visitor never actually
    sends the WhatsApp message."""
    record = {
        "id": str(uuid.uuid4()),
        "name": (payload.name or "").strip()[:120],
        "phone": (payload.phone or "").strip()[:32],
        "source": (payload.source or "contact_page")[:64],
        "created_at": now_iso(),
        "type": "catalogue_request",
    }
    if not record["name"] or not record["phone"]:
        raise HTTPException(status_code=400, detail="Name and phone are required")
    # Reuse the inquiries collection so the shop owner sees these leads in the
    # same admin table as regular inquiries.
    await db.inquiries.insert_one({
        **record,
        "customer_name": record["name"],
        "customer_email": "",
        "customer_phone": record["phone"],
        "message": f"Requested the PDF catalogue via WhatsApp from {record['source']}",
        "items": [],
        "total": 0.0,
        "status": "new",
    })
    return {"success": True, "id": record["id"]}


# --- Settings ---
@api.get("/settings", response_model=Settings)
async def get_settings():
    doc = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not doc:
        s = Settings()
        await db.settings.insert_one(s.model_dump())
        return s
    # Merge in defaults for any newly added fields (backward compat)
    merged = {**Settings().model_dump(), **doc}
    return merged


@api.put("/settings", response_model=Settings)
async def update_settings(payload: SettingsUpdate):
    doc = await db.settings.find_one({"id": "settings"}, {"_id": 0}) or Settings().model_dump()
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    doc.update(updates)
    await db.settings.update_one({"id": "settings"}, {"$set": doc}, upsert=True)
    return doc


@api.get("/proxy-image")
async def proxy_image(url: str):
    try:
        r = requests.get(url, timeout=15, stream=True)
        r.raise_for_status()
        ct = r.headers.get("Content-Type", "image/jpeg")
        return Response(content=r.content, media_type=ct, headers={"Cache-Control": "public, max-age=86400"})
    except Exception as e:
        logger.error(f"Proxy image failed: {e}")
        raise HTTPException(404, "Image not found")


# --- Google Reviews ---
@api.get("/google/reviews")
async def google_reviews():
    raw = await db.settings.find_one({"id": "settings"}, {"_id": 0}) or {}
    doc = {**Settings().model_dump(), **raw}
    cid = doc.get("google_cid", "")
    place_id = doc.get("google_place_id", "")
    api_key = doc.get("google_maps_api_key", "")

    view_url = f"https://www.google.com/maps?cid={cid}" if cid else ""
    write_url = f"https://search.google.com/local/writereview?placeid={place_id}" if place_id else view_url

    result = {
        "enabled": False,
        "view_url": view_url,
        "write_url": write_url,
        "cid": cid,
        "place_id_set": bool(place_id),
        "api_key_set": bool(api_key),
        "rating": None,
        "total_ratings": None,
        "reviews": [],
    }

    if not (place_id and api_key):
        return result

    try:
        r = requests.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            params={
                "place_id": place_id,
                "fields": "name,rating,user_ratings_total,reviews,url",
                "key": api_key,
                "reviews_no_translations": "true",
                "reviews_sort": "newest",
            },
            timeout=10,
        )
        data = r.json()
        if data.get("status") == "OK":
            res = data.get("result", {})
            result.update({
                "enabled": True,
                "rating": res.get("rating"),
                "total_ratings": res.get("user_ratings_total"),
                "reviews": [
                    {
                        "author_name": rv.get("author_name"),
                        "profile_photo_url": rv.get("profile_photo_url"),
                        "rating": rv.get("rating"),
                        "relative_time_description": rv.get("relative_time_description"),
                        "text": rv.get("text"),
                    }
                    for rv in (res.get("reviews") or [])
                ],
                "view_url": res.get("url") or view_url,
            })
        else:
            logger.warning(f"Google Places status: {data.get('status')} - {data.get('error_message')}")
    except Exception as e:
        logger.error(f"Google reviews fetch failed: {e}")

    return result


# --- Uploads ---
DEFAULT_WATERMARK = {
    "enabled": True,
    "opacity": 0.15,
    "size_pct": 0.30,
    "position": "center",
    "adaptive_tone": True,
}


async def _get_watermark_settings() -> dict:
    doc = await db.settings.find_one({"id": "settings"}, {"_id": 0, "watermark": 1})
    wm = (doc or {}).get("watermark") or {}
    return {**DEFAULT_WATERMARK, **wm}


VIDEO_EXTS = {"mp4", "webm", "mov", "m4v"}
VIDEO_MIME_TYPES = {
    "mp4": "video/mp4",
    "webm": "video/webm",
    "mov": "video/quicktime",
    "m4v": "video/x-m4v",
}
MAX_IMAGE_BYTES = 25 * 1024 * 1024
MAX_VIDEO_BYTES = 100 * 1024 * 1024


@api.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    ct = (file.content_type or "").lower()
    is_image = ct.startswith("image/")
    is_video = ct.startswith("video/")
    if not (is_image or is_video):
        raise HTTPException(400, "Only images or videos are allowed")

    ext = (file.filename or "img").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if is_video:
        if ext not in VIDEO_EXTS:
            ext = "mp4"
    else:
        if ext not in MIME_TYPES:
            ext = "png"

    data = await file.read()
    limit = MAX_VIDEO_BYTES if is_video else MAX_IMAGE_BYTES
    if len(data) > limit:
        mb = limit // (1024 * 1024)
        raise HTTPException(400, f"File too large — max {mb}MB. Please compress or resize.")

    file_id = str(uuid.uuid4())
    subdir = "videos" if is_video else "products"
    original_path = f"{APP_NAME}/originals/{file_id}.{ext}"
    public_path = f"{APP_NAME}/{subdir}/{file_id}.{ext}"

    # Always keep the untouched original (admin-only).
    put_object(original_path, data, file.content_type)

    # Videos are never watermarked — only images run through the watermark helper.
    if is_video:
        public_bytes = data
        wm_enabled_for_record = False
    else:
        wm = await _get_watermark_settings()
        if wm.get("enabled"):
            public_bytes = apply_watermark(
                data,
                opacity=wm.get("opacity", 0.15),
                size_pct=wm.get("size_pct", 0.30),
                adaptive_tone=wm.get("adaptive_tone", True),
                content_type=file.content_type,
            )
        else:
            public_bytes = data
        wm_enabled_for_record = bool(wm.get("enabled"))

    result = put_object(public_path, public_bytes, file.content_type)

    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_path": original_path,
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result["size"],
        "watermarked": wm_enabled_for_record,
        "kind": "video" if is_video else "image",
        "created_at": now_iso(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


# --- Instagram cover auto-pull ------------------------------------------------
def _canonical_instagram_url(raw: str) -> Optional[str]:
    """Return a canonical Reel/Post/TV permalink (no query params, no fragment)
    or None if the input is not a supported Instagram URL."""
    from urllib.parse import urlparse

    try:
        u = urlparse((raw or "").strip())
    except Exception:
        return None
    host = (u.netloc or "").lower()
    if not host.endswith("instagram.com"):
        return None
    path = u.path or "/"
    if not path.endswith("/"):
        path = path + "/"
    # Support /p/, /reel/, /reels/, /tv/ permalinks
    parts = [p for p in path.split("/") if p]
    if len(parts) < 2 or parts[0] not in {"p", "reel", "reels", "tv"}:
        return None
    # Strip query string (?utm_source=, &igsh=, etc.) and fragment.
    return f"{u.scheme or 'https'}://{host}{path}"


_IG_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)


async def _extract_ig_cover_via_browser(url: str) -> Optional[str]:
    """Load an Instagram permalink in headless Chromium and return the URL of
    the reel/post poster image.

    Priority order (most accurate first):
      1. `og:image` meta tag — Instagram's canonical share thumbnail, populated
         by their SPA after render (empty in the initial HTML).
      2. `twitter:image` meta tag — same source, fallback.
      3. Main <video> poster attribute (when Instagram renders the reel).
      4. First large `<img alt="Video by …">` OR `<img alt="Photo by …">` —
         last-resort scan of the DOM.

    We deliberately avoid the "More posts from …" grid: those are unrelated
    older uploads and picking one of them yields a completely wrong cover.
    """
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        try:
            ctx = await browser.new_context(
                viewport={"width": 500, "height": 900},
                user_agent=_IG_UA,
                locale="en-US",
            )
            page = await ctx.new_page()
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            status = resp.status if resp else 0
            # Give Instagram's SPA time to inject og:image / render video.
            await page.wait_for_timeout(5000)

            src = await page.evaluate(
                """() => {
                    // 1. og:image (most accurate — Instagram's canonical cover)
                    const og = document.querySelector('meta[property=\"og:image\"]')?.content;
                    if (og && og.startsWith('http')) return og;
                    // 2. twitter:image
                    const tw = document.querySelector('meta[name=\"twitter:image\"]')?.content;
                    if (tw && tw.startsWith('http')) return tw;
                    // 3. Main <video> poster
                    for (const v of document.querySelectorAll('video')) {
                        if (v.poster && v.poster.startsWith('http')) return v.poster;
                    }
                    // 4. Fallback: only scan <article> (never the "More posts" grid)
                    const article = document.querySelector('article');
                    if (article) {
                        const imgs = Array.from(article.querySelectorAll('img'))
                            .filter(i => i.naturalWidth > 200 && !(i.alt||'').includes('profile picture'));
                        if (imgs.length) return imgs[0].src;
                    }
                    return null;
                }"""
            )
            return src, status
        finally:
            await browser.close()


def _extract_og_image(html: str) -> Optional[str]:
    """Pull og:image out of an Instagram public HTML page.
    Falls back to twitter:image and JSON blobs when og:image is absent."""
    import re

    for pattern in (
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'"display_url"\s*:\s*"([^"]+)"',
        r'"thumbnail_src"\s*:\s*"([^"]+)"',
    ):
        m = re.search(pattern, html, re.IGNORECASE)
        if m:
            url = m.group(1).replace("\\u0026", "&").replace("\\/", "/").replace("&amp;", "&")
            if url.startswith("http"):
                return url
    return None


class InstagramCoverRequest(BaseModel):
    url: str


@api.post("/admin/instagram/cover")
async def pull_instagram_cover(payload: InstagramCoverRequest):
    """Auto-pull an Instagram Reel/Post cover thumbnail, cache it in object
    storage and return a stable /api/files/... URL the admin can use as the
    card cover. Manual upload remains the default path.

    Response shapes:
      · 200 { success: true, path, url, source_url }
      · 200 { success: false, reason: "<code>", message: "<user_msg>" }

    Reason codes:
      · invalid_url        → URL not provided / not a valid URL
      · not_instagram      → URL is not an Instagram permalink we support
      · private_or_deleted → IG explicitly returned 404 / 410 (post is gone)
      · no_thumbnail       → Post exists but Instagram didn't expose a cover
                             (very common today — login-walled HTML)
      · network_error      → Could not reach Instagram / timeout
      · image_fetch_failed → thumbnail URL couldn't be downloaded
    """
    raw = (payload.url or "").strip()
    if not raw:
        return {"success": False, "reason": "invalid_url",
                "message": "Please enter an Instagram Reel/Post URL first."}
    canonical = _canonical_instagram_url(raw)
    if not canonical:
        return {"success": False, "reason": "not_instagram",
                "message": "Please enter a valid Instagram Reel or Post URL."}

    # Load the permalink in a real headless Chromium — Instagram no longer
    # exposes og:image to plain HTTP scrapers, but the poster image is still
    # rendered into the DOM for real browsers.
    try:
        thumb, status_code = await _extract_ig_cover_via_browser(canonical)
    except Exception as e:
        logger.warning(f"IG headless render failed for {canonical}: {e}")
        return {"success": False, "reason": "network_error",
                "message": "Could not reach Instagram. Please try again or upload the cover manually."}

    if status_code in (404, 410):
        return {"success": False, "reason": "private_or_deleted",
                "message": "This Instagram post appears to be deleted or the URL is incorrect. "
                           "Please double-check the link or upload the cover manually."}

    if not thumb:
        # Page loaded but Instagram didn't render a recognizable poster image
        # (e.g. carousel post with lazy-loaded slides, unusually formatted
        # alt text, or a login-required post). Not the same as "deleted".
        return {"success": False, "reason": "no_thumbnail",
                "message": "Instagram did not provide a cover image for this post. "
                           "Please upload a cover manually."}

    try:
        img_resp = requests.get(thumb, headers={"User-Agent": _IG_UA}, timeout=15, allow_redirects=True)
    except requests.RequestException as e:
        logger.warning(f"IG thumbnail fetch failed: {e}")
        return {"success": False, "reason": "image_fetch_failed",
                "message": "Could not pull the cover image. Please upload manually."}

    if img_resp.status_code != 200 or not img_resp.content:
        return {"success": False, "reason": "image_fetch_failed",
                "message": "Could not pull the cover image. Please upload manually."}

    # Persist the fetched image via existing object storage — same shape as
    # the /upload endpoint so the frontend can drop the URL straight into the
    # `thumbnail` field. Watermarking is intentionally skipped for these
    # borrowed covers (they're social proof, not our own product imagery).
    content_type = (img_resp.headers.get("content-type") or "image/jpeg").split(";")[0].strip()
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}.get(content_type, "jpg")
    file_id = str(uuid.uuid4())
    storage_path = f"{APP_NAME}/ig_covers/{file_id}.{ext}"

    try:
        result = put_object(storage_path, img_resp.content, content_type)
    except Exception as e:
        logger.error(f"IG cover store failed: {e}")
        return {"success": False, "reason": "image_fetch_failed",
                "message": "Could not save the cover image. Please try again."}

    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": f"instagram-cover-{file_id}.{ext}",
        "content_type": content_type,
        "size": result["size"],
        "watermarked": False,
        "kind": "image",
        "source": "instagram",
        "source_url": canonical,
        "created_at": now_iso(),
    })

    return {
        "success": True,
        "path": result["path"],
        "url": f"/api/files/{result['path']}",
        "source_url": canonical,
    }


# --- AI product-details generator ------------------------------------------

class AIGenerateProductRequest(BaseModel):
    image_url: str  # Either an absolute URL or a /api/files/... path
    image_path: Optional[str] = None  # storage path if we already have one

# Prompt engineering — keep the tone Indian-luxury and instruct the model to
# NEVER invent physical measurements, wattage, holder types, or prices.
_AI_PROMPT_SYSTEM = """You are a senior catalogue copywriter for **Samrat Glass Emporium**, a Firozabad-based Indian luxury decorative lighting brand (chandeliers, hanging lights, wall lights, table lamps, floor lamps, sconces, candle stands).

Your job: analyze ONE product photograph and produce a JSON draft the shop owner can review and refine.

TONE & VOICE
· Premium, warm, quietly confident. Indian-hospitality voice — never salesy.
· Short crisp sentences. SEO-conscious phrasing.
· **DO NOT overuse** the words *exquisite, timeless, captivating, mesmerizing, enchanting*. Use each at most once across the whole draft.
· Every physical detail you're not 100% sure of MUST be softened with phrases like "appears to feature", "seems to be", or LEFT BLANK for admin review.

PRODUCT NAME RULES (STRICT — obey every rule)
· The name MUST feel specific, searchable and visibly different from any other name in the catalogue.
· Follow this format: **[Distinctive Design Feature] + [Material / Finish / Colour] + [Product Type]**.
· Length: 3–7 words, Title Case, no numerals, no brand name.
· **BANNED generic words** (do NOT use unless the design genuinely, visibly supports it): *Maharaja, Royal, Regent, Premium, Luxury, Elegant, Classic, Grand, Heritage, Majestic, Imperial, Palatial, Signature, Deluxe, Opulent, Splendid, Prestige, Vintage*. Prefer specific visual words instead.
· Draw the "distinctive design feature" from what is actually visible: glass shape (bell / lotus / tulip / lantern / drum / dome / globe / teardrop / conical), shade shape (scallop / pleated / bell / drum / fluted), number of arms/lights (three-arm, six-arm, eight-light, multi-tier), colour (amber, ruby-red, cobalt-blue, sea-green, smoke-grey, milk-white, honey-gold), finish (antique-brass, brushed-nickel, aged-bronze, matte-black, gilt-gold, copper, chrome), pattern (etched floral, cut-glass diamond, pinecone, honeycomb, blossom, scroll, filigree, prism, quilted, ribbed), crystal drops (teardrop, prism, pearl, pear-drop, faceted-bead), texture (frosted, cut-glass, faceted, hammered, ribbed, quilted, mercury), motif (crown, lotus, lily, tulip, floral, star, blossom, pineapple, diamond-crest, scroll), product type (Chandelier, Hanging Light, Pendant Light, Wall Light, Wall Sconce, Table Lamp, Floor Lamp, Lantern, Candle Stand).
· Prefer *unusual, evocative* first words that describe what you SEE: `Diamond Crest`, `Pinecone`, `Scallop Crown`, `Lotus Drop`, `Pearl Draped`, `Amber Bell`, `Frosted Blossom`, `Etched Vine`, `Cascade`, `Sunburst`, `Prism Cluster`, `Lantern Row`, `Fluted Column`.
· Good examples: `Diamond Crest Clear-Cut Crystal Chandelier`, `Scallop Crown Cut-Glass Chandelier`, `Amber Bell Crystal Hanging Light`, `Ruby Red Multi-Arm Crystal Chandelier`, `Lotus Drop Clear Glass Chandelier`, `Pinecone Cut-Glass Crystal Chandelier`, `Pearl Draped Candle-Style Chandelier`, `Frosted Floral Brass Table Lamp`, `Etched Blossom Glass Table Lamp`, `Antique Brass Lantern Hanging Light`, `Fabric Shade Gold Wall Light`, `Crystal Lily Pendant Light`.
· Bad examples (DO NOT produce): `Maharaja Regent Chandelier`, `Royal Premium Chandelier`, `Luxury Grand Chandelier`, `Heritage Signature Lamp`, `Classic Elegant Pendant`.

STRICT RULES
· DO NOT invent exact dimensions (height, width, diameter), weight, wattage, or price. Leave those fields blank.
· DO NOT invent the socket/holder type (B22 / E27 / E14 / GU10) unless it is unambiguously visible in the fitting. If uncertain, leave blank.
· DO NOT claim materials you cannot see. If it looks like crystal, say "cut-glass / crystal-look" — never certify.
· Tags MUST be a comma-separated list of 8–14 lowercase phrases, mixing category, material-look, style, and use-case (e.g. `chandelier, crystal chandelier, decorative light, fancy light, handcrafted light, Firozabad glass, luxury lighting, hanging light, living room lighting, hotel lobby chandelier`).
· SKU MUST follow the pattern `SGE-<CAT>-<3 uppercase letters>` where `<CAT>` is a short code (`CH` chandelier, `TL` table lamp, `WL` wall light, `HL` hanging light, `FL` floor lamp, `SC` sconce, `CS` candle stand). Example: `SGE-CH-VNX`. The 3-letter suffix should be evocative of the piece.
· Category MUST be one of: Chandelier, Hanging Light, Wall Light, Table Lamp, Floor Lamp, Sconce, Candle Stand, Wall Sconce.

DESCRIPTION STRUCTURE (the `description` field)
Follow this exact order — plain text, no markdown, blank line between sections:

  1. **Introduction paragraph** (2–3 sentences) — elegant opening that sets the mood and names the piece by category (e.g. "The [Name] is a statement chandelier…"). Set scale and character. No hyperbole.
  2. **Design details paragraph** (2–3 sentences) — describe ONLY what is clearly visible in the photograph: silhouette, arm/tier count if countable, finish sheen, glass style, drop/pendant shape. Use hedged language for anything uncertain.
  3. **Ideal spaces paragraph** (1–2 sentences) — suggest where the piece belongs. Draw from: living rooms, dining rooms, foyer entrances, master bedrooms, hotel lobbies, boutique hotels, luxury villas, temple mandirs, fine-dining restaurants, showrooms, banquet halls, premium interior projects.
  4. **Key Features** — a labelled section starting with the exact heading `Key Features:` on its own line, followed by 4–6 short bullet points prefixed with `• ` (bullet + space). Each bullet is a crisp phrase, not a full sentence. Examples: `• Hand-crafted in Firozabad by master artisans`, `• Made-to-order sizing and finish options`, `• Layered light dispersion for warm ambience`, `• Suits high-ceiling interiors`, `• Custom hanging length on request`.

OUTPUT FORMAT — strictly this JSON schema (no prose before/after, no code fences):
{
  "name": "…",                     // Specific 3–7 word Title Case name following the PRODUCT NAME RULES above
  "seo_name": "…",                 // SEO title, 60–70 chars, "<name> · <category> · Samrat Glass Emporium"
  "category": "…",                 // From the allowed list above
  "short_description": "…",        // 1 sentence, ≤ 160 chars, evocative but restrained
  "description": "…",              // Follow the DESCRIPTION STRUCTURE above (intro · design · spaces · Key Features bullets)
  "tags": "chandelier, crystal chandelier, …",
  "sku": "SGE-CH-XYZ",
  "specs": {
    "Material": "",                // fill only if certain, else ""
    "Finish": "",
    "Glass Type": "",
    "Product Type": "",
    "Holder Type": "",
    "Suitable For": "",            // e.g. "Living rooms, hotel lobbies, dining rooms, foyer entrances, luxury villas"
    "Style": "",                   // e.g. "Contemporary Indian" / "Traditional" / "Art Deco"
    "Color": "",
    "Package Includes": "",        // safe default: "1 × decorative light fixture with mounting hardware"
    "Care Instructions": "",       // safe default: "Wipe gently with a soft dry cloth. Avoid abrasive cleaners."
    "Customization Available": ""  // safe default: "Yes — sizes, finishes and hanging length can be customised on request."
  }
}
"""


async def _generate_product_json(image_bytes: bytes, mime: str) -> dict:
    """Send the image to Gemini 3 Flash and coerce the response into our JSON schema."""
    import base64
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY is not configured")

    chat = LlmChat(
        api_key=api_key,
        session_id=f"ai-product-{uuid.uuid4().hex[:12]}",
        system_message=_AI_PROMPT_SYSTEM,
    ).with_model("gemini", "gemini-3-flash-preview")

    b64 = base64.b64encode(image_bytes).decode("ascii")
    user_msg = UserMessage(
        text="Analyze this Samrat Glass Emporium product photograph and produce the JSON draft.",
        file_contents=[ImageContent(image_base64=b64)],
    )

    # Collect the streamed tokens into one final string, then parse.
    from emergentintegrations.llm.chat import TextDelta, StreamDone
    parts = []
    async for ev in chat.stream_message(user_msg):
        if isinstance(ev, TextDelta):
            parts.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    raw = "".join(parts).strip()

    # Some models still wrap output in ```json … ``` fences — strip those.
    import re
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        raise HTTPException(status_code=502, detail=f"AI returned no JSON. Raw: {raw[:200]}")
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"AI JSON parse failed: {e}") from e
    return data


@api.post("/ai/generate-product")
async def ai_generate_product(payload: AIGenerateProductRequest):
    """Analyze one product image and CREATE a draft product row that the admin
    can review / edit / publish. Returns the fully-populated draft."""

    # Load the image bytes — either from our object storage (preferred) or via
    # HTTP if the client passed an external URL.
    image_bytes = None
    mime = "image/jpeg"
    if payload.image_path:
        try:
            image_bytes, mime = get_object(payload.image_path)
        except Exception:
            image_bytes = None
    if not image_bytes:
        url = payload.image_url
        if url.startswith("/api/files/"):
            try:
                image_bytes, mime = get_object(url.removeprefix("/api/files/"))
            except Exception:
                image_bytes = None
        if not image_bytes:
            try:
                r = requests.get(url, timeout=20)
                r.raise_for_status()
                image_bytes = r.content
                mime = r.headers.get("content-type", mime).split(";")[0].strip()
            except Exception as e:
                raise HTTPException(400, f"Could not load image: {e}") from e

    ai = await _generate_product_json(image_bytes, mime)

    # Build the draft product row — everything AI leaves blank stays blank so
    # the admin sees it as "Needs Review" and fills in the truth.
    now = now_iso()
    draft = {
        "id": str(uuid.uuid4()),
        "name": (ai.get("name") or "New Product · Needs Review")[:140],
        "sku": (ai.get("sku") or f"SGE-DRAFT-{uuid.uuid4().hex[:5].upper()}")[:32],
        "category": ai.get("category") or "Chandelier",
        "price": 0.0,
        "compare_at_price": None,
        "currency": "INR",
        "short_description": (ai.get("short_description") or "")[:220],
        "description": ai.get("description") or "",
        "images": [payload.image_url] if payload.image_url else [],
        "tags": [t.strip() for t in (ai.get("tags") or "").split(",") if t.strip()],
        "specs": {k: (v or "") for k, v in (ai.get("specs") or {}).items()},
        "stock": 0,
        "featured": False,
        "badge": "Needs Review",
        "fixed_price": False,
        "price_display": "on_request",
        "rating": 0.0,
        "review_count": 0,
        "status": "draft",
        "seo_name": ai.get("seo_name") or "",
        "created_at": now,
        "updated_at": now,
    }
    await db.products.insert_one(draft)
    # Strip mongo _id before returning
    draft.pop("_id", None)
    return draft


# --- AI product-name suggestions -------------------------------------------

_NAME_SYSTEM_PROMPT = """You are the head naming curator for **Samrat Glass Emporium**, a Firozabad Indian luxury lighting brand.

You will be shown ONE product photograph and asked to invent FIVE distinct, high-quality product names.

STRICT RULES — read every rule twice.

1. FORMAT of every name: **[Distinctive Design Feature] + [Material / Finish / Colour] + [Product Type]**.
2. Length: 3–7 words, Title Case. No numerals, no brand name, no punctuation other than hyphens between compound words.
3. Every name MUST be based on features that are *visible* in the photo — glass shape, shade shape, arm/light count, colour, finish, pattern, crystal drops, cut-glass texture, scallop shade, bell shape, lotus shape, crown top, prism drops, brass/chrome/bronze finish, and product type (Chandelier / Hanging Light / Pendant Light / Wall Light / Table Lamp / Floor Lamp / Lantern / Candle Stand).
4. BANNED generic words (do NOT use unless the piece genuinely, visibly justifies it): *Maharaja, Royal, Regent, Premium, Luxury, Elegant, Classic, Grand, Heritage, Majestic, Imperial, Palatial, Signature, Deluxe, Opulent, Splendid, Prestige, Vintage*. Prefer specific visual words.
5. The FIVE names must be visibly different from each other — pick five different distinguishing features (e.g. one leads with colour, one with drop shape, one with arm-count, one with finish, one with silhouette).
6. Each name MUST be unique against the caller-supplied "existing catalogue names" list. If a name would collide (case-insensitive, ignoring punctuation), invent a different one.
7. Alongside each name, write a short one-sentence rationale (≤ 20 words) explaining which VISIBLE feature justifies the name.

GOOD EXAMPLES
· Diamond Crest Clear-Cut Crystal Chandelier — "twelve diamond-cut crystal points form a crown along the top rim"
· Amber Bell Crystal Hanging Light — "hand-blown amber bell-shaped glass over a single hanging drop"
· Pinecone Cut-Glass Crystal Chandelier — "central baluster is stacked with pinecone-shaped cut-glass beads"
· Fabric Shade Gold Wall Light — "ivory pleated fabric shade paired with a gilt-gold bracket"

BAD EXAMPLES (DO NOT PRODUCE) — because they are generic and could apply to almost any piece:
· Maharaja Regent Chandelier
· Royal Premium Chandelier
· Luxury Grand Chandelier
· Heritage Classic Pendant

OUTPUT — strict JSON only, no code fences, no prose:
{
  "suggestions": [
    { "name": "…", "rationale": "…" },
    { "name": "…", "rationale": "…" },
    { "name": "…", "rationale": "…" },
    { "name": "…", "rationale": "…" },
    { "name": "…", "rationale": "…" }
  ]
}
"""


class AINameSuggestRequest(BaseModel):
    image_url: Optional[str] = None
    image_path: Optional[str] = None
    product_id: Optional[str] = None
    exclude_names: Optional[List[str]] = None  # additional names to avoid


def _normalize_name(s: str) -> str:
    """Case-insensitive, punctuation-insensitive key for name uniqueness checks."""
    import re as _re
    return _re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


async def _existing_name_index(extra: Optional[List[str]] = None) -> set:
    """All currently used product names (normalized) — including drafts."""
    cursor = db.products.find({}, {"_id": 0, "name": 1})
    names = set()
    async for doc in cursor:
        n = _normalize_name(doc.get("name", ""))
        if n:
            names.add(n)
    for extra_name in (extra or []):
        n = _normalize_name(extra_name)
        if n:
            names.add(n)
    return names


async def _ai_name_batch(image_bytes: bytes, mime: str, existing: set) -> List[dict]:
    """Ask Gemini for a batch of 5 name suggestions, given the image and the
    list of names to avoid."""
    import base64
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent, TextDelta, StreamDone

    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY is not configured")

    chat = LlmChat(
        api_key=api_key,
        session_id=f"ai-name-{uuid.uuid4().hex[:12]}",
        system_message=_NAME_SYSTEM_PROMPT,
    ).with_model("gemini", "gemini-3-flash-preview")

    # Provide a small, current sample of existing names so the model can steer
    # away from close variants. Cap at 60 to keep the prompt lean.
    sample = list(existing)[:60]
    user_text = (
        "Analyze this Samrat Glass Emporium product photograph and produce 5 unique product names.\n"
        "Existing catalogue names (avoid duplicates, case-insensitive):\n"
        + ("\n".join(f"- {n}" for n in sample) if sample else "(none yet)")
    )
    user_msg = UserMessage(
        text=user_text,
        file_contents=[ImageContent(image_base64=base64.b64encode(image_bytes).decode("ascii"))],
    )

    parts: List[str] = []
    async for ev in chat.stream_message(user_msg):
        if isinstance(ev, TextDelta):
            parts.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    raw = "".join(parts).strip()

    import re as _re
    m = _re.search(r"\{.*\}", raw, _re.DOTALL)
    if not m:
        raise HTTPException(status_code=502, detail=f"AI returned no JSON. Raw: {raw[:200]}")
    try:
        parsed = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"AI JSON parse failed: {e}") from e

    items = parsed.get("suggestions") or []
    cleaned: List[dict] = []
    for item in items:
        name = (item.get("name") or "").strip()
        rationale = (item.get("rationale") or "").strip()
        if not name:
            continue
        # Enforce our length policy — trim over-long names to 7 words.
        words = name.split()
        if len(words) > 7:
            name = " ".join(words[:7])
        cleaned.append({"name": name, "rationale": rationale[:220]})
    return cleaned


@api.post("/ai/name-suggestions")
async def ai_name_suggestions(payload: AINameSuggestRequest):
    """Return exactly 5 unique, catalogue-safe product name suggestions.
    Each name is checked against every existing product name (case-insensitive,
    punctuation-insensitive) and any name the caller explicitly asks to avoid.
    If the model returns fewer than 5 unique names, we call it again with an
    updated avoid-list until we have 5 or run out of retries.
    """

    # Resolve the source image bytes.
    image_bytes: Optional[bytes] = None
    mime = "image/jpeg"

    # 1. If a product_id is provided, load its primary image (and existing name).
    self_name: Optional[str] = None
    if payload.product_id:
        prod = await db.products.find_one({"id": payload.product_id})
        if not prod:
            raise HTTPException(404, "Product not found")
        self_name = prod.get("name")
        if not payload.image_path and not payload.image_url:
            imgs = prod.get("images") or []
            if imgs:
                first = imgs[0]
                if isinstance(first, str) and first.startswith("/api/files/"):
                    payload.image_path = first.removeprefix("/api/files/")
                else:
                    payload.image_url = first

    # 2. Try storage path first, then external URL.
    if payload.image_path:
        try:
            image_bytes, mime = get_object(payload.image_path)
        except Exception:
            image_bytes = None
    if not image_bytes and payload.image_url:
        url = payload.image_url
        if url.startswith("/api/files/"):
            try:
                image_bytes, mime = get_object(url.removeprefix("/api/files/"))
            except Exception:
                image_bytes = None
        if not image_bytes:
            try:
                r = requests.get(url, timeout=20)
                r.raise_for_status()
                image_bytes = r.content
                mime = r.headers.get("content-type", mime).split(";")[0].strip()
            except Exception as e:
                raise HTTPException(400, f"Could not load image: {e}") from e
    if not image_bytes:
        raise HTTPException(400, "No image provided")

    # Build the "avoid" set — every catalogue name, plus the product's own
    # current name (so the model has to actually change it), plus any names
    # the caller has explicitly rejected.
    avoid = await _existing_name_index([self_name] if self_name else None)
    for n in (payload.exclude_names or []):
        key = _normalize_name(n)
        if key:
            avoid.add(key)

    picked: List[dict] = []
    picked_keys: set = set()

    # Up to 3 batches — each batch = 5 raw suggestions, we keep only the unique
    # ones and pad again if the model reused something. Cap total AI calls to
    # keep this responsive.
    for _attempt in range(3):
        batch = await _ai_name_batch(image_bytes, mime, avoid | picked_keys)
        for item in batch:
            key = _normalize_name(item["name"])
            if not key or key in avoid or key in picked_keys:
                continue
            picked.append(item)
            picked_keys.add(key)
            if len(picked) >= 5:
                break
        if len(picked) >= 5:
            break

    return {"suggestions": picked[:5]}


# --- Full-details regeneration (no DB write) -------------------------------


class AIRegenerateRequest(BaseModel):
    image_url: Optional[str] = None
    image_path: Optional[str] = None
    product_id: Optional[str] = None


async def _resolve_product_image(payload: AIRegenerateRequest) -> tuple[bytes, str]:
    """Resolve the payload into (image_bytes, mime). Raises HTTPException on
    failure. Consolidates the same lookup logic used elsewhere in this file:
    payload.image_path → payload.image_url → product primary image."""
    image_bytes = None
    mime = "image/jpeg"
    if payload.product_id and not (payload.image_path or payload.image_url):
        prod = await db.products.find_one({"id": payload.product_id})
        if not prod:
            raise HTTPException(404, "Product not found")
        imgs = prod.get("images") or []
        if imgs:
            first = imgs[0]
            if isinstance(first, str) and first.startswith("/api/files/"):
                payload.image_path = first.removeprefix("/api/files/")
            else:
                payload.image_url = first
    if payload.image_path:
        try:
            image_bytes, mime = get_object(payload.image_path)
        except Exception:
            image_bytes = None
    if not image_bytes and payload.image_url:
        url = payload.image_url
        if url.startswith("/api/files/"):
            try:
                image_bytes, mime = get_object(url.removeprefix("/api/files/"))
            except Exception:
                image_bytes = None
        if not image_bytes:
            try:
                r = requests.get(url, timeout=20)
                r.raise_for_status()
                image_bytes = r.content
                mime = r.headers.get("content-type", mime).split(";")[0].strip()
            except Exception as e:
                raise HTTPException(400, f"Could not load image: {e}") from e
    if not image_bytes:
        raise HTTPException(400, "No image provided")
    return image_bytes, mime


@api.post("/ai/regenerate-details")
async def ai_regenerate_details(payload: AIRegenerateRequest):
    """Return a FULL AI-generated product JSON (name, seo_name, category,
    short_description, description, tags, specs, sku) for review.

    This endpoint does NOT persist anything — the admin sees a side-by-side
    diff and picks which fields to actually apply. If the product_id belongs
    to an existing product, the model is also given the current catalogue
    names so it doesn't propose a duplicate name.
    """
    image_bytes, mime = await _resolve_product_image(payload)
    ai = await _generate_product_json(image_bytes, mime)

    # If we're regenerating for an existing product, make sure the AI-picked
    # name doesn't collide with any OTHER product's name in the catalogue.
    if payload.product_id:
        existing = await _existing_name_index()
        proposed = _normalize_name(ai.get("name", ""))
        # A collision only counts if it maps to a DIFFERENT product row.
        if proposed:
            collided_doc = await db.products.find_one(
                {"id": {"$ne": payload.product_id}, "name": {"$regex": f"^{ai.get('name', '')}$", "$options": "i"}},
                {"_id": 0, "id": 1, "name": 1},
            )
            if collided_doc:
                # Ask the batch helper for one uniquely-cleared alternative.
                batch = await _ai_name_batch(image_bytes, mime, existing)
                for item in batch:
                    key = _normalize_name(item["name"])
                    if key and key != proposed and key not in existing:
                        ai["name"] = item["name"]
                        break
    return {"ai": ai}


# --- "Update related fields based on new name" -----------------------------


class AIRelatedRequest(BaseModel):
    name: str
    image_url: Optional[str] = None
    image_path: Optional[str] = None
    product_id: Optional[str] = None


_RELATED_SYSTEM_PROMPT = """You are the catalogue copywriter for **Samrat Glass Emporium**.

The shop owner has just fixed the product NAME to a specific value. Your job is
to rewrite the OTHER fields so they align with that name AND with what is
actually visible in the product photograph.

RULES
· The provided `name` is FIXED — do not change it. Use it verbatim in `seo_name`
  and reference its distinctive feature in `short_description` and `description`.
· `category` MUST be one of: Chandelier, Hanging Light, Wall Light, Table Lamp,
  Floor Lamp, Sconce, Candle Stand, Wall Sconce.
· `short_description` is 1 sentence, ≤ 160 chars, restrained tone.
· `description` follows this structure (plain text, blank line between
  sections):
  1. Introduction paragraph (2–3 sentences).
  2. Design details paragraph (2–3 sentences, only what is visible).
  3. Ideal spaces paragraph (1–2 sentences).
  4. `Key Features:` on its own line followed by 4–6 bullets prefixed with
     `• ` (bullet + space).
· `tags` is a comma-separated string of 8–14 lowercase phrases, mixing
  category, material-look, style, use-case.
· `specs` MUST contain the following marketing-only fields (leave any of them
  blank rather than invent):
    - "Style"          e.g. "Traditional Indian Regal", "Contemporary Luxe"
    - "Suitable For"   e.g. "Living Rooms, Dining Halls, Hotel Lobbies"
    - "Color"          the dominant visible finish/colour, e.g. "Antique Bronze"
    - "Product Type"   e.g. "Multi-Arm Crystal Chandelier"
  DO NOT include Material, Finish, Glass Type, Holder Type, Height, Width,
  Wattage, Package Includes, or any dimensional/technical field — those stay
  owner-authored.
· DO NOT overuse *exquisite, timeless, captivating, mesmerizing, enchanting* —
  each at most once across the whole draft.
· DO NOT invent physical measurements, wattage, holder types, or prices.

OUTPUT — strict JSON only, no prose or code fences:
{
  "seo_name": "…",
  "category": "…",
  "short_description": "…",
  "description": "…",
  "tags": "…",
  "specs": {
    "Style": "…",
    "Suitable For": "…",
    "Color": "…",
    "Product Type": "…"
  }
}
"""


@api.post("/ai/regenerate-from-name")
async def ai_regenerate_from_name(payload: AIRelatedRequest):
    """Given a *fixed* product name and its image, regenerate the related
    fields (seo_name, category, short_description, description, tags) so they
    align with that name and the visible design in the photo."""
    if not payload.name or not payload.name.strip():
        raise HTTPException(400, "Missing product name")

    image_bytes, mime = await _resolve_product_image(
        AIRegenerateRequest(
            image_url=payload.image_url,
            image_path=payload.image_path,
            product_id=payload.product_id,
        )
    )

    import base64
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent, TextDelta, StreamDone

    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY is not configured")

    chat = LlmChat(
        api_key=api_key,
        session_id=f"ai-related-{uuid.uuid4().hex[:12]}",
        system_message=_RELATED_SYSTEM_PROMPT,
    ).with_model("gemini", "gemini-3-flash-preview")

    user_msg = UserMessage(
        text=(
            f"Fixed product name: {payload.name.strip()}\n"
            "Regenerate the JSON with seo_name, category, short_description, "
            "description, tags aligned with that name."
        ),
        file_contents=[ImageContent(image_base64=base64.b64encode(image_bytes).decode("ascii"))],
    )
    parts: List[str] = []
    async for ev in chat.stream_message(user_msg):
        if isinstance(ev, TextDelta):
            parts.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    raw = "".join(parts).strip()

    import re as _re
    m = _re.search(r"\{.*\}", raw, _re.DOTALL)
    if not m:
        raise HTTPException(status_code=502, detail=f"AI returned no JSON. Raw: {raw[:200]}")
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"AI JSON parse failed: {e}") from e

    # Force the name to be exactly what the caller specified.
    data["name"] = payload.name.strip()
    return {"ai": data}


class AIBulkRequest(BaseModel):
    images: List[str]  # list of /api/files/... URLs or absolute URLs


@api.post("/ai/generate-products-bulk")
async def ai_generate_products_bulk(payload: AIBulkRequest):
    """Fan out over N images. Each success creates a draft; each failure is
    reported per-image so the admin can retry just the bad ones."""
    if not payload.images:
        raise HTTPException(400, "No images provided")
    results = []
    for url in payload.images[:20]:  # safety cap to prevent runaway costs
        try:
            draft = await ai_generate_product(AIGenerateProductRequest(image_url=url))
            results.append({"image": url, "success": True, "product": draft})
        except HTTPException as e:
            results.append({"image": url, "success": False, "error": e.detail})
        except Exception as e:
            results.append({"image": url, "success": False, "error": str(e)})
    return {"results": results, "total": len(payload.images), "created": sum(1 for r in results if r["success"])}


@api.get("/files/{path:path}")
async def serve_file(path: str):
    # Private/admin originals shouldn't leak — block direct fetches.
    if "/originals/" in f"/{path}":
        raise HTTPException(404, "Not found")
    record = await db.files.find_one({"storage_path": path}, {"_id": 0})
    try:
        data, content_type = get_object(path)
    except Exception as e:
        logger.error(f"Fetch failed: {e}")
        raise HTTPException(404, "File not found")
    ct = (record or {}).get("content_type") or content_type
    return Response(content=data, media_type=ct)


# --- Watermark admin endpoints ---
@api.post("/watermark/preview")
async def watermark_preview(
    file: UploadFile = File(...),
    opacity: float = Form(0.15),
    size_pct: float = Form(0.30),
    adaptive_tone: bool = Form(True),
):
    """Return a watermarked preview PNG for the given file & settings.
    Does NOT persist anything. Used by the Admin settings panel."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only images allowed")
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(400, "Preview image too large — max 25MB.")
    stamped = apply_watermark(
        data,
        opacity=opacity,
        size_pct=size_pct,
        adaptive_tone=adaptive_tone,
        content_type=file.content_type,
    )
    return Response(content=stamped, media_type=file.content_type or "image/png")


@api.post("/watermark/reprocess")
async def watermark_reprocess():
    """Regenerate the public watermarked variant for every uploaded image
    using the ORIGINAL bytes and the current watermark settings.

    Only files with a stored `original_path` (uploaded after the watermark
    feature was enabled) are eligible. Returns a small stats summary."""
    wm = await _get_watermark_settings()
    files = await db.files.find(
        {"original_path": {"$exists": True, "$ne": None}}, {"_id": 0}
    ).to_list(5000)

    processed = 0
    skipped = 0
    failed = 0
    for f in files:
        try:
            orig_path = f.get("original_path")
            public_path = f.get("storage_path")
            if not orig_path or not public_path:
                skipped += 1
                continue
            data, ct = get_object(orig_path)
            if wm.get("enabled"):
                out = apply_watermark(
                    data,
                    opacity=wm.get("opacity", 0.15),
                    size_pct=wm.get("size_pct", 0.30),
                    adaptive_tone=wm.get("adaptive_tone", True),
                    content_type=ct or f.get("content_type") or "image/png",
                )
            else:
                out = data
            put_object(public_path, out, ct or f.get("content_type") or "image/png")
            await db.files.update_one(
                {"storage_path": public_path},
                {"$set": {"watermarked": bool(wm.get("enabled"))}},
            )
            processed += 1
        except Exception as e:
            logger.error(f"Reprocess failed for {f.get('storage_path')}: {e}")
            failed += 1

    return {"processed": processed, "skipped": skipped, "failed": failed, "total": len(files)}


# --- Export CSV ---
@api.get("/export/products.csv")
async def export_csv():
    products = await db.products.find({}, {"_id": 0}).to_list(2000)
    output = io.StringIO()
    if not products:
        output.write("id,name,sku,category,price\n")
    else:
        fields = ["id", "name", "sku", "category", "price", "currency", "stock", "rating", "review_count", "featured", "short_description"]
        writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for p in products:
            writer.writerow(p)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="products.csv"'},
    )


@api.get("/stats")
async def stats():
    return {
        "products": await db.products.count_documents({}),
        "inquiries": await db.inquiries.count_documents({}),
        "contact_messages": await db.contact_messages.count_documents({}),
        "reviews": await db.reviews.count_documents({}),
    }


@api.get("/")
async def root():
    return {"ok": True, "service": "lumiere-catalog"}


# --- Startup ---
@app.on_event("startup")
async def startup():
    # Migrate old Lumière data → Samrat Glass Emporium (one-time)
    old = await db.products.find_one({"sku": {"$regex": "^LUM-"}})
    if old:
        await db.products.delete_many({})
        await db.reviews.delete_many({})
        logger.info("Cleared old Lumière products")

    settings_doc = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if settings_doc and settings_doc.get("brand_name") == "Lumière":
        await db.settings.delete_one({"id": "settings"})
        logger.info("Reset old Lumière settings")

    # Seed products if empty
    count = await db.products.count_documents({})
    if count == 0:
        docs = build_seed_docs()
        await db.products.insert_many(docs)
        logger.info(f"Seeded {len(docs)} products")

    # Ensure settings row exists
    if not await db.settings.find_one({"id": "settings"}):
        await db.settings.insert_one(Settings().model_dump())

    # Init object storage
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init deferred: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
