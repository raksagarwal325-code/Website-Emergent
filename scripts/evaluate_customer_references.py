"""Read-only, full-catalogue experiment. Never imported by the web application.

Download public catalogue images, then deny network access before model inference.
The three owner-labelled references are added to an in-memory candidate index only.
No production database, credentials, search requests, or mutations are used.
"""
import argparse
import concurrent.futures
import ctypes
import errno
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import time
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
ORIGIN = "https://samratglass.com"
FIXTURES = ROOT / "tests/fixtures/customer-reference-evaluation"
REFERENCES = {"CS-001": "cs-001.jpg", "WL-085": "wl-085.jpg", "CS-002": "cs-002.jpg"}
HOLDOUTS = {"WL-060": ["SGE-WL-060"], "HL-114": ["SGE-HL-114"],
            "Meher": ["SGE-CH-128", "SGE-CH-131", "SGE-CH-124"]}


def get_bytes(url, limit=12 * 1024 * 1024):
    # Only public, read-only catalogue resources. No cookies or authentication.
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.netloc != "samratglass.com":
        raise ValueError("Unexpected catalogue host")
    with urlopen(Request(url, headers={"User-Agent": "Samrat-Catalogue-Evaluation/1.0"}), timeout=75) as response:
        if urlsplit(response.url).netloc != "samratglass.com":
            raise ValueError("Unexpected catalogue redirect")
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Download exceeds evaluation size bound")
    return data


def catalogue():
    items = []
    page = 1
    expected = None
    while True:
        response = json.loads(get_bytes(f"{ORIGIN}/api/products?limit=48&page={page}&sort=name"))
        if expected is None:
            expected = response["total"]
        if response["total"] != expected:
            raise RuntimeError("Catalogue changed during pagination; retry with a stable snapshot")
        items.extend(response["items"])
        if page >= response["total_pages"]:
            break
        page += 1
    if not expected or len(items) != expected or len({p["id"] for p in items}) != expected:
        raise RuntimeError("Incomplete or duplicate catalogue snapshot")
    return [{k: p.get(k) for k in ("id", "sku", "name", "category", "images", "slug")} for p in items]


def canonical(url):
    url = url.strip()
    parsed = urlsplit(url)
    return parsed.path if parsed.path.startswith("/api/files/") else url


def image_map(products):
    mapping = {}
    for product in products:
        for raw in product.get("images") or []:
            if isinstance(raw, str) and raw.strip():
                entries = mapping.setdefault(canonical(raw), [])
                if product not in entries:
                    entries.append(product)
    return mapping


def snapshot_signature(products):
    return sorted((p["id"], p.get("sku"), tuple(p.get("images") or [])) for p in products)


def prepare(output):
    products = catalogue()
    mapping = image_map(products)
    print(f"Full public catalogue: {len(products)} products, {len(mapping)} unique images", flush=True)
    cache = output / "images"
    cache.mkdir(parents=True, exist_ok=True)
    failures = []

    def download(url):
        path = cache / hashlib.sha256(url.encode()).hexdigest()
        if path.exists() and path.stat().st_size:
            return url, path, None
        error = None
        for attempt in range(2):
            try:
                data = get_bytes(ORIGIN + url if url.startswith("/") else url)
                path.write_bytes(data)
                return url, path, None
            except Exception as exc:
                error = f"{type(exc).__name__}: {exc}"
                if not attempt:
                    time.sleep(1)
        return url, path, error

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for count, (url, path, error) in enumerate(pool.map(download, mapping), 1):
            if error:
                failures.append({"url": url, "error": error})
            if count % 50 == 0:
                print(f"Downloaded {count}/{len(mapping)}; failures={len(failures)}", flush=True)
    (output / "download-failures.json").write_text(json.dumps(failures, indent=2))
    if failures:
        # Storage-backed public endpoints occasionally return a transient 404.
        # Retry only failed URLs after the main pass; never substitute another image.
        unresolved = []
        for failure in failures:
            url, path, error = download(failure["url"])
            if error:
                unresolved.append({"url": url, "error": error,
                                   "products": [p.get("sku") for p in mapping[url]]})
        failures = unresolved
        (output / "download-failures.json").write_text(json.dumps(failures, indent=2))
        if failures:
            print(json.dumps(failures), flush=True)
            raise RuntimeError(f"Incomplete candidate coverage: {len(failures)} downloads failed; no accuracy verdict")
    if snapshot_signature(products) != snapshot_signature(catalogue()):
        raise RuntimeError("Catalogue changed during download; no accuracy verdict")
    (output / "catalogue.json").write_text(json.dumps(products))
    from customer_visual_features import MODEL_REPO, MODEL_REVISION
    from huggingface_hub import hf_hub_download
    model = hf_hub_download(MODEL_REPO, "onnx/model.onnx", revision=MODEL_REVISION)
    return products, mapping, cache, model


