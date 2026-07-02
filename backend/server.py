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
from fastapi import APIRouter, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from storage import MIME_TYPES, get_object, init_storage, put_object  # noqa: E402
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
@api.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only images allowed")
    ext = (file.filename or "img.png").rsplit(".", 1)[-1].lower()
    if ext not in MIME_TYPES:
        ext = "png"
    path = f"{APP_NAME}/products/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "Max 8MB")
    result = put_object(path, data, file.content_type)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result["size"],
        "created_at": now_iso(),
    })
    # Return a URL the frontend can use directly
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


@api.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path}, {"_id": 0})
    try:
        data, content_type = get_object(path)
    except Exception as e:
        logger.error(f"Fetch failed: {e}")
        raise HTTPException(404, "File not found")
    ct = (record or {}).get("content_type") or content_type
    return Response(content=data, media_type=ct)


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
