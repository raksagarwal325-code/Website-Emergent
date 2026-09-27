"""Local visual embeddings for quotation product search.

Runs DINOv2 inside the Samrat backend. No third-party inference API or API key
is required. The model is loaded lazily and cached in-process after first use.
"""
from __future__ import annotations

import math
import os
import threading
from io import BytesIO
from typing import Iterable

from PIL import Image, ImageOps

MODEL = os.environ.get("QUOTATION_VISION_MODEL", "facebook/dinov2-small")
DIMENSIONS = 384

_MODEL = None
_PROCESSOR = None
_MODEL_LOCK = threading.Lock()


class VisualEmbeddingError(RuntimeError):
    pass


def prepare_pil(image_bytes: bytes, content_type: str) -> Image.Image:
    """Decode JPG/PNG/WebP safely and normalize orientation/RGB."""
    ct = (content_type or "").split(";", 1)[0].strip().lower()
    if ct == "image/jpg":
        ct = "image/jpeg"
    if ct not in {"image/jpeg", "image/png", "image/webp"}:
        raise VisualEmbeddingError("Visual search supports JPG, PNG and WebP images.")
    if not image_bytes:
        raise VisualEmbeddingError("Image is empty.")
    try:
        with Image.open(BytesIO(image_bytes)) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
            image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            return image.copy()
    except Exception as exc:
        raise VisualEmbeddingError("Could not decode image for visual search.") from exc


def prepare_image(image_bytes: bytes, content_type: str) -> tuple[bytes, str]:
    """Compatibility helper used by tests and diagnostics."""
    image = prepare_pil(image_bytes, content_type)
    out = BytesIO()
    image.save(out, format="JPEG", quality=90, optimize=True)
    return out.getvalue(), "image/jpeg"


def image_variants(image_bytes: bytes, content_type: str) -> list[Image.Image]:
    """Return full image plus center crops for screenshot/room-photo resilience."""
    image = prepare_pil(image_bytes, content_type)
    variants = [image]
    width, height = image.size
    for ratio in (0.82, 0.65):
        crop_w = max(32, int(width * ratio))
        crop_h = max(32, int(height * ratio))
        left = max(0, (width - crop_w) // 2)
        top = max(0, (height - crop_h) // 2)
        variants.append(image.crop((left, top, left + crop_w, top + crop_h)))
    return variants


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


def _load_model():
    """Load the local DINOv2 vision model once per backend worker."""
    global _MODEL, _PROCESSOR
    if _MODEL is not None and _PROCESSOR is not None:
        return _PROCESSOR, _MODEL

    with _MODEL_LOCK:
        if _MODEL is not None and _PROCESSOR is not None:
            return _PROCESSOR, _MODEL
        try:
            import torch
            from transformers import AutoImageProcessor, AutoModel

            processor = AutoImageProcessor.from_pretrained(MODEL)
            model = AutoModel.from_pretrained(MODEL)
            model.eval()
            model.to("cpu")
            torch.set_grad_enabled(False)
            _PROCESSOR = processor
            _MODEL = model
            return processor, model
        except Exception as exc:
            raise VisualEmbeddingError(
                "Local visual-search model could not be loaded. "
                "Check backend model dependencies/network cache."
            ) from exc


def _embed_pil_batch(images: list[Image.Image]) -> list[list[float]]:
    if not images:
        return []
    try:
        import torch

        processor, model = _load_model()
        inputs = processor(images=images, return_tensors="pt")
        with torch.inference_mode():
            outputs = model(**inputs)
            if getattr(outputs, "pooler_output", None) is not None:
                features = outputs.pooler_output
            else:
                features = outputs.last_hidden_state[:, 0, :]
        rows = features.detach().cpu().tolist()
        return [normalize_vector(row) for row in rows]
    except VisualEmbeddingError:
        raise
    except Exception as exc:
        raise VisualEmbeddingError(f"Local visual embedding failed: {exc}") from exc


def embed_image(image_bytes: bytes, content_type: str) -> list[float]:
    """Embed one image with the local DINOv2 model."""
    return _embed_pil_batch([prepare_pil(image_bytes, content_type)])[0]


def embed_query_variants(image_bytes: bytes, content_type: str) -> list[list[float]]:
    """Embed full client image plus center crops; caller uses best similarity."""
    return _embed_pil_batch(image_variants(image_bytes, content_type))


def embed_images_batch(images: list[tuple[bytes, str]]) -> list[list[float]]:
    """Embed catalogue images locally in one CPU batch."""
    if not images:
        return []
    pil_images = [prepare_pil(image_bytes, content_type) for image_bytes, content_type in images]
    return _embed_pil_batch(pil_images)
