"""Admin media-library aggregation and metadata helpers.

This module is deliberately side-effect free except for byte inspection. It
does not delete, move, or rewrite media. Existing product and project records
remain the source of truth for where an asset is used.
"""
from __future__ import annotations

import hashlib
import io
from collections import defaultdict
from typing import Iterable

from PIL import Image

MEDIA_USAGE_TYPES = (
    "unclassified",
    "white_bulbs_off",
    "black_bulbs_on",
    "detail",
    "installation",
    "before_after",
    "video_reel",
    "original_unedited",
)

MEDIA_USAGE_LABELS = {
    "unclassified": "Unclassified",
    "white_bulbs_off": "White background / bulbs off",
    "black_bulbs_on": "Black background / bulbs on",
    "detail": "Detail",
    "installation": "Installation",
    "before_after": "Before / after",
    "video_reel": "Video / Reel",
    "original_unedited": "Original unedited photograph",
}

REQUIRED_PRODUCT_SLOTS = ("white_bulbs_off", "black_bulbs_on")
_VIDEO_EXTENSIONS = (".mp4", ".webm", ".mov", ".m4v")


def asset_id_for_url(url: str) -> str:
    return hashlib.sha256((url or "").strip().encode("utf-8")).hexdigest()[:24]


def public_url_for_file(row: dict) -> str:
    path = (row.get("storage_path") or "").strip()
    return f"/api/files/{path}" if path else ""


