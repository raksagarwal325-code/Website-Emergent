"""Optional owner-labelled photo bundle. Disabled unless explicitly configured.

Only in-memory search candidates are augmented. Catalogue/gallery data and the
persistent production image index are never written by this module.
"""
import hashlib
import json
from pathlib import Path

from customer_visual_features import MAX_BYTES, decode_image, image_hashes


class ReferenceBundle:
    def __init__(self, manifest_path=None):
        self.path = Path(manifest_path).resolve() if manifest_path else None
        self.entries = ()
        self.signature = None

    def refresh(self, encoder):
        if self.path is None or encoder.session is None:
            self.entries = ()
            self.signature = None
            return
        try:
            manifest_bytes = self.path.read_bytes()
            if len(manifest_bytes) > 64 * 1024:
                raise ValueError("Reference manifest too large")
            manifest = json.loads(manifest_bytes)
            items = manifest.get("references")
            if manifest.get("version") != 1 or not isinstance(items, list) or len(items) > 20:
                raise ValueError("Expected reference manifest version 1 with at most 20 photos")
            files = []
            fingerprint = hashlib.sha256(manifest_bytes)
            for item in items:
                sku, relative, expected = item.get("sku"), item.get("file"), item.get("sha256")
                if not isinstance(sku, str) or not sku.strip() or len(sku) > 80:
                    raise ValueError("Invalid reference SKU")
                if not isinstance(relative, str) or Path(relative).is_absolute():
                    raise ValueError("Reference file must be relative to its manifest")
                path = (self.path.parent / relative).resolve()
                if not path.is_relative_to(self.path.parent):
                    raise ValueError("Reference file is outside its bundle")
                if not isinstance(expected, str) or len(expected) != 64:
                    raise ValueError("Reference needs its approved SHA-256")
                stat = path.stat()
                if not 0 < stat.st_size <= MAX_BYTES:
                    raise ValueError("Reference image exceeds size limit")
                fingerprint.update(f"{relative}:{stat.st_size}:{stat.st_mtime_ns}".encode())
                files.append((sku, path, expected))
            signature = fingerprint.hexdigest()
            if signature == self.signature:
                return
            entries = []
            for sku, path, expected in files:
                data = path.read_bytes()
                if hashlib.sha256(data).hexdigest() != expected:
                    raise ValueError("Reference image does not match the approved manifest")
                image = decode_image(data)
                entries.append({"sku": sku, "url": f"reference:{sku}:{expected}",
                                **image_hashes(data, image), "vectors": encoder.encode(image)})
            # Atomic assignment: requests see the old complete bundle or the new one.
            self.entries = tuple(entries)
            self.signature = signature
        except Exception:
            # Fail closed to the existing search, including on a changed/invalid bundle.
            self.entries = ()
            self.signature = None
            raise

    def augment(self, rows, mapping):
        if not self.entries:
            return rows, mapping
        by_sku = {}
        for products in mapping.values():
            for product in products:
                by_sku.setdefault(product.get("sku"), {})[product["id"]] = product
        additional = []
        augmented_map = dict(mapping)
        for entry in self.entries:
            products = list(by_sku.get(entry["sku"], {}).values())
            # A deleted/unpublished product or ambiguous SKU must never be resurrected.
            if len(products) != 1:
                continue
            additional.append(entry)
            augmented_map[entry["url"]] = products
        return list(rows) + additional, augmented_map
