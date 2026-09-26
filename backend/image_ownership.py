"""Invisible ownership metadata for Samrat Glass Emporium public images.

This module never changes the private original stored by the upload pipeline.
It adds copyright/ownership metadata to the public derivative and returns a
stable SHA-256 fingerprint that can be stored in MongoDB for later evidence
and traceability.
"""

from __future__ import annotations

import hashlib
import io

from PIL import Image, ImageOps
from PIL.PngImagePlugin import PngInfo

_OWNER = "Samrat Glass Emporium"
_SITE = "https://samratglass.com"
_NOTICE = "© Samrat Glass Emporium. All rights reserved."


def ownership_fingerprint(original_bytes: bytes) -> str:
    """Stable fingerprint of the untouched original bytes."""
    return hashlib.sha256(original_bytes).hexdigest()


def perceptual_fingerprint(original_bytes: bytes, hash_size: int = 16) -> str:
    """Return a deterministic difference-hash (dHash) for visual matching.

    Unlike SHA-256, this fingerprint is based on image luminance structure and
    therefore remains comparable after ordinary resizing or recompression.
    The 16x16 form produces a 256-bit hash. Cropping can change more bits, so
    callers should compare Hamming distance rather than requiring equality.
    """
    if hash_size < 4 or hash_size > 32:
        raise ValueError("hash_size must be between 4 and 32")
    with Image.open(io.BytesIO(original_bytes)) as opened:
        image = ImageOps.exif_transpose(opened).convert("L")
        image = image.resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
        bits = []
        for y in range(hash_size):
            for x in range(hash_size):
                bits.append(image.getpixel((x, y)) > image.getpixel((x + 1, y)))
        value = 0
        for bit in bits:
            value = (value << 1) | int(bit)
        width = (len(bits) + 3) // 4
        return f"{value:0{width}x}"


def perceptual_fingerprint_variants(original_bytes: bytes, hash_size: int = 16) -> list[str]:
    """Return dHash fingerprints for the full frame plus useful crops.

    This makes matching more tolerant of screenshots / room photos where the
    catalogue product occupies only part of the uploaded frame. It is still a
    near-image matcher, not a semantic object-recognition model.
    """
    if hash_size < 4 or hash_size > 32:
        raise ValueError("hash_size must be between 4 and 32")

    def _hash_image(image: Image.Image) -> str:
        gray = image.convert("L").resize(
            (hash_size + 1, hash_size), Image.Resampling.LANCZOS
        )
        bits = []
        for y in range(hash_size):
            for x in range(hash_size):
                bits.append(gray.getpixel((x, y)) > gray.getpixel((x + 1, y)))
        value = 0
        for bit in bits:
            value = (value << 1) | int(bit)
        width = (len(bits) + 3) // 4
        return f"{value:0{width}x}"

    with Image.open(io.BytesIO(original_bytes)) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        width, height = image.size
        if width < 8 or height < 8:
            return [_hash_image(image)]

        boxes = [
            (0, 0, width, height),  # full frame
            (int(width * 0.15), int(height * 0.15), int(width * 0.85), int(height * 0.85)),
            (int(width * 0.20), 0, int(width * 0.80), int(height * 0.65)),  # top-centre
            (int(width * 0.20), int(height * 0.35), int(width * 0.80), height),  # bottom-centre
            (0, int(height * 0.15), int(width * 0.65), int(height * 0.85)),  # left
            (int(width * 0.35), int(height * 0.15), width, int(height * 0.85)),  # right
            (0, 0, int(width * 0.60), int(height * 0.60)),
            (int(width * 0.40), 0, width, int(height * 0.60)),
            (0, int(height * 0.40), int(width * 0.60), height),
            (int(width * 0.40), int(height * 0.40), width, height),
        ]

        hashes = []
        seen = set()
        for box in boxes:
            left, top, right, bottom = box
            if right - left < 4 or bottom - top < 4:
                continue
            fp = _hash_image(image.crop((left, top, right, bottom)))
            if fp not in seen:
                seen.add(fp)
                hashes.append(fp)
        return hashes