def deny_network():
    """Apply to this process before ONNX imports/threads; telemetry cannot leave."""
    lib = ctypes.CDLL("libseccomp.so.2", use_errno=True)
    lib.seccomp_init.argtypes = [ctypes.c_uint32]
    lib.seccomp_init.restype = ctypes.c_void_p
    lib.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
    lib.seccomp_syscall_resolve_name.restype = ctypes.c_int
    lib.seccomp_rule_add.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint]
    lib.seccomp_load.argtypes = [ctypes.c_void_p]
    ctx = lib.seccomp_init(0x7fff0000)
    if not ctx:
        raise RuntimeError("Cannot initialise inference network denial")
    for name in (b"socket", b"connect", b"sendto", b"sendmsg", b"sendmmsg"):
        number = lib.seccomp_syscall_resolve_name(name)
        if number < 0 or lib.seccomp_rule_add(ctx, 0x00050000 | errno.EPERM, number, 0):
            raise RuntimeError("Cannot configure inference network denial")
    if lib.seccomp_load(ctx):
        raise RuntimeError("Cannot activate inference network denial")
    import socket
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    except PermissionError:
        print("Verified: network prohibited for model inference", flush=True)
    else:
        sock.close()
        raise RuntimeError("Network denial did not take effect")
    os.environ["HF_HUB_OFFLINE"] = "1"


def overlay_references(products, rows, mapping, encoder):
    """Experiment-only copy; existing rows, products and mapping stay unchanged."""
    from customer_visual_features import decode_image, image_hashes
    augmented_rows = list(rows)
    augmented_map = dict(mapping)
    references = []
    for sku, filename in REFERENCES.items():
        matches = [p for p in products if p.get("sku") == f"SGE-{sku}"]
        if len(matches) != 1:
            raise ValueError(f"Reference requires one published product: {sku}")
        data = (FIXTURES / filename).read_bytes()
        image = decode_image(data)
        url = f"experiment-reference:{sku}"
        hashes = image_hashes(data, image)
        augmented_rows.append({"url": url, **hashes, "vectors": encoder.encode(image)})
        augmented_map[url] = matches
        references.append({"sku": sku, "sha256": hashes["sha256"], "filename": filename})
    return augmented_rows, augmented_map, references


