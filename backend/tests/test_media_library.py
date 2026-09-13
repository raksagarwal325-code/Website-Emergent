import hashlib
import io
import unittest

from PIL import Image

from media_library import asset_id_for_url, build_media_library_report, inspect_media_bytes


class MediaLibraryTests(unittest.TestCase):
    def test_report_combines_usage_metadata_duplicates_and_missing_slots(self):
        white_url = "/api/files/app/products/white.jpg"
        black_url = "/api/files/app/products/black.jpg"
        duplicate_url = "/api/files/app/products/white-copy.jpg"
        invalid_url = "/api/files/app/products/missing.jpg"
        external_url = "https://cdn.example.com/project.jpg"

        products = [
            {
                "id": "p1",
                "name": "Complete Chandelier",
                "sku": "SGE-CH-001",
                "status": "published",
                "images": [white_url, black_url],
            },
            {
                "id": "p2",
                "name": "Incomplete Lamp",
                "sku": "SGE-TL-001",
                "status": "published",
                "images": [invalid_url],
            },
        ]
        settings = {
            "homepage_content": {
                "gallery": {
                    "items": [
                        {
                            "title": "Delhi Residence",
                            "location": "Delhi",
                            "images": [external_url],
                        }
                    ]
                }
            }
        }
        files = [
            {
                "id": "f-white",
                "storage_path": "app/products/white.jpg",
                "content_type": "image/jpeg",
                "size": 250000,
                "width": 1800,
                "height": 1200,
                "sha256": "same-content",
                "original_path": "app/originals/white.jpg",
            },
            {
                "id": "f-black",
                "storage_path": "app/products/black.jpg",
                "content_type": "image/jpeg",
                "size": 260000,
                "width": 1800,
                "height": 1200,
                "sha256": "black-content",
            },
            {
                "id": "f-copy",
                "storage_path": "app/products/white-copy.jpg",
                "content_type": "image/jpeg",
                "size": 250000,
                "width": 1800,
                "height": 1200,
                "sha256": "same-content",
            },
        ]
        metadata = [
            {
                "id": asset_id_for_url(white_url),
                "usage_type": "white_bulbs_off",
            },
            {
                "id": asset_id_for_url(black_url),
                "usage_type": "black_bulbs_on",
            },
        ]

        report = build_media_library_report(
            products=products,
            settings=settings,
            files=files,
            metadata=metadata,
        )
        assets = {row["url"]: row for row in report["assets"]}

        self.assertEqual(report["summary"]["assets"], 5)
        self.assertEqual(assets[white_url]["validity"], "valid")
        self.assertTrue(assets[white_url]["original_available"])
        self.assertTrue(assets[white_url]["duplicate_content"])
        self.assertTrue(assets[duplicate_url]["duplicate_content"])
        self.assertEqual(assets[invalid_url]["validity"], "invalid")
        self.assertEqual(assets[external_url]["validity"], "unverified")
        self.assertEqual(assets[duplicate_url]["use_count"], 0)

        missing = {row["id"]: row["missing"] for row in report["missing_products"]}
        self.assertNotIn("p1", missing)
        self.assertEqual(
            missing["p2"],
            ["white_bulbs_off", "black_bulbs_on"],
        )

    def test_internal_routes_are_not_mislabeled_as_external(self):
        url = "/api/hero-slides/image/app/hero/example.webp"
        report = build_media_library_report(
            products=[],
            settings={},
            files=[],
            metadata=[],
            hero_slides=[{"id": "hero-1", "image_url": url, "alt_text": "Hero"}],
        )
        asset = report["assets"][0]
        self.assertEqual(asset["validity"], "valid")
        self.assertEqual(report["summary"]["unverified_external"], 0)

    def test_cross_record_reuse_is_not_a_duplicate(self):
        url = "/api/files/app/products/shared.jpg"
        report = build_media_library_report(
            products=[{"id": "p1", "name": "Lamp", "images": [url]}],
            settings={},
            files=[{
                "id": "f1",
                "storage_path": "app/products/shared.jpg",
                "content_type": "image/jpeg",
            }],
            metadata=[],
            category_images=[{"category": "Table Lamp", "image_url": url}],
        )
        asset = report["assets"][0]
        self.assertFalse(asset["duplicate_url"])
        self.assertEqual(asset["use_count"], 2)

    def test_same_url_used_more_than_once_is_flagged(self):
        url = "/api/files/app/products/shared.jpg"
        report = build_media_library_report(
            products=[
                {"id": "p1", "name": "One", "images": [url, url]},
            ],
            settings={},
            files=[
                {
                    "id": "f1",
                    "storage_path": "app/products/shared.jpg",
                    "content_type": "image/jpeg",
                }
            ],
            metadata=[],
        )
        asset = report["assets"][0]
        self.assertTrue(asset["duplicate_url"])
        self.assertEqual(asset["use_count"], 2)

    def test_image_inspection_returns_hash_and_resolution(self):
        buffer = io.BytesIO()
        Image.new("RGB", (1600, 900), color=(20, 30, 40)).save(buffer, "JPEG")
        data = buffer.getvalue()

        metadata = inspect_media_bytes(data, "image/jpeg")

        self.assertEqual(metadata["width"], 1600)
        self.assertEqual(metadata["height"], 900)
        self.assertEqual(metadata["sha256"], hashlib.sha256(data).hexdigest())


if __name__ == "__main__":
    unittest.main()
