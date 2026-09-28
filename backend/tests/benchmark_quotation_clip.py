"""Read-only trial of image embeddings against published catalogue photos.

Run in /app with the site's existing backend environment. Nothing is inserted,
updated, deleted, or attached to a quotation. The exact query photo is omitted
from the candidates for that query.
"""

import argparse
import hashlib
import io
import os
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
import onnxruntime as ort
from dotenv import load_dotenv
from PIL import Image, ImageOps
from pymongo import MongoClient

MODEL_URL = "https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main/onnx/vision_model_quantized.onnx"
MODEL_SHA256 = "583fd1110a514667812fee7d684952aaf82a99b959760c8d7dca7e0ab9839299"
MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)
MEDIA_PREFIX = "lumiere-catalog/products/"

# The user's public project pages name the linked SKU for each real site photo.
# Three distinct installation views for each of three chandeliers, plus three
# other product families. No catalogue image is manually linked in the matcher.
CASES = {
    "SGE-CH-007": [
        "7ae1bd2d-3f6d-427f-85f5-3dd96aa4dd4f.jpg",
        "e48d2f72-412b-43cf-9d1d-471896148390.jpg",
        "77d21a89-952b-4ed1-a4b8-2edffdc7e48d.jpg",
    ],
    "SGE-CH-004": [
        "5f8891a9-c98b-45fc-9247-71a9d0312adf.jpg",
        "6c863b27-a33b-4c61-907b-530ecb819f96.jpg",
        "a93ae0fd-7494-49ad-8762-884b72b5ee0d.jpg",
    ],
    "SGE-CH-090": [
        "e4d96337-64b7-4de5-aa8e-320eb7b310f0.jpg",
        "f1605c01-69e6-4563-8100-a8564f7fd727.jpg",
        "826bec22-b89f-4912-bad7-c46f2a3000c4.jpg",
    ],
    "SGE-TL-025": ["684dd633-6e63-4e5a-be1d-c1cb2e0ab651.jpeg"],
    "SGE-CS-008": ["7dc38e6b-9979-4626-990f-52961c5f66e6.jpeg"],
    "SGE-HL-066": ["8dbd2cc6-b086-47ed-8b82-6152ae82ad4b.jpeg"],
}


def storage_path(url):
    path = urlparse(str(url)).path
    if path.startswith("/api/files/"):
        return path.removeprefix("/api/files/")
    return ""


def get_model(model_path):
    model_path.parent.mkdir(parents=True, exist_ok=True)
    if model_path.exists():
        digest = hashlib.sha256(model_path.read_bytes()).hexdigest()
        if digest == MODEL_SHA256:
            print("Model: verified cached file", flush=True)
            return model_path
        raise RuntimeError("Cached model has an unexpected SHA256; remove the cache file before retrying")
    print("Downloading 89 MB visual model once; catalogue records are unchanged", flush=True)
    temp = model_path.with_suffix(".partial")
    digest = hashlib.sha256()
    try:
        with urllib.request.urlopen(MODEL_URL, timeout=120) as source, temp.open("wb") as target:
            while chunk := source.read(1024 * 1024):
                target.write(chunk)
                digest.update(chunk)
        if digest.hexdigest() != MODEL_SHA256:
            raise RuntimeError("Downloaded model failed the published SHA256 check")
        temp.replace(model_path)
    finally:
        temp.unlink(missing_ok=True)
    return model_path


