"""Server-side product/gallery image watermarking.

Loads the brand logo once (from /app/frontend/public/logo.jpeg), converts it
into a clean transparent silhouette mask, and provides a helper that composites
that mask into the exact center of any uploaded image with configurable size,
opacity and adaptive tone (white on dark photos, dark grey on light photos).
"""

from __future__ import annotations

import io
import logging
import os
from typing import Optional

from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# Path to the brand logo used to derive the watermark silhouette.
LOGO_PATH = os.environ.get(
    "WATERMARK_LOGO_PATH", "/app/frontend/public/logo.jpeg"
)

# Pixels darker than this (in the source logo grayscale) are considered "logo ink"
# — the rest becomes fully transparent. 130 works well for the copper/terracotta
# background + dark-brown logo we ship.
_DARK_INK_THRESHOLD = 130

# Cache the transparent silhouette (RGBA, tinted white) so we don't reload the
# logo on every upload.
_watermark_silhouette: Optional[Image.Image] = None


def _load_silhouette() -> Image.Image:
    """Convert the ship-with logo into a transparent silhouette (white ink,
    transparent background). Called once, then cached."""
    global _watermark_silhouette
    if _watermark_silhouette is not None:
        return _watermark_silhouette

    img = Image.open(LOGO_PATH).convert("RGBA")

    # Trim any solid border so the watermark isn't a big rectangle.
    # Convert to grayscale to find bounding box of dark ink.
    gray = img.convert("L")
    mask = gray.point(lambda v: 255 if v < _DARK_INK_THRESHOLD else 0)
    bbox = mask.getbbox()
    if bbox:
        img = img.crop(bbox)
        gray = gray.crop(bbox)
        mask = mask.crop(bbox)

    # Build an RGBA image: white pixels where ink was, alpha = the mask intensity.
    w, h = img.size
    silhouette = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    alpha = gray.point(
        lambda v: max(0, min(255, int((_DARK_INK_THRESHOLD - v) * 255 / _DARK_INK_THRESHOLD)))
        if v < _DARK_INK_THRESHOLD
        else 0
    )
    # Fill with pure white and use derived alpha
    silhouette.paste((255, 255, 255, 255), mask=alpha)
    silhouette.putalpha(alpha)

    _watermark_silhouette = silhouette
    logger.info(f"Watermark silhouette loaded: {silhouette.size}")
    return silhouette


def _tint(silhouette: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    """Return a tinted copy of the silhouette (preserves alpha)."""
    r, g, b = color
    solid = Image.new("RGBA", silhouette.size, (r, g, b, 255))
    solid.putalpha(silhouette.getchannel("A"))
    return solid


def _sample_luminance(img: Image.Image, region_frac: float = 0.5) -> float:
    """Average luminance (0-255) over the CENTER region where the watermark
    will land. Used to decide light-on-dark vs dark-on-light."""
    w, h = img.size
    cw, ch = int(w * region_frac), int(h * region_frac)
    left = (w - cw) // 2
    top = (h - ch) // 2
    crop = img.crop((left, top, left + cw, top + ch)).convert("L")
    return sum(crop.getdata()) / max(1, cw * ch)


def apply_watermark(
    image_bytes: bytes,
    *,
    opacity: float = 0.15,
    size_pct: float = 0.30,
    adaptive_tone: bool = True,
    content_type: str = "image/png",
) -> bytes:
    """Composite the brand watermark at the exact center of the input image.

    Args:
        image_bytes: source image bytes.
        opacity: 0..1 alpha multiplier applied to the watermark.
        size_pct: watermark width as a fraction of image width (0..1).
        adaptive_tone: when true, use white on dark images and dark grey on
            light images. When false, always use white.
        content_type: MIME type of the source (drives output format).

    Returns:
        Watermarked image bytes in the same format as the source.
    """
    try:
        src = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        logger.error(f"Watermark: could not open source image: {e}")
        return image_bytes

    # Normalize orientation from EXIF and drop rotation metadata so the crop
    # actually lands where the pixels sit.
    src = ImageOps.exif_transpose(src)

    original_mode = src.mode
    if original_mode not in ("RGB", "RGBA"):
        src = src.convert("RGBA" if "A" in original_mode else "RGB")

    img_w, img_h = src.size

    # Guard against absurd inputs.
    opacity = max(0.0, min(1.0, float(opacity)))
    size_pct = max(0.05, min(0.90, float(size_pct)))
    if opacity == 0 or size_pct == 0:
        return image_bytes

    # Pick tone
    if adaptive_tone:
        lum = _sample_luminance(src)
        color = (245, 240, 235) if lum < 140 else (40, 26, 22)
    else:
        color = (255, 255, 255)

    # Resize silhouette to target width, preserve aspect ratio
    silhouette = _load_silhouette()
    target_w = int(img_w * size_pct)
    aspect = silhouette.size[1] / silhouette.size[0]
    target_h = max(1, int(target_w * aspect))
    # Cap height to 80% of image so extreme portrait images stay clean
    if target_h > img_h * 0.85:
        target_h = int(img_h * 0.85)
        target_w = int(target_h / aspect)

    stamp = silhouette.resize((target_w, target_h), Image.LANCZOS)
    stamp = _tint(stamp, color)

    # Apply opacity by scaling the alpha channel
    alpha = stamp.getchannel("A")
    alpha = alpha.point(lambda v: int(v * opacity))
    stamp.putalpha(alpha)

    # Composite at exact center
    canvas = src.convert("RGBA") if src.mode != "RGBA" else src.copy()
    left = (img_w - target_w) // 2
    top = (img_h - target_h) // 2
    canvas.alpha_composite(stamp, dest=(left, top))

    # Encode
    out = io.BytesIO()
    ct = (content_type or "").lower()
    if ct in ("image/jpeg", "image/jpg"):
        canvas.convert("RGB").save(out, format="JPEG", quality=90, optimize=True)
    elif ct == "image/webp":
        canvas.save(out, format="WEBP", quality=92, method=6)
    else:
        # Default to PNG to preserve any alpha in the source.
        canvas.save(out, format="PNG", optimize=True)
    return out.getvalue()


def reset_cache() -> None:
    """Clear the cached silhouette. Call if the source logo changes on disk."""
    global _watermark_silhouette
    _watermark_silhouette = None
