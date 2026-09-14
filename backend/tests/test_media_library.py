import hashlib
import io
import unittest

from PIL import Image

from media_library import (
    asset_id_for_url,
    build_media_library_report,
    canonical_media_url,
    inspect_media_bytes,
)


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
        self.assertEqual(report["summary"]["duplicate_groups"], 1)
        self.assertEqual(report["summary"]["products_total"], 2)
        self.assertEqual(report["summary"]["products_pair_assessed"], 1)
        self.assertEqual(report["summary"]["products_pair_unassessed"], 1)
        self.assertEqual(assets[white_url]["validity"], "valid")
        self.assertTrue(assets[white_url]["original_available"])
        self.assertTrue(assets[white_url]["duplicate_content"])
        self.assertTrue(assets[duplicate_url]["duplicate_content"])
        self.assertEqual(assets[invalid_url]["validity"], "invalid")
        self.assertEqual(assets[external_url]["validity"], "unverified")
        self.assertEqual(assets[duplicate_url]["use_count"], 0)

        missing = {row["id"]: row["missing"] for row in report["missing_products"]}
        self.assertNotIn("p1", missing)
        self.assertNotIn("p2", missing)

    def test_absolute_internal_file_url_matches_stored_file(self):
        relative_url = "/api/files/lumiere-catalog/products/example.jpg"
        absolute_url = f"https://samratglass.com{relative_url}"
        report = build_media_library_report(
            products=[{"id": "p1", "name": "Lamp", "images": [absolute_url]}],
            settings={},
            files=[{
                "id": "file-1",
                "storage_path": "lumiere-catalog/products/example.jpg",
                "content_type": "image/jpeg",
                "width": 1600,
                "height": 1200,
            }],
            metadata=[{
                "id": "legacy-absolute-id",
                "url": absolute_url,
                "usage_type": "detail",
            }],
        )
        self.assertEqual(canonical_media_url(absolute_url), relative_url)
        self.assertEqual(asset_id_for_url(absolute_url), asset_id_for_url(relative_url))
        self.assertEqual(report["summary"]["assets"], 1)
        self.assertEqual(report["summary"]["unverified_external"], 0)
        self.assertEqual(report["summary"]["classified"], 1)
        asset = report["assets"][0]
        self.assertEqual(asset["url"], relative_url)
        self.assertEqual(asset["validity"], "valid")
        self.assertEqual(asset["use_count"], 1)
        self.assertEqual(asset["usage_type"], "detail")

    def test_low_resolution_summary_only_counts_assets_in_use(self):
        used_url = "/api/files/app/products/used-small.jpg"
        unused_url = "/api/files/app/products/unused-small.jpg"
        report = build_media_library_report(
            products=[{"id": "p1", "name": "Lamp", "images": [used_url]}],
            settings={},
            files=[
                {"id": "used", "storage_path": "app/products/used-small.jpg", "width": 600, "height": 600},
                {"id": "unused", "storage_path": "app/products/unused-small.jpg", "width": 600, "height": 600},
            ],
            metadata=[],
        )
        self.assertEqual(report["summary"]["low_resolution"], 2)
        self.assertEqual(report["summary"]["low_resolution_in_use"], 1)

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

    def test_product_background_and_project_usage_create_conservative_recommendations(self):
        product_url = "/api/files/app/products/white.jpg"
        project_url = "/api/files/app/projects/install.jpg"
        report = build_media_library_report(
            products=[{"id": "p1", "name": "Lamp", "images": [product_url]}],
            settings={"homepage_content": {"gallery": {"items": [{
                "title": "Residence",
                "images": [project_url],
            }]}}},
            files=[
                {
                    "id": "white",
                    "storage_path": "app/products/white.jpg",
                    "content_type": "image/jpeg",
                    "background_tone": "white",
                },
                {
                    "id": "project",
                    "storage_path": "app/projects/install.jpg",
                    "content_type": "image/jpeg",
                    "background_tone": "mixed",
                },
            ],
            metadata=[],
        )
        assets = {asset["url"]: asset for asset in report["assets"]}
        self.assertEqual(
            assets[product_url]["recommendation"]["usage_type"],
            "white_bulbs_off",
        )
        self.assertIn(
            "confirm that its bulbs are off",
            assets[product_url]["recommendation"]["reason"],
        )
        self.assertEqual(
            assets[project_url]["recommendation"]["usage_type"],
            "installation",
        )
        self.assertEqual(report["summary"]["high_confidence_recommendations"], 2)

    def test_mixed_product_background_is_not_guessed(self):
        url = "/api/files/app/products/mixed.jpg"
        report = build_media_library_report(
            products=[{"id": "p1", "name": "Lamp", "images": [url]}],
            settings={},
            files=[{
                "id": "mixed",
                "storage_path": "app/products/mixed.jpg",
                "content_type": "image/jpeg",
                "background_tone": "mixed",
            }],
            metadata=[],
        )
        self.assertIsNone(report["assets"][0]["recommendation"])

    def test_image_inspection_returns_hash_and_resolution(self):
        buffer = io.BytesIO()
        Image.new("RGB", (1600, 900), color=(20, 30, 40)).save(buffer, "JPEG")
        data = buffer.getvalue()

        metadata = inspect_media_bytes(data, "image/jpeg")

        self.assertEqual(metadata["width"], 1600)
        self.assertEqual(metadata["height"], 900)
        self.assertEqual(metadata["sha256"], hashlib.sha256(data).hexdigest())
        self.assertEqual(metadata["background_tone"], "black")
        self.assertLess(metadata["background_luminance"], 45)


if __name__ == "__main__":
    unittest.main()
