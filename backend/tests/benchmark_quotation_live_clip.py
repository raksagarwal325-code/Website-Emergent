"""Read-only CLIP retrieval benchmark against the live Samrat Glass catalogue.

Loads only public API data and public 640px image variants. Caches images and
does not write to the live website, Preview MongoDB, or the quotation maker.
"""

import hashlib
import io
import json
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

from benchmark_quotation_clip import CASES, MEDIA_PREFIX, get_model, prepare, storage_path

ROOT = "https://samratglass.com"
CACHE = Path("/tmp/sge-visual-benchmark/live-media")
HEADERS = {"User-Agent": "SamratGlassReadOnlyVisualBenchmark/1.0"}


def request_bytes(url, max_size=25 * 1024 * 1024):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=45) as response:
        content = response.read(max_size + 1)
    if len(content) > max_size:
        raise RuntimeError("Image exceeds 25 MB; refusing benchmark download")
    return content


def request_json(path):
    return json.loads(request_bytes(ROOT + path, max_size=8 * 1024 * 1024))


def cached_media(path):
    # Storage path is from the public API; accept only owned product files.
    if not path.startswith(MEDIA_PREFIX) or ".." in path:
        raise ValueError("Unexpected product image path")
    CACHE.mkdir(parents=True, exist_ok=True)
    cached = CACHE / hashlib.sha256(path.encode("utf-8")).hexdigest()
    if cached.exists() and cached.stat().st_size:
        return cached.read_bytes()
    variant = ROOT + "/api/image-variant/640/" + path
    try:
        content = request_bytes(variant)
    except (urllib.error.HTTPError, urllib.error.URLError):
        content = request_bytes(ROOT + "/api/files/" + path)
    # Reject HTML error pages before caching; Pillow determines actual format.
    with Image.open(io.BytesIO(content)) as image:
        image.verify()
    temporary = cached.with_suffix(".partial")
    temporary.write_bytes(content)
    temporary.replace(cached)
    return content


