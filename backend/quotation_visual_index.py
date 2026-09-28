"""Persistent image retrieval for quotation photos.

Each catalogue photo has its own embedding. Retrieval groups those photos by
product so the user can inspect distinct SKUs before adding one to a quote.
"""

import io
import math
import os

from PIL import Image, ImageOps

MODEL = "gemini-embedding-2"
DIMENSIONS = 768


def prepared_image(data: bytes) -> bytes:
    """Normalize WhatsApp EXIF and formats unsupported by the embedding API."""
    with Image.open(io.BytesIO(data)) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        image.thumbnail((768, 768), Image.Resampling.LANCZOS)
        result = io.BytesIO()
        image.save(result, format="JPEG", quality=88)
        return result.getvalue()


def image_embedding(data: bytes) -> list[float]:
    """Synchronous API call; callers must use asyncio.to_thread."""
    from google import genai
    from google.genai import types

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    client = genai.Client(api_key=key)
    result = client.models.embed_content(
        model=MODEL,
        contents=[types.Part.from_bytes(data=prepared_image(data), mime_type="image/jpeg")],
        config=types.EmbedContentConfig(output_dimensionality=DIMENSIONS),
    )
    values = (result.embeddings or [None])[0]
    vector = list(values.values) if values and values.values else []
    if len(vector) != DIMENSIONS or not all(math.isfinite(value) for value in vector):
        raise RuntimeError("The image embedding service returned an invalid vector")
    return vector


def image_rows(products: list[dict], project_photos: dict | None = None) -> dict[str, dict]:
    """Index saved product and linked installation views for all owners."""
    rows = {}
    for product in products:
        for image_url in product.get("images") or []:
            if image_url:
                row = rows.setdefault(image_url, {"url": image_url, "product_ids": []})
                if product["id"] not in row["product_ids"]:
                    row["product_ids"].append(product["id"])
    for image_url, linked in (project_photos or {}).items():
        if not image_url:
            continue
        row = rows.setdefault(image_url, {"url": image_url, "product_ids": []})
        for product in linked:
            if product["id"] not in row["product_ids"]:
                row["product_ids"].append(product["id"])
    return rows


def nearest_products(query: list[float], rows: list[dict], limit: int = 12) -> list[dict]:
    """Cosine similarity of indexed views, with the best view per product."""
    length = math.sqrt(sum(value * value for value in query))
    if not length:
        return []
    best = {}
    for row in rows:
        vector = row.get("vector") or []
        if len(vector) != len(query):
            continue
        norm = math.sqrt(sum(value * value for value in vector))
        if not norm:
            continue
        score = sum(a * b for a, b in zip(query, vector)) / (length * norm)
        for product_id in row.get("product_ids") or []:
            if product_id not in best or score > best[product_id]["score"]:
                best[product_id] = {"product_id": product_id, "image_url": row["url"], "score": score}
    return sorted(best.values(), key=lambda item: -item["score"])[:limit]
