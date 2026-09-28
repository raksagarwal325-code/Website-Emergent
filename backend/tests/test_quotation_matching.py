"""Real decision cases for the image search shortcuts."""

import io

from PIL import Image, PngImagePlugin

from image_ownership import normalized_pixel_fingerprint, ownership_fingerprint
from quotation_matching import (exact_file_matches, needs_photo_index,
                                needs_untracked_photo_index, strongest_full_frame_match,
                                untracked_media_urls)


def test_existing_photo_signatures_without_dhash_are_reindexed():
    ready = {"storage_path": "catalogue/first.png", "visual_phash": "0" * 16,
             "visual_histogram": [0] * 512, "visual_thumbnail_ready": True,
             "public_pixel_hash": "pixels", "perceptual_fingerprint": "f" * 64}
    assert needs_photo_index(ready) is False
    legacy = dict(ready)
    legacy.pop("perceptual_fingerprint")
    assert needs_photo_index(legacy) is True
    legacy["perceptual_fingerprint"] = ready["perceptual_fingerprint"]
    legacy.pop("public_pixel_hash")
    assert needs_photo_index(legacy) is True


def test_project_image_without_file_record_gets_search_only_index():
    photos = ["/api/files/products/project.jpg", "/api/files/products/product.jpg"]
    files = [{"storage_path": "products/product.jpg"}]
    assert untracked_media_urls(photos, files) == [photos[0]]
    assert needs_untracked_photo_index(None) is True
    ready = {"public_sha256": "public", "pixel_hash": "pixels",
             "perceptual_fingerprint": "1" * 64, "visual_phash": "2" * 16,
             "visual_histogram": [0] * 512}
    assert needs_untracked_photo_index(ready) is False
    ready.pop("pixel_hash")
    assert needs_untracked_photo_index(ready) is True


def test_public_image_metadata_and_original_hash_can_both_find_product():
    photos = [{"storage_path": "catalogue/first.png", "public_sha256": "public",
               "public_pixel_hash": "pixels", "ownership_fingerprint": "original"}]
    assert exact_file_matches(photos, "public", "other") == ["catalogue/first.png"]
    assert exact_file_matches(photos, "other", "pixels") == ["catalogue/first.png"]
    assert exact_file_matches(photos, "original", "other") == ["catalogue/first.png"]
    assert exact_file_matches(photos, "other", "other") == []


def test_pixel_match_recovers_same_image_after_metadata_edit():
    image = Image.new("RGB", (20, 20), (15, 75, 140))
    original = io.BytesIO()
    image.save(original, format="PNG")
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("source", "WhatsApp")
    edited = io.BytesIO()
    image.save(edited, format="PNG", pnginfo=metadata)
    assert ownership_fingerprint(original.getvalue()) != ownership_fingerprint(edited.getvalue())
    pixel_hash = normalized_pixel_fingerprint(original.getvalue())
    photos = [{"storage_path": "catalogue/first.png", "public_pixel_hash": pixel_hash}]
    assert exact_file_matches(
        photos, ownership_fingerprint(edited.getvalue()),
        normalized_pixel_fingerprint(edited.getvalue()),
    ) == ["catalogue/first.png"]


def test_second_photo_of_same_product_does_not_hide_near_copy():
    urls = {"/one": [({"id": "A"}, 0)], "/two": [({"id": "A"}, 1)],
            "/other": [({"id": "B"}, 0)]}
    photos = [{"url": "/one", "full_distance": 2, "variant_distance": 2},
              {"url": "/two", "full_distance": 3, "variant_distance": 3},
              {"url": "/other", "full_distance": 50, "variant_distance": 40}]
    product_id, best, confident = strongest_full_frame_match(photos, urls)
    assert (product_id, best["url"], confident) == ("A", "/one", True)


def test_shared_photo_and_close_competitor_cannot_return_single_product():
    shared = [{"url": "/shared", "full_distance": 0, "variant_distance": 0}]
    urls = {"/shared": [({"id": "A"}, 0), ({"id": "B"}, 0)]}
    assert strongest_full_frame_match(shared, urls)[2] is False
    urls["/shared"] = [({"id": "A"}, 0)]
    urls["/competitor"] = [({"id": "B"}, 0)]
    near = shared + [{"url": "/competitor", "full_distance": 4, "variant_distance": 1}]
    assert strongest_full_frame_match(near, urls)[2] is False