def prepare(content):
    with Image.open(io.BytesIO(content)) as source:
        im = ImageOps.exif_transpose(source).convert("RGB")
    w, h = im.size
    scale = 224 / min(w, h)
    im = im.resize((round(w * scale), round(h * scale)), Image.Resampling.BICUBIC)
    left = (im.width - 224) // 2
    top = (im.height - 224) // 2
    im = im.crop((left, top, left + 224, top + 224))
    pixels = np.asarray(im, dtype=np.float32) / 255.0
    return np.transpose((pixels - MEAN) / STD, (2, 0, 1))[None, ...]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, default=Path("/tmp/sge-visual-benchmark/vision_model_quantized.onnx"))
    args = parser.parse_args()
    load_dotenv("/app/backend/.env")
    if not os.environ.get("MONGO_URL") or not os.environ.get("DB_NAME"):
        raise RuntimeError("Backend Mongo configuration missing; no benchmark was run")
    model_path = get_model(args.model)
    client = MongoClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=10000)
    db = client[os.environ["DB_NAME"]]
    products = list(db.products.find(
        {"status": "published", "images": {"$exists": True, "$ne": []}},
        {"_id": 0, "sku": 1, "images": 1},
    ))
    by_path = {}
    for product in products:
        for image in product.get("images") or []:
            path = storage_path(image)
            if path:
                by_path.setdefault(path, set()).add(str(product.get("sku") or ""))
    query_paths = {MEDIA_PREFIX + file for files in CASES.values() for file in files}
    wanted = list(set(by_path) | query_paths)
    file_rows = db.files.find(
        {"storage_path": {"$in": wanted}},
        {"_id": 0, "storage_path": 1, "visual_thumbnail": 1},
    )
    thumbnails = {r["storage_path"]: bytes(r["visual_thumbnail"])
                  for r in file_rows if r.get("visual_thumbnail")}
    print(f"Published products: {len(products)}; catalogue image views: {len(by_path)}; "
          f"cached thumbnails: {sum(p in thumbnails for p in by_path)}", flush=True)
    if len(products) < 300 or sum(p in thumbnails for p in by_path) < 500:
        raise RuntimeError("Catalogue index is incomplete: refusing a misleading small-sample result")
    missing_queries = sorted(query_paths - thumbnails.keys())
    if missing_queries:
        # Project photos can be absent from the stored thumbnail index. Read
        # public images only; no authenticated endpoints or database writes.
        for path in missing_queries:
            url = "https://samratglass.com/api/files/" + path
            with urllib.request.urlopen(url, timeout=30) as response:
                content = response.read(25 * 1024 * 1024 + 1)
            if len(content) > 25 * 1024 * 1024:
                raise RuntimeError("A test photo exceeds the 25 MB upload limit")
            thumbnails[path] = content

    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(model_path), sess_options=options, providers=["CPUExecutionProvider"])
    inputs = session.get_inputs()
    outputs = [item for item in session.get_outputs() if "image_embeds" in item.name]
    if len(inputs) != 1 or len(outputs) != 1:
        raise RuntimeError("This model does not expose the expected image embedding output")

    def embed(content):
        vector = np.asarray(session.run([outputs[0].name], {inputs[0].name: prepare(content)})[0], dtype=np.float32).reshape(-1)
        norm = float(np.linalg.norm(vector))
        if norm == 0 or not np.isfinite(norm):
            raise RuntimeError("Model returned an invalid image embedding")
        return vector / norm

    start = time.monotonic()
    refs = []
    skipped = 0
    for path, skus in sorted(by_path.items()):
        if path not in thumbnails:
            skipped += 1
            continue
        try:
            refs.append((path, tuple(skus), embed(thumbnails[path])))
        except (OSError, ValueError) as exc:
            skipped += 1
            print(f"Unreadable thumbnail skipped: {path} ({type(exc).__name__})")
    print(f"Embedded {len(refs)} catalogue images in {time.monotonic()-start:.1f}s; skipped {skipped}", flush=True)
    if len(refs) < 500:
        raise RuntimeError("Fewer than 500 images embedded; benchmark is incomplete")

    successes = {1: 0, 5: 0, 10: 0}
    total = sum(map(len, CASES.values()))
    for expected, files in CASES.items():
        for file in files:
            query = MEDIA_PREFIX + file
            vector = embed(thumbnails[query])
            scores = {}
            for path, skus, reference in refs:
                if path == query:  # exclude the uploaded photo itself
                    continue
                similarity = float(np.dot(vector, reference))
                for sku in skus:
                    scores[sku] = max(scores.get(sku, -1.0), similarity)
            ranked = sorted(scores.items(), key=lambda row: -row[1])
            rank = next((i + 1 for i, (sku, _) in enumerate(ranked) if sku == expected), None)
            for k in successes:
                successes[k] += rank is not None and rank <= k
            print(f"{expected} {file[:8]}: rank={rank} top5="
                  + ",".join(sku for sku, _ in ranked[:5]), flush=True)
    print(f"RESULT top1={successes[1]}/{total} top5={successes[5]}/{total} "
          f"top10={successes[10]}/{total}; indexed={len(refs)}; "
          f"total_seconds={time.monotonic()-start:.1f}", flush=True)
    client.close()


if __name__ == "__main__":
    main()
