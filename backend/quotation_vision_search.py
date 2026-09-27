"""Vision-first quotation catalogue search using the site's existing AI integration.

No new API key or ML runtime is required. The backend builds labelled contact
sheets from published Samrat catalogue images and asks the already-configured
vision model to identify the same fixture/design from the uploaded client image.
"""
from __future__ import annotations

import base64
import io
import json
import re
import uuid
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont, ImageOps

from product_ai import configure_product_chat


ALLOWED_CATEGORIES = [
    "Chandelier",
    "Hanging Light",
    "Wall Light",
    "Table Lamp",
    "Floor Lamp",
    "Candle Stand",
    "Floor Chandelier",
    "Table Chandelier",
    "Ceiling Light",
    "Gate Light",
]

SHEET_COLS = 8
SHEET_ROWS = 8
SHEET_CAPACITY = SHEET_COLS * SHEET_ROWS
CELL_W = 180
CELL_H = 180
LABEL_H = 24


class VisionSearchError(RuntimeError):
    pass


def _decode_json(raw: str) -> dict:
    match = re.search(r"\{.*\}", str(raw or ""), re.DOTALL)
    if not match:
        raise VisionSearchError("Vision search returned no JSON.")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise VisionSearchError("Vision search returned invalid JSON.") from exc


async def _vision_json(api_key: str, prompt: str, image_blobs: list[bytes]) -> dict:
    from emergentintegrations.llm.chat import (
        ImageContent,
        LlmChat,
        StreamDone,
        TextDelta,
        UserMessage,
    )

    if not api_key:
        raise VisionSearchError("Existing site AI integration is not configured.")

    chat = configure_product_chat(
        LlmChat(
            api_key=api_key,
            session_id=f"quotation-vision-{uuid.uuid4().hex[:12]}",
            system_message=(
                "You are a precise visual catalogue matcher for Samrat Glass Emporium. "
                "Never guess. Compare fixture geometry, arm count, shade/glass shape, "
                "body proportions, metalwork, crystal/drop arrangement and silhouette. "
                "Ignore backgrounds, room context, screenshots, WhatsApp compression, "
                "lighting and minor colour shifts. Return JSON only."
            ),
        )
    )

    files = [
        ImageContent(image_base64=base64.b64encode(blob).decode("ascii"))
        for blob in image_blobs
    ]
    user_msg = UserMessage(text=prompt, file_contents=files)

    parts = []
    async for event in chat.stream_message(user_msg):
        if isinstance(event, TextDelta):
            parts.append(event.content)
        elif isinstance(event, StreamDone):
            break
    return _decode_json("".join(parts).strip())


async def classify_query(api_key: str, query_image: bytes) -> list[str]:
    payload = await _vision_json(
        api_key,
        (
            "IMAGE 1 is the client reference. Identify the most likely catalogue category. "
            "Return up to 3 plausible categories from this exact list only: "
            + ", ".join(ALLOWED_CATEGORIES)
            + '. JSON: {"categories":["..."],"reason":"short visual reason"}.'
        ),
        [query_image],
    )
    categories = [
        str(value)
        for value in (payload.get("categories") or [])
        if str(value) in ALLOWED_CATEGORIES
    ]
    return categories[:3]


def _open_thumb(image_bytes: bytes) -> Image.Image:
    with Image.open(io.BytesIO(image_bytes)) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        image.thumbnail((CELL_W - 12, CELL_H - LABEL_H - 12), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (CELL_W, CELL_H - LABEL_H), "white")
        x = (canvas.width - image.width) // 2
        y = (canvas.height - image.height) // 2
        canvas.paste(image, (x, y))
        return canvas


