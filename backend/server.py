"""Product Catalog API - Lumière."""
import csv
import io
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
):
    query = {}
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
    the reel/post poster image. Returns None if no suitable image is found.

    Instagram's public HTML no longer exposes og:image to bots, but a real
    browser still receives the poster image (with alt="Video by …" or
    "Photo by …") from their CDN. We piggy-back on that behavior.
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
            # Give Instagram's SPA a moment to inject the poster image.
            await page.wait_for_timeout(4500)
            # Prefer the reel/video poster (alt starts with "Video by …");
            # fall back to a photo post if this permalink is a still.
            src = await page.evaluate(
                """() => {
                    const imgs = Array.from(document.querySelectorAll('img'));
                    const bigVideo = imgs.find(i =>
                        (i.alt||'').startsWith('Video by') && i.naturalWidth > 200);
                    if (bigVideo) return bigVideo.src;
                    const bigPhoto = imgs.find(i =>
                        (i.alt||'').startsWith('Photo by') && i.naturalWidth > 200);
                    if (bigPhoto) return bigPhoto.src;
                    return null;
                }"""
            )
            # Return status alongside src so the caller can distinguish
            # deleted (404/410) from just "no poster on page".
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
