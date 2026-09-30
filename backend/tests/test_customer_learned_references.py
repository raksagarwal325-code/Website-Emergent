import io
import unittest

import numpy as np
from PIL import Image

from customer_image_references import LearnedReferenceStore
from customer_visual_features import rank_images


class Cursor:
    def __init__(self, documents):
        self.documents = [dict(document) for document in documents]

    def sort(self, key, direction):
        self.documents.sort(key=lambda row: row.get(key), reverse=direction < 0)
        return self

    async def to_list(self, _limit):
        return self.documents


class DeleteResult:
    def __init__(self, count):
        self.deleted_count = count


class Collection:
    def __init__(self, documents=()):
        self.documents = [dict(document) for document in documents]

    def find(self, query=None, projection=None):
        query = query or {}
        documents = self.documents
        if "id" in query:
            allowed = set(query["id"].get("$in", []))
            documents = [row for row in documents if row.get("id") in allowed]
        if query.get("status"):
            documents = [row for row in documents if row.get("status") == query["status"]]
        return Cursor(documents)

    async def find_one(self, query, projection=None):
        return next((dict(row) for row in self.documents
                     if all(row.get(key) == value for key, value in query.items())), None)

    async def insert_one(self, document):
        self.documents.append(dict(document))

    async def delete_one(self, query):
        before = len(self.documents)
        self.documents = [row for row in self.documents if row.get("_id") != query.get("_id")]
        return DeleteResult(before - len(self.documents))

    async def count_documents(self, _query):
        return len(self.documents)


class Database:
    def __init__(self):
        self.products = Collection([
            {"id": "one", "sku": "SGE-HL-069", "name": "One", "category": "Hanging Light", "images": ["one.jpg"], "status": "published"},
            {"id": "two", "sku": "SGE-HL-070", "name": "Two", "category": "Hanging Light", "images": ["two.jpg"], "status": "published"},
            {"id": "draft", "sku": "DRAFT", "name": "Draft", "status": "draft"},
        ])
        self.customer_image_search_references = Collection()


class Encoder:
    session = object()

    def encode(self, _image):
        return [[1.0] + [0.0] * 383, [1.0] + [0.0] * 383]


def image_bytes():
    output = io.BytesIO()
    Image.new("RGB", (80, 120), "white").save(output, "JPEG")
    return output.getvalue()


class LearnedReferenceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = Database()
        self.store = LearnedReferenceStore(self.db, Encoder())

    async def test_multi_product_reference_persists_features_not_raw_photo(self):
        data = image_bytes()
        created = await self.store.create(data, "client room.jpg", ["one", "two"], "owner@example.com")
        self.assertEqual(created["product_ids"], ["one", "two"])
        document = self.db.customer_image_search_references.documents[0]
        self.assertNotIn("image", document)
        self.assertNotIn("data", document)
        self.assertNotIn(data, document.values())
        self.assertEqual(len(document["vectors"]), 2)

        rows, mapping = await self.store.augment([], {}, self.db.products.documents)
        self.assertEqual(len(rows), 1)
        self.assertTrue(rows[0]["verified_reference"])
        self.assertEqual({product["id"] for product in mapping[rows[0]["url"]]}, {"one", "two"})

    async def test_unpublished_product_and_duplicate_photo_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "published"):
            await self.store.create(image_bytes(), "draft.jpg", ["draft"], "owner@example.com")
        await self.store.create(image_bytes(), "first.jpg", ["one"], "owner@example.com")
        with self.assertRaisesRegex(ValueError, "already"):
            await self.store.create(image_bytes(), "again.jpg", ["two"], "owner@example.com")

    async def test_list_and_delete_do_not_expose_vectors(self):
        created = await self.store.create(image_bytes(), "client.jpg", ["one"], "owner@example.com")
        listed = await self.store.list()
        self.assertEqual(listed[0]["products"][0]["sku"], "SGE-HL-069")
        self.assertNotIn("vectors", listed[0])
        self.assertTrue(await self.store.delete(created["id"]))
        self.assertFalse(await self.store.delete(created["id"]))

    def test_verified_reference_uses_strict_gate_and_never_claims_exact_product(self):
        query = [[1.0] + [0.0] * 383, [1.0] + [0.0] * 383]
        def vector(score):
            tail = float(np.sqrt(1 - score * score))
            return [score, tail] + [0.0] * 382
        product = {"id": "one", "sku": "SGE-HL-069"}
        mapping = {"learned": [product]}
        hashes = {"sha256": "query", "pixels": "query-pixels"}
        weak = [{"url": "learned", "sha256": "other", "pixels": "other",
                 "vectors": [vector(.85), vector(.85)], "verified_reference": True,
                 "verified_threshold": .86}]
        self.assertEqual(rank_images(hashes, query, weak, mapping), [])
        strong = [{**weak[0], "vectors": [vector(.90), vector(.90)]}]
        result = rank_images(hashes, query, strong, mapping)
        self.assertEqual(result[0]["match_type"], "closest")
        exact_pixels = [{**strong[0], "pixels": "query-pixels"}]
        self.assertEqual(rank_images(hashes, query, exact_pixels, mapping)[0]["match_type"], "closest")


if __name__ == "__main__":
    unittest.main()
