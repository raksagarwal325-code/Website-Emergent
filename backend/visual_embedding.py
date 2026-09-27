"""Multimodal visual embeddings for quotation product search.

Uses Google's Gemini Embedding 2 image model. The API key is server-side only
and may be supplied via GEMINI_API_KEY / GOOGLE_API_KEY or Admin Settings.
"""
from __future__ import annotations

import base64
import math
import os
from typing import Iterable

import requests
from PIL import Image, ImageOps

MODEL = "gemini-embedding-2"
DIMENSIONS = 768
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:embedContent"


class VisualEmbeddingError(RuntimeError):
    pass


def resolve_api_key(settings: dict | None = None) -> str:
    key = (
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or str((settings or {}).get("gemini_embedding_api_key") or "").strip()
    )
    return str(key or "").strip()


def prepare_image(image_bytes: bytes, content_type: str) -> tuple[bytes, str]:
    """Normalize any supported catalogue/client image to a compact JPG/PNG."""
    ct = (content_type or "").split(";", 1)[0].strip().lower()
    if ct == "image/jpg":
        ct = "image/jpeg"
    if ct not in {"image/jpeg", "image/png", "image/webp"}:
        raise VisualEmbeddingError("Visual search supports JPG, PNG and WebP images.")
    try:
        from io import BytesIO
        with Image.open(BytesIO(image_bytes)) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
            image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            out = BytesIO()
            image.save(out, format="JPEG", quality=90, optimize=True)
            return out.getvalue(), "image/jpeg"
    except Exception as exc:
        raise VisualEmbeddingError("Could not decode image for visual search.") from exc


def normalize_vector(values: Iterable[float]) -> list[float]:
    vector = [float(value) for value in values]
    norm = math.sqrt(sum(value * value for value in vector))
    if not vector or norm <= 0:
        raise VisualEmbeddingError("Embedding response was empty.")
    return [value / norm for value in vector]


def cosine_similarity(left: Iterable[float], right: Iterable[float]) -> float:
    a = list(left)
    b = list(right)
    if len(a) != len(b) or not a:
        raise ValueError("Embedding vectors must have equal non-zero length.")
    return sum(float(x) * float(y) for x, y in zip(a, b))


def embed_image(
    image_bytes: bytes,
    content_type: str,
    api_key: str,
    *,
    timeout: float = 30.0,
    session=requests,
) -> list[float]:
    if not api_key:
        raise VisualEmbeddingError("Gemini visual-search API key is not configured.")
    if not image_bytes:
        raise VisualEmbeddingError("Image is empty.")

    prepared, mime = prepare_image(image_bytes, content_type)
    payload = {
        "content": {
            "parts": [{
                "inline_data": {
                    "mime_type": mime,
                    "data": base64.b64encode(prepared).decode("ascii"),
                }
            }]
        },
        "output_dimensionality": DIMENSIONS,
    }

    try:
        response = session.post(
            ENDPOINT,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            json=payload,
            timeout=timeout,
        )
    except Exception as exc:
        raise VisualEmbeddingError(f"Visual embedding request failed: {exc}") from exc

    if response.status_code >= 400:
        detail = ""
        try:
            detail = str((response.json().get("error") or {}).get("message") or "")
        except Exception:
            detail = ""
        if response.status_code in {401, 403}:
            raise VisualEmbeddingError(
                "Gemini visual-search API key is invalid or does not have Gemini API access."
            )
        if response.status_code == 429:
            raise VisualEmbeddingError("Gemini visual-search rate limit reached. Try again shortly.")
        raise VisualEmbeddingError(detail or f"Gemini visual-search request failed ({response.status_code}).")

    try:
        body = response.json()
        embeddings = body.get("embeddings") or []
        values = (embeddings[0] or {}).get("values") if embeddings else None
        if not values:
            values = (body.get("embedding") or {}).get("values")
        return normalize_vector(values or [])
    except VisualEmbeddingError:
        raise
    except Exception as exc:
        raise VisualEmbeddingError("Gemini visual-search returned an invalid embedding.") from exc


def embed_images_batch(
    images: list[tuple[bytes, str]],
    api_key: str,
) -> list[list[float]]:
    """Embed up to six images in one Gemini Embedding 2 request."""
    if not api_key:
        raise VisualEmbeddingError("Gemini visual-search API key is not configured.")
    if not images:
        return []
    if len(images) > 6:
        raise ValueError("Gemini Embedding 2 accepts at most six images per request.")

    try:
        from google import genai
        from google.genai import types

        contents = []
        for image_bytes, content_type in images:
            prepared, mime = prepare_image(image_bytes, content_type)
            contents.append(
                types.Content(
                    parts=[types.Part.from_bytes(data=prepared, mime_type=mime)]
                )
            )

        client = genai.Client(api_key=api_key)
        result = client.models.embed_content(
            model=MODEL,
            contents=contents,
            config=types.EmbedContentConfig(output_dimensionality=DIMENSIONS),
        )
        embeddings = list(result.embeddings or [])
        if len(embeddings) != len(images):
            raise VisualEmbeddingError("Gemini returned an incomplete embedding batch.")
        return [normalize_vector(embedding.values or []) for embedding in embeddings]
    except VisualEmbeddingError:
        raise
    except Exception as exc:
        raise VisualEmbeddingError(f"Visual embedding batch failed: {exc}") from exc
