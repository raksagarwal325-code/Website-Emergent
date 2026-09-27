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


VISUAL_INDEX_VERSION = "structured-visual-v1"
INDEX_SHEET_CAPACITY = 36

_SIGNATURE_FIELDS = (
    "category",
    "fixture_type",
    "arm_count",
    "light_count",
    "tier_count",
    "shade_count",
    "glass_shape",
    "shade_shape",
    "body_shape",
    "frame_shape",
    "drop_style",
    "crystal_layout",
    "silhouette",
    "metal_finish",
    "glass_color",
    "motif",
)


def _clean_value(value):
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        return value
    return re.sub(r"\s+", " ", str(value).strip().lower())


def normalize_visual_signature(raw: dict | None) -> dict:
    raw = raw or {}
    out = {field: _clean_value(raw.get(field)) for field in _SIGNATURE_FIELDS}
    for numeric in ("arm_count", "light_count", "tier_count", "shade_count"):
        value = raw.get(numeric)
        try:
            out[numeric] = int(value) if value not in (None, "", "unknown", "unclear") else None
        except Exception:
            out[numeric] = None
    for key in ("distinctive_parts", "visual_tokens"):
        values = raw.get(key) or []
        if isinstance(values, str):
            values = re.split(r"[,;|]", values)
        cleaned = []
        seen = set()
        for value in values:
            token = _clean_value(value)
            if token and token not in seen:
                seen.add(token)
                cleaned.append(token)
        out[key] = cleaned[:16]
    return out


def _signature_prompt(label_instruction: str) -> str:
    return (
        label_instruction
        + " Create a stable visual fingerprint for each fixture. Ignore background, room, "
        "lighting, screenshot borders, photo angle and compression. Describe the fixture itself only. "
        "Use short normalized values. If a count cannot be seen, use null. "
        "Fields: category, fixture_type, arm_count, light_count, tier_count, shade_count, "
        "glass_shape, shade_shape, body_shape, frame_shape, drop_style, crystal_layout, "
        "silhouette, metal_finish, glass_color, motif, distinctive_parts (max 8), "
        "visual_tokens (max 12). visual_tokens should capture distinctive geometry such as "
        "'scroll arms', 'ribbed amber tulip glass', 'basket crystal fringe', 'bell jar', "
        "'central glass bowl', 'double wall sconce'. Return JSON only."
    )


async def describe_index_sheet(
    api_key: str,
    sheet_image: bytes,
    labels: Iterable[str],
) -> dict[str, dict]:
    labels = list(labels)
    payload = await _vision_json(
        api_key,
        _signature_prompt(
            "IMAGE 1 is a labelled grid of Samrat catalogue product images. "
            f"Return one fingerprint for every visible label from this list: {', '.join(labels)}. "
            'JSON: {"items":[{"id":"C01","signature":{...}}]}.'
        ),
        [sheet_image],
    )
    valid = set(labels)
    out = {}
    for row in payload.get("items") or []:
        label = str(row.get("id") or "")
        if label in valid and isinstance(row.get("signature"), dict):
            out[label] = normalize_visual_signature(row.get("signature"))
    return out


async def analyze_query_signature(api_key: str, query_image: bytes) -> dict:
    payload = await _vision_json(
        api_key,
        _signature_prompt(
            "IMAGE 1 is a client reference photo of one decorative-lighting fixture. "
            'JSON: {"signature":{...}}.'
        ),
        [query_image],
    )
    return normalize_visual_signature(payload.get("signature") or {})


def _token_set(values) -> set[str]:
    result = set()
    for value in values or []:
        text = _clean_value(value)
        for token in re.findall(r"[a-z0-9]+", text):
            if len(token) >= 3:
                result.add(token)
    return result


def _jaccard(left, right) -> float:
    a = _token_set(left)
    b = _token_set(right)
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def visual_signature_score(query: dict, candidate: dict) -> float:
    """Weighted 0–100 similarity for two AI-normalized fixture fingerprints."""
    query = normalize_visual_signature(query)
    candidate = normalize_visual_signature(candidate)
    score = 0.0
    possible = 0.0

    weighted_fields = {
        "category": 14,
        "fixture_type": 12,
        "glass_shape": 9,
        "shade_shape": 8,
        "body_shape": 10,
        "frame_shape": 10,
        "drop_style": 6,
        "crystal_layout": 6,
        "silhouette": 10,
        "metal_finish": 3,
        "glass_color": 3,
        "motif": 5,
    }
    for field, weight in weighted_fields.items():
        q = query.get(field)
        c = candidate.get(field)
        if q and c:
            possible += weight
            if q == c:
                score += weight
            elif field in {"category", "fixture_type"}:
                score -= weight * 0.65
            else:
                qa = _token_set([q])
                ca = _token_set([c])
                if qa and ca:
                    score += weight * (len(qa & ca) / len(qa | ca))

    numeric_fields = {
        "arm_count": 15,
        "light_count": 13,
        "tier_count": 8,
        "shade_count": 8,
    }
    for field, weight in numeric_fields.items():
        q = query.get(field)
        c = candidate.get(field)
        if q is not None and c is not None:
            possible += weight
            delta = abs(int(q) - int(c))
            if delta == 0:
                score += weight
            elif delta == 1 and field in {"arm_count", "light_count", "shade_count"}:
                score += weight * 0.2
            else:
                score -= weight * 0.6

    possible += 26
    score += 14 * _jaccard(query.get("distinctive_parts"), candidate.get("distinctive_parts"))
    score += 12 * _jaccard(query.get("visual_tokens"), candidate.get("visual_tokens"))

    if possible <= 0:
        return 0.0
    normalized = max(0.0, min(100.0, (score / possible) * 100.0))
    return round(normalized, 1)
