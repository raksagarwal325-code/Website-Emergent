"""Retrieval tests cover distinct views and SKU grouping without a paid API."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from quotation_visual_index import image_rows, nearest_products  # noqa: E402


class QuotationVisualIndexTests(unittest.TestCase):
    def test_later_view_can_find_product_before_different_first_view(self):
        products = [
            {"id": "chandelier", "images": ["/first.jpg", "/installation.jpg"]},
            {"id": "wall-light", "images": ["/wall.jpg"]},
        ]
        expected = image_rows(products)
        self.assertEqual(len(expected), 3)
        rows = [
            {**expected["/first.jpg"], "vector": [0.0, 1.0]},
            {**expected["/installation.jpg"], "vector": [1.0, 0.0]},
            {**expected["/wall.jpg"], "vector": [0.4, 0.6]},
        ]
        ranked = nearest_products([1.0, 0.0], rows)
        self.assertEqual([row["product_id"] for row in ranked], ["chandelier", "wall-light"])
        self.assertEqual(ranked[0]["image_url"], "/installation.jpg")

    def test_shared_photo_retains_distinct_skus(self):
        rows = image_rows([
            {"id": "clear", "images": ["/same.jpg"]},
            {"id": "amber", "images": ["/same.jpg"]},
        ])
        self.assertEqual(rows["/same.jpg"]["product_ids"], ["clear", "amber"])
        result = nearest_products([1.0, 0.0], [{**rows["/same.jpg"], "vector": [1.0, 0.0]}])
        self.assertEqual({row["product_id"] for row in result}, {"clear", "amber"})

    def test_linked_installation_photo_finds_product(self):
        product = {"id": "amber", "images": ["/studio.jpg"]}
        expected = image_rows([product], {"/room.jpg": [product]})
        result = nearest_products([1.0, 0.0], [
            {**expected["/studio.jpg"], "vector": [0.0, 1.0]},
            {**expected["/room.jpg"], "vector": [1.0, 0.0]},
        ])
        self.assertEqual(result[0]["product_id"], "amber")
        self.assertEqual(result[0]["image_url"], "/room.jpg")


if __name__ == "__main__":
    unittest.main()