def jpeg_variant(image):
    """Derived robustness check, explicitly NOT an independent real-world photo."""
    from PIL import Image
    small = image.copy()
    small.thumbnail((720, 720), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    small.save(buffer, "JPEG", quality=65)
    return buffer.getvalue()


def selected_controls(products, per_category=10):
    groups = {}
    for product in products:
        if product.get("images"):
            groups.setdefault(product.get("category") or "unknown", []).append(product)
    result = []
    for category in sorted(groups):
        # Stable spread through each category, rather than only newest products.
        entries = sorted(groups[category], key=lambda p: p["id"])
        count = min(per_category, len(entries))
        indices = {round(i * (len(entries) - 1) / max(count - 1, 1)) for i in range(count)}
        result.extend(entries[i] for i in sorted(indices))
    return result


def evaluate(output, products, mapping, cache, model):
    os.environ["CUSTOMER_IMAGE_MODEL_PATH"] = model
    deny_network()
    from customer_visual_features import VisualEncoder, decode_image, image_hashes, rank_images, INDEX_VERSION
    import PIL
    encoder = VisualEncoder()
    encoder.load()
    rows = []
    features = output / "features"
    features.mkdir(exist_ok=True)
    processor = hashlib.sha256((ROOT / "backend/customer_visual_features.py").read_bytes()).hexdigest()
    for count, url in enumerate(mapping, 1):
        data = (cache / hashlib.sha256(url.encode()).hexdigest()).read_bytes()
        image = decode_image(data)
        hashes = image_hashes(data, image)
        key = hashlib.sha256(f"{INDEX_VERSION}:{PIL.__version__}:{processor}:{hashes['sha256']}".encode()).hexdigest()
        feature_file = features / (key + ".json")
        vectors = json.loads(feature_file.read_text()) if feature_file.exists() else encoder.encode(image)
        if not feature_file.exists():
            feature_file.write_text(json.dumps(vectors))
        rows.append({"url": url, **hashes, "vectors": vectors})
        if count % 50 == 0:
            print(f"Encoded {count}/{len(mapping)}", flush=True)
    # Independent owner-labelled chandelier query; never add it to candidate rows.
    import numpy as np
    import shutil
    query_data = (FIXTURES / 'ch-029-variant.jpg').read_bytes()
    original = decode_image(query_data)
    targets = {'SGE-CH-029', 'SGE-CH-044', 'SGE-CH-051', 'SGE-CH-053'}
    diagnostics = {}
    for label, image in [('original', original), ('fixture_crop', original.crop((110, 340, 810, 1010)))]:
        query = np.asarray(encoder.encode_query(image), dtype=np.float32)
        by_sku = {}
        for row in rows:
            scores = query @ np.asarray(row['vectors'], dtype=np.float32).T
            for product in mapping[row['url']]:
                sku = product.get('sku')
                candidate = {'sku': sku, 'name': product.get('name'), 'slug': product.get('slug'),
                             'url': row['url'], 'max_score': float(scores.max()),
                             'whole_score': float(scores[:2].max()),
                             'mean_view_score': float(scores.max(axis=1).mean())}
                if sku not in by_sku or candidate['max_score'] > by_sku[sku]['max_score']:
                    by_sku[sku] = candidate
        ordered = sorted(by_sku.values(), key=lambda item: -item['max_score'])
        for rank, candidate in enumerate(ordered, 1):
            candidate['rank'] = rank
        diagnostics[label] = {'top_30': ordered[:30], 'expected': [c for c in ordered if c['sku'] in targets]}
    assets = output / 'diagnostic-assets'
    assets.mkdir(exist_ok=True)
    for product in products:
        if product.get('sku') in targets:
            for i, raw in enumerate(product.get('images') or []):
                source = cache / hashlib.sha256(canonical(raw).encode()).hexdigest()
                shutil.copyfile(source, assets / (product['sku'] + '-' + str(i) + '.image'))
    (output / 'diagnosis.json').write_text(json.dumps(diagnostics, indent=2))
    print('CH_AND_FAMILY_DIAGNOSIS ' + json.dumps({k: v['expected'] for k, v in diagnostics.items()}), flush=True)

    from probe_design_ranking import probe
    probe(output, products, rows, mapping, cache, encoder, FIXTURES)
    # Any bad image aborts the experiment instead of silently testing a smaller index.
    augmented_rows, augmented_map, references = overlay_references(products, rows, mapping, encoder)
    results = []

    def run_case(label, data, expected, kind):
        image = decode_image(data)
        hashes = image_hashes(data, image)
        vectors = encoder.encode_query(image)
        baseline = rank_images(hashes, vectors, rows, mapping)
        proposed = rank_images(hashes, vectors, augmented_rows, augmented_map)

        def summary(matches):
            candidates = [{"sku": m["product"].get("sku"), "type": m["match_type"], "score": round(m["score"], 6)} for m in matches]
            rank = next((i for i, m in enumerate(candidates, 1) if m["sku"] in expected), None)
            return {"expected_rank": rank, "matches": candidates}

        result = {"case": label, "kind": kind, "expected": expected,
                  "baseline": summary(baseline), "proposed": summary(proposed)}
        before, after = result["baseline"]["expected_rank"], result["proposed"]["expected_rank"]
        result["regressed"] = before is not None and (after is None or after > before)
        if kind == "background-only-negative":
            reference_skus = {"SGE-" + sku for sku in REFERENCES}
            old_skus = {m["product"].get("sku") for m in baseline}
            new_skus = {m["product"].get("sku") for m in proposed}
            result["new_false_reference_matches"] = sorted((new_skus - old_skus) & reference_skus)
            result["regressed"] = bool(result["new_false_reference_matches"])
        result["ranking_changed"] = [m["sku"] for m in result["baseline"]["matches"]] != [m["sku"] for m in result["proposed"]["matches"]]
        results.append(result)
        print(f"{label}: {before} -> {after}" + (" REGRESSION" if result["regressed"] else ""), flush=True)

    for sku, filename in REFERENCES.items():
        data = (FIXTURES / filename).read_bytes()
        run_case(sku + " original", data, [f"SGE-{sku}"], "seeded-sanity-only")
        run_case(sku + " compressed", jpeg_variant(decode_image(data)), [f"SGE-{sku}"], "derived-from-reference")
    for label, expected in HOLDOUTS.items():
        run_case(label, (FIXTURES / (label.lower() + ".jpg")).read_bytes(), expected, "independent-owner-labelled")
    # Exclude the labelled product: curtains, adjacent lantern, newspaper/packaging.
    # These deliberately challenge incidental background matching in the new rows.
    for sku, box in (("CS-001", (.35, 0, .8, .12)), ("WL-085", (.64, .35, .9, .78)),
                     ("CS-002", (0, .5, .3, .85))):
        original = decode_image((FIXTURES / REFERENCES[sku]).read_bytes())
        bounds = tuple(round(v * (original.width if i % 2 == 0 else original.height)) for i, v in enumerate(box))
        run_case(sku + " background/other object", jpeg_variant(original.crop(bounds)), [], "background-only-negative")
    controls = selected_controls(products)
    for product in controls:
        url = canonical(product["images"][0])
        data = (cache / hashlib.sha256(url.encode()).hexdigest()).read_bytes()
        run_case(product["sku"] + " catalogue JPEG", jpeg_variant(decode_image(data)), [product["sku"]], "catalogue-derived-control")
    report = {"index_version": INDEX_VERSION, "pillow_version": PIL.__version__, "products": len(products), "candidate_images": len(rows),
              "reference_images": references, "coverage_complete": len(rows) == len(mapping),
              "catalogue_controls": len(controls), "results": results,
              "regressions": sum(r["regressed"] for r in results),
              "ranking_changes": sum(r["ranking_changed"] for r in results),
              "limitations": ["Rebuilt public-image index, not an export of stored production embeddings.",
                              "Seeded and derived-reference successes do not prove unseen-photo generalisation.",
                              "The owner's approximately 30 successful photos are not all supplied.",
                              "Zero regressions in this sample is not a guarantee for all future searches."]}
    (output / "report.json").write_text(json.dumps(report, indent=2))
    lines = ["# Customer reference experiment", "", f"Candidates: {len(products)} products / {len(rows)} images (complete).",
             f"Regressions: {report['regressions']}. Changed rankings: {report['ranking_changes']}.", "",
             "| Case | Type | Baseline expected rank | Proposed expected rank | Regression |",
             "|---|---|---:|---:|---|"]
    for r in results:
        lines.append(f"| {r['case']} | {r['kind']} | {r['baseline']['expected_rank']} | {r['proposed']['expected_rank']} | {r['regressed']} |")
    lines += ["", "Limitations:"] + ["- " + item for item in report["limitations"]]
    (output / "report.md").write_text("\n".join(lines) + "\n")
    print(json.dumps({k: report[k] for k in ("products", "candidate_images", "coverage_complete", "regressions", "ranking_changes")}), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    evaluate(args.output, *prepare(args.output))
