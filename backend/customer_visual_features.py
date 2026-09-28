"""Customer image-search features. No admin/quotation dependencies."""
import hashlib
import io
import os
import threading

import numpy as np
from PIL import Image, ImageOps

MODEL_REPO = "Xenova/clip-vit-base-patch32"
MODEL_REVISION = "d15189d7028b43f1d3e65039190477f6af591c2a"
INDEX_VERSION = "clip-b32-int8-v1"
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 20_000_000


def decode_image(data):
    if not data or len(data) > MAX_BYTES:
        raise ValueError("Choose an image smaller than 10 MB.")
    with Image.open(io.BytesIO(data)) as source:
        if source.format not in {"JPEG", "PNG", "WEBP"}:
            raise ValueError("Choose a JPG, PNG or WebP image.")
        if source.width * source.height > MAX_PIXELS or max(source.size) / min(source.size) > 30:
            raise ValueError("Please use an image under 20 megapixels cropped around the product.")
        source.seek(0)
        image = ImageOps.exif_transpose(source).convert("RGBA")
        background = Image.new("RGBA", image.size, "white")
        background.alpha_composite(image)
        return background.convert("RGB")


def image_hashes(data, image):
    pixels = hashlib.sha256()
    pixels.update(f"{image.width}x{image.height}:RGB:".encode())
    pixels.update(image.tobytes())
    return {"sha256": hashlib.sha256(data).hexdigest(), "pixels": pixels.hexdigest()}


def model_input(image):
    # CLIP's published RGB/bicubic, shortest-edge resize and centre crop.
    width, height = image.size
    scale = 224 / min(width, height)
    resized = image.resize((int(width * scale), int(height * scale)), Image.Resampling.BICUBIC)
    left, top = (resized.width - 224) // 2, (resized.height - 224) // 2
    crop = resized.crop((left, top, left + 224, top + 224))
    pixels = np.asarray(crop, dtype=np.float32) / 255.0
    pixels = (pixels - np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)) / np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)
    return pixels.transpose(2, 0, 1)[None].astype(np.float32)


class VisualEncoder:
    def __init__(self):
        self.session = None
        self.lock = threading.Lock()

    def load(self):
        import onnxruntime as ort
        from huggingface_hub import hf_hub_download
        with self.lock:
            if self.session is not None:
                return
            path = os.environ.get("CUSTOMER_IMAGE_MODEL_PATH") or hf_hub_download(
                MODEL_REPO, "onnx/vision_model_quantized.onnx", revision=MODEL_REVISION,
            )
            options = ort.SessionOptions()
            options.intra_op_num_threads = 2
            options.inter_op_num_threads = 1
            self.session = ort.InferenceSession(path, sess_options=options, providers=["CPUExecutionProvider"])

    def encode(self, image):
        if self.session is None:
            raise RuntimeError("Visual model is not ready")
        # A whole-object view complements the standard centre crop for tall lights.
        whole = ImageOps.pad(image, (224, 224), method=Image.Resampling.BICUBIC, color="white")
        vectors = []
        with self.lock:
            for view in (image, whole):
                vector = self.session.run(["image_embeds"], {"pixel_values": model_input(view)})[0][0]
                vector = vector / max(float(np.linalg.norm(vector)), 1e-12)
                vectors.append(vector.astype(float).tolist())
        return vectors


def rank_images(hashes, vectors, rows, products_by_url, limit=12, threshold=0.72):
    """Deduplicate by product, reserve exact labels for byte/pixel identity."""
    ranked = {}
    query = np.asarray(vectors, dtype=np.float32) if vectors else None
    for row in rows:
        exact = bool(hashes["sha256"] == row.get("sha256") or hashes["pixels"] == row.get("pixels"))
        score = 1.0 if exact else 0.0
        stored = np.asarray(row.get("vectors") or [], dtype=np.float32)
        if not exact and query is not None and stored.shape == (2, 512):
            score = float(np.max(query @ stored.T))
        if not exact and score < threshold:
            continue
        for product in products_by_url.get(row["url"], []):
            candidate = {"product": product, "match_type": "exact" if exact else "similar", "score": score}
            old = ranked.get(product["id"])
            if old is None or (exact, score) > (old["match_type"] == "exact", old["score"]):
                ranked[product["id"]] = candidate
    return sorted(ranked.values(), key=lambda x: (x["match_type"] != "exact", -x["score"], x["product"]["id"]))[:limit]
