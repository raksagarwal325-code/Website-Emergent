"""Protect default behaviour and publication boundaries for optional references."""
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image
from customer_image_references import ReferenceBundle


class Encoder:
    session = object()

    def __init__(self):
        self.calls = 0

    def encode(self, image):
        self.calls += 1
        return [[1.0] + [0.0] * 383] * 2


class ReferenceBundleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        data = io.BytesIO()
        Image.new("RGB", (20, 30), "white").save(data, "PNG")
        (self.root / "photo.png").write_bytes(data.getvalue())
        self.manifest = {"version": 1, "references": [{"sku": "SGE-CS-001", "file": "photo.png",
                          "sha256": hashlib.sha256(data.getvalue()).hexdigest()}]}
        self.path = self.root / "manifest.json"
        self.write_manifest()
        self.encoder = Encoder()
        self.product = {"id": "one", "sku": "SGE-CS-001", "images": ["/catalogue.png"]}

    def write_manifest(self):
        self.path.write_text(json.dumps(self.manifest))

    def test_disabled_is_identity_without_model_work(self):
        bundle = ReferenceBundle()
        bundle.refresh(self.encoder)
        rows, mapping = [], {}
        out_rows, out_mapping = bundle.augment(rows, mapping)
        self.assertIs(rows, out_rows)
        self.assertIs(mapping, out_mapping)
        self.assertEqual(self.encoder.calls, 0)

    def test_enabled_does_not_mutate_baseline_or_gallery_and_caches_vectors(self):
        bundle = ReferenceBundle(self.path)
        bundle.refresh(self.encoder)
        bundle.refresh(self.encoder)
        rows = [{"url": "/catalogue.png"}]
        mapping = {"/catalogue.png": [self.product]}
        augmented, urls = bundle.augment(rows, mapping)
        self.assertEqual(self.encoder.calls, 1)
        self.assertEqual(rows, [{"url": "/catalogue.png"}])
        self.assertEqual(list(mapping), ["/catalogue.png"])
        self.assertEqual(self.product["images"], ["/catalogue.png"])
        self.assertEqual(len(augmented), 2)
        self.assertEqual(urls[augmented[-1]["url"]], [self.product])

    def test_unpublished_or_ambiguous_sku_cannot_be_returned(self):
        bundle = ReferenceBundle(self.path)
        bundle.refresh(self.encoder)
        self.assertEqual(bundle.augment([], {}), ([], {}))
        mapping = {"a": [self.product, {**self.product, "id": "different"}]}
        self.assertEqual(bundle.augment([], mapping)[0], [])

    def test_changed_unapproved_bytes_clear_previous_bundle(self):
        bundle = ReferenceBundle(self.path)
        bundle.refresh(self.encoder)
        (self.root / "photo.png").write_bytes(b"unapproved replacement")
        with self.assertRaises(ValueError):
            bundle.refresh(self.encoder)
        self.assertEqual(bundle.entries, ())

    def test_path_escape_and_oversized_manifest_rejected(self):
        for file in ("../outside.png", "/outside.png"):
            self.manifest["references"][0]["file"] = file
            self.write_manifest()
            with self.assertRaises(ValueError):
                ReferenceBundle(self.path).refresh(self.encoder)
        self.path.write_text(" " * 65537)
        with self.assertRaises(ValueError):
            ReferenceBundle(self.path).refresh(self.encoder)

    def test_model_unavailable_keeps_catalogue_only(self):
        bundle = ReferenceBundle(self.path)
        self.encoder.session = None
        bundle.refresh(self.encoder)
        self.assertEqual(bundle.entries, ())


if __name__ == "__main__":
    unittest.main()
