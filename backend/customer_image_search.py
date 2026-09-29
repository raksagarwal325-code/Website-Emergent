"""Independent, persistent customer visual index and bounded public search."""
import asyncio
import contextlib
import hashlib
import logging
import os
import time
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from customer_visual_features import INDEX_VERSION, MAX_BYTES, VisualEncoder, decode_image, image_hashes, rank_images
from media_library import canonical_media_url
from customer_image_references import ReferenceBundle
from customer_design_ranking import DESIGN_VERSION, encode_details, needs_detail_check, promote_detail_match, load_relations, add_related_designs

logger = logging.getLogger(__name__)
PUBLIC_FIELDS = {"_id": 0, "id": 1, "name": 1, "sku": 1, "category": 1, "images": 1, "slug": 1}


def catalogue_urls(products):
    result = {}
    for product in products:
        if not product.get("id"):
            continue
        for raw in product.get("images") or []:
            if isinstance(raw, str) and raw.strip():
                url = canonical_media_url(raw)
                if product not in result.setdefault(url, []):
                    result[url].append(product)
    return result


class CustomerImageSearch:
    def __init__(self, db, load_image):
        self.db = db
        self.load_image = load_image
        self.encoder = VisualEncoder()
        self.task = None
        self.busy = asyncio.Semaphore(2)
        self.owner = uuid.uuid4().hex
        self.design_relations = load_relations()
        self.references = ReferenceBundle(os.environ.get("CUSTOMER_IMAGE_REFERENCE_MANIFEST"))

    async def catalogue(self):
        return await self.db.products.find({"status": "published", "images.0": {"$exists": True}}, PUBLIC_FIELDS).to_list(None)

    async def manifest(self, urls):
        paths = [u.removeprefix("/api/files/") for u in urls if u.startswith("/api/files/")]
        files = await self.db.files.find({"storage_path": {"$in": paths}}, {"storage_path": 1, "public_sha256": 1, "sha256": 1, "updated_at": 1}).to_list(None)
        revisions = {"/api/files/" + r["storage_path"]: str(r.get("public_sha256") or r.get("sha256") or r.get("updated_at") or "") for r in files}
        return {url: hashlib.sha256((INDEX_VERSION + url + revisions.get(url, "")).encode()).hexdigest() for url in urls}

    async def rows(self, manifest):
        return await self.db.customer_visual_images.find({"_id": {"$in": list(manifest.values())}}, {"_id": 0}).to_list(None)

    async def refresh(self):
        urls = catalogue_urls(await self.catalogue())
        if not urls:
            return
        manifest = await self.manifest(urls)
        existing = {r["url"]: r for r in await self.rows(manifest)}
        # Only the worker downloads/loads model weights. Requests never do so.
        try:
            await asyncio.to_thread(self.encoder.load)
        except Exception:
            logger.exception("Visual model unavailable; building exact-image index only")
        try:
            await asyncio.to_thread(self.references.refresh, self.encoder)
        except Exception:
            logger.exception("Optional customer reference bundle unavailable; using catalogue only")
        for url, key in manifest.items():
            row = existing.get(url, {})
            if (row.get("vectors") and row.get("design_version") == DESIGN_VERSION and row.get("design_vectors")) or row.get("retry_after", 0) > time.time() or (row.get("pixels") and self.encoder.session is None):
                continue
            lease = await self.db.customer_visual_state.update_one(
                {"_id": "lease", "owner": self.owner}, {"$set": {"until": time.time() + 180}},
            )
            if not lease.matched_count:
                return
            try:
                data = await asyncio.wait_for(self.load_image(url), 30)
                image = await asyncio.to_thread(decode_image, data)
                hashes = await asyncio.to_thread(image_hashes, data, image)
                # Exact searches are usable as soon as an image is decoded.
                await self.db.customer_visual_images.update_one({"_id": key}, {"$set": {"url": url, **hashes}}, upsert=True)
                if self.encoder.session is not None:
                    vectors = row.get("vectors") or await asyncio.to_thread(self.encoder.encode, image)
                    await self.db.customer_visual_images.update_one({"_id": key}, {"$set": {"vectors": vectors}, "$unset": {"retry_after": ""}})
                    details = await asyncio.to_thread(encode_details, self.encoder, image)
                    await self.db.customer_visual_images.update_one({"_id": key}, {"$set": {"design_vectors": details, "design_version": DESIGN_VERSION}})
            except Exception:
                logger.exception("Customer visual index failed for %s", url)
                await self.db.customer_visual_images.update_one({"_id": key}, {"$set": {"url": url, "retry_after": time.time() + 3600}}, upsert=True)
        # Remove deleted/replaced assets from this index only.
        await self.db.customer_visual_images.delete_many({"_id": {"$nin": list(manifest.values())}})

    async def run(self):
        while True:
            try:
                await self.db.customer_visual_state.update_one({"_id": "lease"}, {"$setOnInsert": {"until": 0}}, upsert=True)
                lease = await self.db.customer_visual_state.update_one(
                    {"_id": "lease", "$or": [{"until": {"$lt": time.time()}}, {"owner": self.owner}]},
                    {"$set": {"owner": self.owner, "until": time.time() + 180}},
                )
                if lease.modified_count:
                    try:
                        await self.refresh()
                    finally:
                        await self.db.customer_visual_state.update_one({"_id": "lease", "owner": self.owner}, {"$set": {"until": 0}})
                elif self.encoder.session is None:
                    # Each web worker needs an encoder; only the lease holder indexes.
                    await asyncio.to_thread(self.encoder.load)
                    await asyncio.to_thread(self.references.refresh, self.encoder)
            except Exception:
                logger.exception("Customer visual index temporarily unavailable")
            await asyncio.sleep(300)

    def start(self):
        self.task = asyncio.create_task(self.run())

    async def stop(self):
        if self.task:
            self.task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.task

    async def status(self):
        urls = catalogue_urls(await self.catalogue())
        rows = await self.rows(await self.manifest(urls))
        return {
            "total_images": len(urls),
            "exact_indexed": sum(bool(r.get("pixels")) for r in rows),
            "visual_indexed": sum(bool(r.get("vectors")) for r in rows),
            "failed_images": sum(bool(r.get("retry_after")) for r in rows),
            "design_indexed": sum(r.get("design_version") == DESIGN_VERSION and bool(r.get("design_vectors")) for r in rows),
            "model_ready": self.encoder.session is not None,
            "worker_running": bool(self.task and not self.task.done()),
        }

    async def search(self, data):
        try:
            await asyncio.wait_for(self.busy.acquire(), 0.1)
        except asyncio.TimeoutError:
            raise HTTPException(429, "Image search is busy. Please try again shortly.")
        try:
            try:
                image = await asyncio.to_thread(decode_image, data)
                hashes = await asyncio.to_thread(image_hashes, data, image)
            except Exception as exc:
                raise HTTPException(400, str(exc) if isinstance(exc, ValueError) else "Could not read that image. Choose a JPG, PNG or WebP.")
            urls = catalogue_urls(await self.catalogue())
            manifest = await self.manifest(urls)
            rows = await self.rows(manifest)
            indexed = sum(bool(r.get("vectors")) for r in rows)
            vectors = await asyncio.to_thread(self.encoder.encode_query, image) if self.encoder.session is not None else None
            candidate_rows, candidate_urls = self.references.augment(rows, urls)
            matches = await asyncio.to_thread(rank_images, hashes, vectors, candidate_rows, candidate_urls)
            if needs_detail_check(matches) and self.encoder.session is not None:
                try:
                    candidates = await asyncio.to_thread(rank_images, hashes, vectors, candidate_rows, candidate_urls, 60)
                    details = await asyncio.to_thread(encode_details, self.encoder, image)
                    matches = await asyncio.to_thread(promote_detail_match, candidates, details, candidate_rows, candidate_urls)
                except Exception:
                    logger.exception("Detail comparison unavailable; retaining original image results")
            products = {p["id"]: p for values in urls.values() for p in values}
            matches = add_related_designs(matches, list(products.values()), self.design_relations)
            return {
                "matches": [{"product": m["product"], "match_type": m["match_type"]} for m in matches],
                "index_complete": indexed == len(urls) and bool(urls),
                "available": any(r.get("pixels") for r in rows),
                "similarity_available": vectors is not None and indexed > 0,
            }
        finally:
            self.busy.release()


def search_router(service, rate_dependency):
    router = APIRouter()

    @router.post("/search/image", dependencies=[Depends(rate_dependency)])
    async def search_image(file: UploadFile = File(...)):
        try:
            if (file.content_type or "").split(";")[0].lower() not in {"image/jpeg", "image/png", "image/webp"}:
                raise HTTPException(400, "Choose a JPG, PNG or WebP image.")
            data = await file.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise HTTPException(413, "Choose an image smaller than 10 MB.")
            try:
                return await asyncio.wait_for(service.search(data), 20)
            except asyncio.TimeoutError:
                raise HTTPException(503, "Image search could not finish. Please try again shortly.")
        finally:
            await file.close()

    return router