def build_contact_sheet(items: list[dict]) -> tuple[bytes, dict[str, dict]]:
    """Build a labelled grid. Each item needs id, image_bytes and product data."""
    if not items:
        raise VisionSearchError("No catalogue images were available for visual search.")
    if len(items) > SHEET_CAPACITY:
        raise ValueError("Too many images for one contact sheet.")

    rows = (len(items) + SHEET_COLS - 1) // SHEET_COLS
    sheet = Image.new("RGB", (SHEET_COLS * CELL_W, rows * CELL_H), "#111111")
    draw = ImageDraw.Draw(sheet)
    mapping = {}

    for index, item in enumerate(items):
        label = f"C{index + 1:02d}"
        col = index % SHEET_COLS
        row = index // SHEET_COLS
        x = col * CELL_W
        y = row * CELL_H
        thumb = _open_thumb(item["image_bytes"])
        sheet.paste(thumb, (x, y))
        draw.rectangle((x, y + CELL_H - LABEL_H, x + CELL_W, y + CELL_H), fill="#111111")
        draw.text((x + 6, y + CELL_H - LABEL_H + 4), label, fill="white")
        mapping[label] = item

    out = io.BytesIO()
    sheet.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue(), mapping


async def match_contact_sheet(
    api_key: str,
    query_image: bytes,
    sheet_image: bytes,
    labels: Iterable[str],
) -> list[dict]:
    label_list = ", ".join(labels)
    payload = await _vision_json(
        api_key,
        (
            "IMAGE 1 is the client reference. IMAGE 2 is a labelled grid of Samrat catalogue images. "
            "Find catalogue cells showing the SAME fixture/design, even if the client image is a screenshot, "
            "WhatsApp-compressed, installed in a room, cropped, or uses a different black/white background. "
            "Do not return merely the same product type. Geometry and distinctive design must agree. "
            f"Valid cell labels: {label_list}. "
            'Return at most 5 plausible cells, strongest first. If none are genuinely plausible, return an empty list. '
            'JSON: {"matches":[{"id":"C01","confidence":0-100,"reason":"short"}]}.'
        ),
        [query_image, sheet_image],
    )
    matches = []
    valid = set(labels)
    for row in payload.get("matches") or []:
        candidate_id = str(row.get("id") or "")
        if candidate_id not in valid:
            continue
        try:
            confidence = float(row.get("confidence") or 0)
        except Exception:
            confidence = 0.0
        if confidence < 55:
            continue
        matches.append(
            {
                "id": candidate_id,
                "confidence": max(0.0, min(100.0, confidence)),
                "reason": str(row.get("reason") or "")[:200],
            }
        )
    return matches[:5]


async def rerank_finalists(
    api_key: str,
    query_image: bytes,
    finalist_items: list[dict],
) -> list[dict]:
    if not finalist_items:
        return []
    sheet, mapping = build_contact_sheet(finalist_items[:SHEET_CAPACITY])
    payload = await _vision_json(
        api_key,
        (
            "IMAGE 1 is the client reference. IMAGE 2 contains finalists from the Samrat catalogue. "
            "Rank only fixtures that could be the SAME physical design. Ignore background, cropping, "
            "room installation, light-on/light-off and WhatsApp compression. Be conservative: if a fixture's "
            "arm count, glass shape, frame/body proportions or crystal arrangement conflicts, reject it. "
            f"Valid labels: {', '.join(mapping.keys())}. "
            'JSON: {"matches":[{"id":"C01","confidence":0-100,"reason":"short"}]}. '
            "Return an empty list rather than an unrelated nearest neighbour."
        ),
        [query_image, sheet],
    )
    out = []
    for row in payload.get("matches") or []:
        label = str(row.get("id") or "")
        item = mapping.get(label)
        if not item:
            continue
        try:
            confidence = float(row.get("confidence") or 0)
        except Exception:
            confidence = 0.0
        if confidence < 60:
            continue
        out.append(
            {
                "item": item,
                "confidence": max(0.0, min(100.0, confidence)),
                "reason": str(row.get("reason") or "")[:200],
            }
        )
    return out[:10]
