"""Optional owner-labelled photo bundle. Disabled unless explicitly configured.

Only in-memory search candidates are augmented. Catalogue/gallery data and the
persistent production image index are never written by this module.
"""
import hashlib
import json
import re
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from customer_visual_features import EMBEDDING_DIM, MAX_BYTES, decode_image, image_hashes


LEARNED_REFERENCE_LIMIT = 500
LEARNED_REFERENCE_PRODUCT_LIMIT = 12
LEARNED_REFERENCE_THRESHOLD = .86
LEARNED_SIMILAR_THRESHOLD = .88
LEARNED_REFERENCE_KINDS = {"exact", "similar"}


def _safe_filename(value):
    name = re.sub(r"[^A-Za-z0-9._ -]+", "", str(value or "")).strip()
    return name[:120] or "verified-client-image"


class LearnedReferenceStore:
    """Admin-verified examples consumed by the existing image ranker.

    Only hashes and model features are persisted. The uploaded client image is
    decoded in memory and discarded after the reference has been created.
    """

    def __init__(self, db, encoder):
        self.db = db
        self.encoder = encoder

    @property
    def collection(self):
        return getattr(self.db, "customer_image_search_references", None) if self.db is not None else None

    async def create(self, data, filename, product_ids, created_by):
        if self.collection is None or self.db is None:
            raise RuntimeError("Verified search examples are temporarily unavailable.")
        relationship_by_product = {}
        for value in product_ids:
            if isinstance(value, dict):
                product_id = str(value.get("id") or "").strip()
                relationship = str(value.get("relationship") or "").strip().lower()
            else:
                product_id = str(value or "").strip()
                relationship = "exact"
            if not product_id:
                continue
            if relationship not in LEARNED_REFERENCE_KINDS:
                raise ValueError("Choose whether every product is an exact or similar design match.")
            relationship_by_product.setdefault(product_id, relationship)
        product_ids = list(relationship_by_product)
        if not 1 <= len(product_ids) <= LEARNED_REFERENCE_PRODUCT_LIMIT:
            raise ValueError(f"Select between 1 and {LEARNED_REFERENCE_PRODUCT_LIMIT} catalogue products.")
        products = await self.db.products.find(
            {"id": {"$in": product_ids}, "status": "published"},
            {"_id": 0, "id": 1, "sku": 1, "name": 1, "category": 1, "images": 1},
        ).to_list(None)
        if {product.get("id") for product in products} != set(product_ids):
            raise ValueError("Every selected product must exist and be published.")
        if self.encoder.session is None:
            raise RuntimeError("Image search is still preparing. Try again in a few minutes.")
        image = await asyncio.to_thread(decode_image, data)
        hashes = await asyncio.to_thread(image_hashes, data, image)
        if await self.collection.find_one({"pixels": hashes["pixels"]}, {"_id": 1}):
            raise ValueError("This client image is already a verified search example.")
        vectors = await asyncio.to_thread(self.encoder.encode, image)
        array = np.asarray(vectors, dtype=np.float32)
        if array.shape != (2, EMBEDDING_DIM) or not np.isfinite(array).all():
            raise RuntimeError("The image could not be converted into a search reference.")
        now = datetime.now(timezone.utc)
        reference_id = uuid.uuid4().hex
        await self.collection.insert_one({
            "_id": reference_id,
            "filename": _safe_filename(filename),
            "product_ids": product_ids,
            "relationships": relationship_by_product,
            "sha256": hashes["sha256"],
            "pixels": hashes["pixels"],
            "vectors": vectors,
            "created_at": now,
            "created_by": str(created_by or "")[:160],
        })
        kinds = set(relationship_by_product.values())
        return {"id": reference_id, "filename": _safe_filename(filename),
                "relationship": next(iter(kinds)) if len(kinds) == 1 else "mixed",
                "relationships": relationship_by_product,
                "product_ids": product_ids, "created_at": now, "products": products}

    async def list(self):
        if self.collection is None or self.db is None:
            return []
        rows = await self.collection.find(
            {}, {"sha256": 0, "pixels": 0, "vectors": 0}
        ).sort("created_at", -1).to_list(LEARNED_REFERENCE_LIMIT)
        ids = {product_id for row in rows for product_id in row.get("product_ids") or []}
        products = await self.db.products.find(
            {"id": {"$in": list(ids)}},
            {"_id": 0, "id": 1, "sku": 1, "name": 1, "category": 1, "images": 1, "status": 1},
        ).to_list(None) if ids else []
        by_id = {product["id"]: product for product in products}
        results = []
        for row in rows:
            relationships = row.get("relationships") if isinstance(row.get("relationships"), dict) else {}
            relationships = {
                product_id: (relationships.get(product_id)
                             if relationships.get(product_id) in LEARNED_REFERENCE_KINDS
                             else (row.get("relationship")
                                   if row.get("relationship") in LEARNED_REFERENCE_KINDS else "exact"))
                for product_id in row.get("product_ids") or []
            }
            kinds = set(relationships.values())
            results.append({"id": row["_id"], "filename": row.get("filename"),
                 "relationship": next(iter(kinds)) if len(kinds) == 1 else "mixed",
                 "relationships": relationships,
                 "product_ids": row.get("product_ids") or [],
                 "created_at": row.get("created_at"), "created_by": row.get("created_by"),
                 "products": [by_id[value] for value in row.get("product_ids") or [] if value in by_id]}
            )
        return results

    async def delete(self, reference_id):
        if self.collection is None:
            return False
        result = await self.collection.delete_one({"_id": reference_id})
        return bool(result.deleted_count)

    async def count(self):
        if self.collection is None:
            return 0
        return await self.collection.count_documents({})

    async def augment(self, rows, mapping, products):
        """Add valid learned rows to one request without mutating the index."""
        if self.encoder.session is None or self.collection is None:
            return rows, mapping
        documents = await self.collection.find({}, {"created_by": 0}).sort(
            "created_at", -1
        ).to_list(LEARNED_REFERENCE_LIMIT)
        if not documents:
            return rows, mapping
        by_id = {product.get("id"): product for product in products
                 if product.get("id") and product.get("status", "published") == "published"}
        additional = []
        augmented = dict(mapping)
        for document in documents:
            linked = [by_id[value] for value in document.get("product_ids") or [] if value in by_id]
            vectors = np.asarray(document.get("vectors") or [], dtype=np.float32)
            if not linked or vectors.shape != (2, EMBEDDING_DIM) or not np.isfinite(vectors).all():
                continue
            relationships = document.get("relationships") if isinstance(document.get("relationships"), dict) else {}
            fallback = (document.get("relationship")
                        if document.get("relationship") in LEARNED_REFERENCE_KINDS else "exact")
            for relationship in LEARNED_REFERENCE_KINDS:
                matched = [product for product in linked
                           if relationships.get(product["id"], fallback) == relationship]
                if not matched:
                    continue
                url = f"learned-reference:{document['_id']}:{relationship}"
                additional.append({"url": url, "sha256": document.get("sha256"),
                                   "pixels": document.get("pixels"),
                                   "vectors": document.get("vectors"),
                                   "verified_reference": True,
                                   "verified_reference_kind": relationship,
                                   "verified_threshold": (LEARNED_SIMILAR_THRESHOLD
                                                          if relationship == "similar"
                                                          else LEARNED_REFERENCE_THRESHOLD)})
                augmented[url] = matched
        return list(rows) + additional, augmented


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