def perceptual_distance(left: str, right: str) -> int:
    """Hamming distance between two hexadecimal perceptual fingerprints."""
    if not left or not right or len(left) != len(right):
        raise ValueError("Perceptual fingerprints must be equal-length hex strings")
    return (int(left, 16) ^ int(right, 16)).bit_count()


def _description(asset_id: str | None, fingerprint: str, visual_fingerprint: str | None = None) -> str:
    parts = [
        "Original product image owned by Samrat Glass Emporium",
        f"Source: {_SITE}",
        f"SHA256: {fingerprint}",
    ]
    if visual_fingerprint:
        parts.append(f"dHash256: {visual_fingerprint}")
    if asset_id:
        parts.insert(1, f"Asset ID: {asset_id}")
    return " | ".join(parts)


def embed_ownership_metadata(
    image_bytes: bytes,
    *,
    content_type: str,
    asset_id: str | None = None,
    fingerprint: str | None = None,
    visual_fingerprint: str | None = None,
) -> bytes:
    """Embed invisible copyright metadata in a public image derivative.

    JPEG / WebP use EXIF ownership fields. PNG uses text chunks. Unsupported
    image formats are returned unchanged. The caller should always persist the
    returned fingerprint separately, even when a format cannot carry metadata.
    """
    fp = fingerprint or ownership_fingerprint(image_bytes)
    ct = (content_type or "").split(";", 1)[0].strip().lower()

    if ct not in {"image/jpeg", "image/jpg", "image/png", "image/webp"}:
        return image_bytes

    try:
        with Image.open(io.BytesIO(image_bytes)) as opened:
            image = ImageOps.exif_transpose(opened)
            description = _description(asset_id, fp, visual_fingerprint)
            output = io.BytesIO()

            if ct == "image/png":
                pnginfo = PngInfo()
                # Preserve existing textual metadata where practical.
                for key, value in (opened.info or {}).items():
                    if isinstance(value, str) and key not in {
                        "Copyright", "Author", "Source", "Description",
                        "SGEAssetID", "SGEFingerprint", "SGEVisualFingerprint",
                    }:
                        pnginfo.add_text(str(key), value)
                pnginfo.add_text("Copyright", _NOTICE)
                pnginfo.add_text("Author", _OWNER)
                pnginfo.add_text("Source", _SITE)
                pnginfo.add_text("Description", description)
                if asset_id:
                    pnginfo.add_text("SGEAssetID", asset_id)
                pnginfo.add_text("SGEFingerprint", f"sha256:{fp}")
                if visual_fingerprint:
                    pnginfo.add_text("SGEVisualFingerprint", f"dhash256:{visual_fingerprint}")
                image.save(output, format="PNG", pnginfo=pnginfo, optimize=True)
                return output.getvalue()

            exif = image.getexif()
            # Standard TIFF/EXIF tags broadly understood by DAM and metadata tools.
            exif[270] = description       # ImageDescription
            exif[315] = _OWNER            # Artist
            exif[33432] = _NOTICE         # Copyright
            exif_bytes = exif.tobytes()

            if ct in {"image/jpeg", "image/jpg"}:
                rgb = image.convert("RGB") if image.mode != "RGB" else image
                # "keep" preserves the original JPEG quantisation/subsampling
                # whenever Pillow has that source information available.
                try:
                    rgb.save(
                        output,
                        format="JPEG",
                        quality="keep",
                        subsampling="keep",
                        qtables="keep",
                        exif=exif_bytes,
                        optimize=True,
                    )
                except Exception:
                    output = io.BytesIO()
                    rgb.save(output, format="JPEG", quality=95, exif=exif_bytes, optimize=True)
                return output.getvalue()

            # WebP supports EXIF in Pillow. Keep high quality because this is a
            # public derivative; the untouched original remains separately stored.
            image.save(output, format="WEBP", quality=95, method=6, exif=exif_bytes)
            return output.getvalue()
    except Exception:
        # Ownership protection must never make an otherwise valid upload fail.
        return image_bytes