def inspect_media_bytes(data: bytes, content_type: str = "") -> dict:
    """Return durable content metadata without changing the bytes."""
    result = {
        "sha256": hashlib.sha256(data).hexdigest(),
        "width": None,
        "height": None,
        "background_tone": None,
        "background_luminance": None,
    }
    if (content_type or "").lower().startswith("image/"):
        with Image.open(io.BytesIO(data)) as image:
            result["width"], result["height"] = image.size
            sample = image.convert("RGB")
            sample.thumbnail((80, 80))
            width, height = sample.size
            border = []
            edge = max(1, min(width, height) // 10)
            for y in range(height):
                for x in range(width):
                    if x < edge or x >= width - edge or y < edge or y >= height - edge:
                        red, green, blue = sample.getpixel((x, y))
                        border.append(0.2126 * red + 0.7152 * green + 0.0722 * blue)
            if border:
                average = sum(border) / len(border)
                bright_fraction = sum(value >= 225 for value in border) / len(border)
                dark_fraction = sum(value <= 35 for value in border) / len(border)
                if average >= 215 and bright_fraction >= 0.70:
                    tone = "white"
                elif average <= 45 and dark_fraction >= 0.70:
                    tone = "black"
                else:
                    tone = "mixed"
                result["background_tone"] = tone
                result["background_luminance"] = round(average, 1)
    return result


def _add_reference(refs: dict, url: str, use: dict) -> None:
    cleaned = (url or "").strip()
    if not cleaned:
        return
    refs.setdefault(cleaned, []).append(use)


def collect_references(
    products: Iterable[dict],
    settings: dict | None,
    hero_slides: Iterable[dict],
    category_images: Iterable[dict],
) -> dict[str, list[dict]]:
    refs: dict[str, list[dict]] = {}

    for product in products:
        for index, url in enumerate(product.get("images") or []):
            _add_reference(refs, url, {
                "type": "product",
                "id": product.get("id"),
                "name": product.get("name") or "Unnamed product",
                "sku": product.get("sku") or "",
                "status": product.get("status") or "",
                "slot": index + 1,
            })

    gallery = (((settings or {}).get("homepage_content") or {}).get("gallery") or {})
    for index, project in enumerate(gallery.get("items") or []):
        for slot, url in enumerate(project.get("images") or []):
            _add_reference(refs, url, {
                "type": "project",
                "id": str(index),
                "name": project.get("title") or f"Project {index + 1}",
                "location": project.get("location") or "",
                "slot": slot + 1,
            })

    for slide in hero_slides:
        _add_reference(refs, slide.get("image_url") or slide.get("url"), {
            "type": "hero",
            "id": slide.get("id"),
            "name": slide.get("alt_text") or "Homepage hero",
        })

    for item in category_images:
        _add_reference(refs, item.get("image_url"), {
            "type": "category",
            "id": item.get("category"),
            "name": item.get("category") or "Category image",
        })

    return refs


def _usage_recommendation(
    *, url: str, kind: str, background_tone: str | None, used_by: list[dict]
) -> dict | None:
    """Return a conservative SOP recommendation; never guess unsupported types."""
    kinds = {use.get("type") for use in used_by}
    lower_url = url.lower()

    if kind == "video" or "/ig_covers/" in lower_url:
        return {
            "usage_type": "video_reel",
            "label": MEDIA_USAGE_LABELS["video_reel"],
            "confidence": 0.98 if kind == "video" else 0.90,
            "reason": (
                "The asset is a video."
                if kind == "video"
                else "The stored path identifies an Instagram/Reel cover."
            ),
        }

    if "project" in kinds:
        return {
            "usage_type": "installation",
            "label": MEDIA_USAGE_LABELS["installation"],
            "confidence": 0.98,
            "reason": "The asset is used in the verified Project Gallery.",
        }

    if "product" in kinds and background_tone == "white":
        return {
            "usage_type": "white_bulbs_off",
            "label": MEDIA_USAGE_LABELS["white_bulbs_off"],
            "confidence": 0.92,
            "reason": (
                "The image border is predominantly white. Per the product-photo "
                "SOP, confirm that its bulbs are off before approval."
            ),
        }

    if "product" in kinds and background_tone == "black":
        return {
            "usage_type": "black_bulbs_on",
            "label": MEDIA_USAGE_LABELS["black_bulbs_on"],
            "confidence": 0.92,
            "reason": (
                "The image border is predominantly black. Per the product-photo "
                "SOP, confirm that its bulbs are on before approval."
            ),
        }

    return None


def build_media_library_report(
    *,
    products: list[dict],
    settings: dict | None,
    files: list[dict],
    metadata: list[dict],
    hero_slides: list[dict] | None = None,
    category_images: list[dict] | None = None,
) -> dict:
    refs = collect_references(
        products,
        settings,
        hero_slides or [],
        category_images or [],
    )
    file_by_url = {
        public_url_for_file(row): row
        for row in files
        if public_url_for_file(row)
    }
    metadata_by_id = {row.get("id"): row for row in metadata if row.get("id")}

    # Uploaded but currently unused files must still remain visible.
    for url in file_by_url:
        refs.setdefault(url, [])

    assets = []
    for url, used_by in refs.items():
        asset_id = asset_id_for_url(url)
        file_row = file_by_url.get(url)
        meta = metadata_by_id.get(asset_id) or {}
        content_type = (file_row or {}).get("content_type") or ""
        is_video = (
            (file_row or {}).get("kind") == "video"
            or content_type.startswith("video/")
            or url.lower().split("?", 1)[0].endswith(_VIDEO_EXTENSIONS)
        )
        usage_type = meta.get("usage_type") or (
            "video_reel" if is_video else "unclassified"
        )
        if usage_type not in MEDIA_USAGE_TYPES:
            usage_type = "unclassified"

        if file_row:
            validity = "valid"
        elif url.startswith("/api/files/"):
            validity = "invalid"
        elif url.startswith("/"):
            # Other relative URLs are application-owned routes (for example
            # hero-slide delivery endpoints), not external media.
            validity = "valid"
        else:
            validity = "unverified"

        width = (file_row or {}).get("width")
        height = (file_row or {}).get("height")
        low_resolution = bool(
            width and height and (max(width, height) < 1200 or min(width, height) < 800)
        )
        recommendation = None
        if usage_type == "unclassified":
            recommendation = _usage_recommendation(
                url=url,
                kind="video" if is_video else "image",
                background_tone=(file_row or {}).get("background_tone"),
                used_by=used_by,
            )

        assets.append({
            "id": asset_id,
            "url": url,
            "kind": "video" if is_video else "image",
            "usage_type": usage_type,
            "usage_label": MEDIA_USAGE_LABELS[usage_type],
            "width": width,
            "height": height,
            "background_tone": (file_row or {}).get("background_tone"),
            "background_luminance": (file_row or {}).get("background_luminance"),
            "recommendation": recommendation,
            "size_bytes": (file_row or {}).get("size"),
            "content_type": content_type or None,
            "sha256": (file_row or {}).get("sha256"),
            "uploaded": bool(file_row),
            "file_id": (file_row or {}).get("id"),
            "original_available": bool((file_row or {}).get("original_path")),
            "validity": validity,
            "low_resolution": low_resolution,
            "used_by": used_by,
            "use_count": len(used_by),
            # Reuse across a product, category, hero or project is intentional.
            # Flag only the same URL repeated inside the same owning record.
            "duplicate_url": len({
                (use.get("type"), use.get("id")) for use in used_by
            }) < len(used_by),
            "duplicate_content": False,
            "notes": meta.get("notes") or "",
        })

    by_hash: dict[str, list[dict]] = defaultdict(list)
    for asset in assets:
        if asset.get("sha256"):
            by_hash[asset["sha256"]].append(asset)
    duplicate_content_groups = 0
    for group in by_hash.values():
        distinct_urls = {asset["url"] for asset in group}
        if len(distinct_urls) > 1:
            duplicate_content_groups += 1
            for asset in group:
                asset["duplicate_content"] = True

    # A repeated URL inside one owner is one potential duplicate group.
    duplicate_url_groups = sum(asset["duplicate_url"] for asset in assets)

    usage_by_product: dict[str, set[str]] = defaultdict(set)
    product_asset_types: dict[str, list[str]] = defaultdict(list)
    product_map = {p.get("id"): p for p in products if p.get("id")}
    for asset in assets:
        for use in asset["used_by"]:
            if use.get("type") == "product":
                product_id = use.get("id")
                usage_by_product[product_id].add(asset["usage_type"])
                product_asset_types[product_id].append(asset["usage_type"])

    # Pair findings are only reliable after every image attached to that product
    # has an explicit usage classification. Until then the status is "not assessed",
    # not "missing".
    assessed_product_ids = {
        product_id
        for product_id, usage_types in product_asset_types.items()
        if usage_types and all(value != "unclassified" for value in usage_types)
    }

    missing_products = []
    for product_id, product in product_map.items():
        if product_id not in assessed_product_ids:
            continue
        present = usage_by_product.get(product_id, set())
        missing = [slot for slot in REQUIRED_PRODUCT_SLOTS if slot not in present]
        if missing:
            missing_products.append({
                "id": product_id,
                "name": product.get("name") or "Unnamed product",
                "sku": product.get("sku") or "",
                "status": product.get("status") or "",
                "missing": missing,
                "missing_labels": [MEDIA_USAGE_LABELS[slot] for slot in missing],
            })

    assets.sort(key=lambda row: (
        row["validity"] == "valid",
        not row["duplicate_content"],
        not row["duplicate_url"],
        row["usage_label"],
        row["url"],
    ))
    missing_products.sort(key=lambda row: (row["sku"], row["name"]))

    return {
        "usage_types": [
            {"value": key, "label": MEDIA_USAGE_LABELS[key]}
            for key in MEDIA_USAGE_TYPES
        ],
        "required_product_slots": list(REQUIRED_PRODUCT_SLOTS),
        "summary": {
            "assets": len(assets),
            "images": sum(a["kind"] == "image" for a in assets),
            "videos": sum(a["kind"] == "video" for a in assets),
            "uploaded": sum(a["uploaded"] for a in assets),
            "unused": sum(a["use_count"] == 0 for a in assets),
            "invalid": sum(a["validity"] == "invalid" for a in assets),
            "unverified_external": sum(a["validity"] == "unverified" for a in assets),
            "low_resolution": sum(a["low_resolution"] for a in assets),
            "low_resolution_in_use": sum(
                a["low_resolution"] and a["use_count"] > 0 for a in assets
            ),
            "duplicate_assets": sum(
                a["duplicate_url"] or a["duplicate_content"] for a in assets
            ),
            "duplicate_groups": duplicate_content_groups + duplicate_url_groups,
            "unclassified": sum(a["usage_type"] == "unclassified" for a in assets),
            "classified": sum(a["usage_type"] != "unclassified" for a in assets),
            "recommendations": sum(bool(a.get("recommendation")) for a in assets),
            "high_confidence_recommendations": sum(
                (a.get("recommendation") or {}).get("confidence", 0) >= 0.90
                for a in assets
            ),
            "products_total": len(product_map),
            "products_pair_assessed": len(assessed_product_ids),
            "products_pair_unassessed": len(product_map) - len(assessed_product_ids),
            "products_missing_required_slots": len(missing_products),
        },
        "assets": assets,
        "missing_products": missing_products,
    }