def generic_crops(content):
    """Automatic room-photo windows; no fixture coordinates or labelled boxes."""
    with Image.open(io.BytesIO(content)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
    w, h = image.size
    # Full image is handled separately. Overlap preserves a fixture near a
    # window edge; these six windows are identical for every uploaded photo.
    windows = (
        (0.15, 0.10, 0.85, 0.80),  # centre
        (0.00, 0.00, 1.00, 0.55),  # upper row
        (0.00, 0.00, 0.60, 0.75),  # left fixture
        (0.40, 0.00, 1.00, 0.75),  # right fixture
        (0.00, 0.00, 0.60, 0.55),  # upper left
        (0.40, 0.00, 1.00, 0.55),  # upper right
    )
    for x0, y0, x1, y1 in windows:
        crop = image.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
        output = io.BytesIO()
        crop.save(output, format="JPEG", quality=90)
        yield output.getvalue()


def live_products():
    first = request_json("/api/products?page=1&limit=48")
    total_pages = int(first.get("total_pages") or 0)
    products = list(first.get("items") or [])
    if not (500 <= int(first.get("total") or 0) <= 5000) or total_pages < 2:
        raise RuntimeError(f"Unexpected live catalogue count: {first.get('total')}")
    for page in range(2, total_pages + 1):
        data = request_json(f"/api/products?page={page}&limit=48")
        products.extend(data.get("items") or [])
    unique = {p["id"]: p for p in products if p.get("id")}
    if len(unique) != int(first["total"]):
        raise RuntimeError("Live catalogue changed during pagination; rerun later")
    return list(unique.values())


def main():
    started = time.monotonic()
    products = live_products()
    settings = request_json("/api/settings")
    projects = (((settings.get("homepage_content") or {}).get("gallery") or {}).get("items") or [])
    by_id = {product["id"]: product for product in products}
    catalogue = {}
    categories = {}
    for product in products:
        sku = str(product.get("sku") or "").upper()
        categories[sku] = str(product.get("category") or "")
        for image in product.get("images") or []:
            path = storage_path(image)
            if path.startswith(MEDIA_PREFIX):
                catalogue.setdefault(path, set()).add(sku)
    references = {path: set(skus) for path, skus in catalogue.items()}
    gallery_paths = set()
    for project in projects:
        linked = [by_id[p] for p in project.get("products") or [] if p in by_id]
        for image in project.get("images") or []:
            path = storage_path(image)
            if path.startswith(MEDIA_PREFIX) and linked:
                gallery_paths.add(path)
                references.setdefault(path, set()).update(str(p.get("sku") or "").upper() for p in linked)
    print(f"LIVE products={len(products)} catalogue_views={len(catalogue)} "
          f"projects={len(projects)} linked_photos={len(gallery_paths)}", flush=True)
    if len(catalogue) < 500 or len(projects) < 20:
        raise RuntimeError("Live catalogue or project list incomplete; no score calculated")
    for sku in CASES:
        present = any(sku == str(product.get("sku") or "").upper() for product in products)
        print(f"CASE {sku}: {'present' if present else 'ABSENT'}", flush=True)
        if not present:
            raise RuntimeError("Expected SKU absent from the live catalogue")

    queries = {MEDIA_PREFIX + file for files in CASES.values() for file in files}
    paths = set(references) | queries
    missing = [path for path in sorted(paths) if not (CACHE / hashlib.sha256(path.encode()).hexdigest()).exists()]
    print(f"Downloading up to {len(missing)} public image variants at 4 concurrent requests", flush=True)
    failed = {}
    if missing:
        with ThreadPoolExecutor(max_workers=4) as pool:
            pending = {pool.submit(cached_media, path): path for path in missing}
            for index, job in enumerate(as_completed(pending), 1):
                path = pending[job]
                try:
                    job.result()
                except (OSError, ValueError, RuntimeError) as exc:
                    failed[path] = type(exc).__name__
                if index % 100 == 0:
                    print(f"Images fetched {index}/{len(missing)}", flush=True)
    if any(path in failed for path in queries):
        raise RuntimeError("A required labelled query photo was not accessible")
    available = sum(path not in failed for path in references)
    if available < int(len(references) * 0.95):
        raise RuntimeError(f"Too many public images failed: {len(failed)} of {len(references)}")

    model = get_model(Path("/tmp/sge-visual-benchmark/vision_model_quantized.onnx"))
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(model), sess_options=options, providers=["CPUExecutionProvider"])
    outputs = [output for output in session.get_outputs() if "image_embeds" in output.name]
    if len(session.get_inputs()) != 1 or len(outputs) != 1:
        raise RuntimeError("Visual model image embedding output missing")
    input_name, output_name = session.get_inputs()[0].name, outputs[0].name

    def embed(content):
        vector = np.asarray(session.run([output_name], {input_name: prepare(content)})[0], dtype=np.float32).reshape(-1)
        norm = float(np.linalg.norm(vector))
        if norm <= 0 or not np.isfinite(norm):
            raise RuntimeError("Invalid visual model embedding")
        return vector / norm

    vectors = {}
    for path in sorted(paths - failed.keys()):
        try:
            vectors[path] = embed(cached_media(path))
        except (OSError, ValueError) as exc:
            failed[path] = type(exc).__name__
    if any(path not in vectors for path in queries):
        raise RuntimeError("Could not embed every labelled query photo")
    if sum(path in vectors for path in catalogue) < int(len(catalogue) * 0.95):
        raise RuntimeError("Could not embed at least 95% of published catalogue images")
    print(f"Embedded {len(vectors)} live photos; failed={len(failed)}; "
          f"elapsed_seconds={time.monotonic()-started:.1f}", flush=True)

    hits = {mode: {1: 0, 5: 0, 10: 0} for mode in
            ("catalogue", "linked", "known_category", "crop_linked", "crop_known_category")}
    total = sum(map(len, CASES.values()))
    for expected, files in CASES.items():
        for file in files:
            query = MEDIA_PREFIX + file
            crop_vectors = [embed(content) for content in generic_crops(cached_media(query))]
            scores = {mode: {} for mode in hits}
            for path, skus in references.items():
                if path == query or path not in vectors:
                    continue
                whole_similarity = float(np.dot(vectors[query], vectors[path]))
                cropped_similarity = max(whole_similarity, *(float(np.dot(crop, vectors[path]))
                                                              for crop in crop_vectors))
                for mode in hits:
                    visible = catalogue.get(path, ()) if mode in ("catalogue", "known_category") else skus
                    similarity = cropped_similarity if mode.startswith("crop_") else whole_similarity
                    for sku in visible:
                        if mode in ("known_category", "crop_known_category") and categories.get(sku) != categories.get(expected):
                            continue  # diagnostic upper bound; not a deployed classifier
                        scores[mode][sku] = max(scores[mode].get(sku, -1.0), similarity)
            ranks = {}
            for mode in hits:
                ranked = sorted(scores[mode], key=lambda sku: -scores[mode][sku])
                rank = ranked.index(expected) + 1 if expected in ranked else None
                ranks[mode] = rank
                for cutoff in hits[mode]:
                    hits[mode][cutoff] += rank is not None and rank <= cutoff
            print(f"{expected} {file[:8]}: catalogue_rank={ranks['catalogue']} "
                  f"linked_rank={ranks['linked']} crop_linked_rank={ranks['crop_linked']} "
                  f"category_upper_bound_rank={ranks['known_category']} "
                  f"crop_category_upper_bound_rank={ranks['crop_known_category']}", flush=True)
    print("RESULT " + " ".join(f"{mode}_top{k}={hits[mode][k]}/{total}"
                             for mode in hits for k in (1, 5, 10))
          + f" indexed={len(vectors)} seconds={time.monotonic()-started:.1f}", flush=True)


if __name__ == "__main__":
    main()
