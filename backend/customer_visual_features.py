"""Customer image-search features. No admin/quotation dependencies."""
import hashlib
import io
import os
import threading

import numpy as np
from PIL import Image, ImageOps

MODEL_REPO = "Xenova/dinov2-small"
MODEL_REVISION = "c2bb04a51fab207c420665f1946016107bffc701"
INDEX_VERSION = "dinov2-small-fp32-v1"
EMBEDDING_DIM = 384
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
    # Pinned DINOv2 processor: resize shortest edge to 256, crop to 224.
    width, height = image.size
    scale = 256 / min(width, height)
    resized = image.resize((int(width * scale), int(height * scale)), Image.Resampling.BICUBIC)
    left, top = (resized.width - 224) // 2, (resized.height - 224) // 2
    crop = resized.crop((left, top, left + 224, top + 224))
    pixels = np.asarray(crop, dtype=np.float32) / 255.0
    pixels = (pixels - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / np.array([0.229, 0.224, 0.225], dtype=np.float32)
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
                MODEL_REPO, "onnx/model.onnx", revision=MODEL_REVISION,
            )
            options = ort.SessionOptions()
            options.intra_op_num_threads = 2
            options.inter_op_num_threads = 1
            session = ort.InferenceSession(path, sess_options=options, providers=["CPUExecutionProvider"])
            output = next((o for o in session.get_outputs() if o.name == "last_hidden_state"), None)
            if output is None or output.shape[-1] != EMBEDDING_DIM:
                raise ValueError("CUSTOMER_IMAGE_MODEL_PATH must point to the pinned DINOv2-small model")
            self.session = session

    def encode(self, image):
        if self.session is None:
            raise RuntimeError("Visual model is not ready")
        # A padded view complements the standard centre crop for tall lights.
        whole = ImageOps.pad(image, (256, 256), method=Image.Resampling.BICUBIC, color="white")
        vectors = []
        with self.lock:
            for view in (image, whole):
                # The CLS token represents the fixture; patch tokens stay local.
                vector = self.session.run(["last_hidden_state"], {"pixel_values": model_input(view)})[0][0, 0]
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
        if not exact and query is not None and query.shape == (2, EMBEDDING_DIM) and stored.shape == (2, EMBEDDING_DIM):
            score = float(np.max(query @ stored.T))
        if not exact and score < threshold:
            continue
        for product in products_by_url.get(row["url"], []):
            candidate = {"product": product, "match_type": "exact" if exact else "similar", "score": score}
            old = ranked.get(product["id"])
            if old is None or (exact, score) > (old["match_type"] == "exact", old["score"]):
                ranked[product["id"]] = candidate
    return sorted(ranked.values(), key=lambda x: (x["match_type"] != "exact", -x["score"], x["product"]["id"]))[:limit]
