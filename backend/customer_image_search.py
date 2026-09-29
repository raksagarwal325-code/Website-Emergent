"""Independent, persistent customer visual index and bounded public search."""
import asyncio
import contextlib
import hashlib
import logging
import os
import time
import threading
import uuid
from datetime import datetime, timedelta, timezone

import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pymongo import ReturnDocument

from customer_visual_features import INDEX_VERSION, MAX_BYTES, VisualEncoder, decode_image, image_hashes, rank_images
from media_library import canonical_media_url
from customer_image_references import ReferenceBundle
from customer_design_ranking import (DESIGN_VERSION, add_related_designs,
                                     encode_details, load_relations,
                                     needs_detail_check, promote_detail_match,
                                     unpack_details)

from customer_region_search import (BACKGROUND_REGIONS, REGION_VERSION,
                                    needs_background_region_check,
                                    needs_region_check, rescue_region_matches)

logger = logging.getLogger(__name__)
PUBLIC_FIELDS = {"_id": 0, "id": 1, "name": 1, "sku": 1, "category": 1, "images": 1, "slug": 1}
BACKGROUND_REGION_SECONDS = 45.0
BACKGROUND_JOB_TTL_MINUTES = 15
BACKGROUND_RESULT_TTL_MINUTES = 60
BACKGROUND_JOB_LIMIT = 8


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


def gallery_urls(products, items):
    """Map approved project-gallery photos to their linked public products."""
    by_id = {product.get("id"): product for product in products if product.get("id")}
    result = {}
    for item in items or []:
        linked = [by_id[product_id] for product_id in item.get("products") or [] if product_id in by_id]
        if not linked:
            continue
        for raw in item.get("images") or []:
            if not isinstance(raw, str) or not raw.strip():
                continue
            url = canonical_media_url(raw)
            for product in linked:
                if product not in result.setdefault(url, []):
                    result[url].append(product)
    return result


def gallery_crop_matches(query_data, rows, mapping, matches, limit=12):
    """Recognise a customer crop contained inside a linked gallery photograph."""
    query = unpack_details(query_data)
    if query is None:
        return matches
    scores = {}
    products = {}
    for row in rows:
        stored = unpack_details(row.get("design_vectors")) if row.get("design_version") == DESIGN_VERSION else None
        if stored is None:
            continue
        overlap = (query @ stored.T).max(axis=1)
        strongest = np.sort(overlap)[-max(8, len(overlap) // 2):]
        score = float(strongest.mean())
        for product in mapping.get(row.get("url"), []):
            product_id = product.get("id")
            if product_id:
                products[product_id] = product
                scores[product_id] = max(score, scores.get(product_id, -1))
    if not scores:
        return matches
    ordered = sorted(scores, key=lambda product_id: (-scores[product_id], product_id))
    best = scores[ordered[0]]
    if best < .72:
        return matches
    winners = [product_id for product_id in ordered if best - scores[product_id] <= .015]
    selected = [{"product": products[product_id], "score": scores[product_id], "match_type": "closest"}
                for product_id in winners]
    seen = set(winners)
    return (selected + [match for match in matches if match["product"]["id"] not in seen])[:limit]


class CustomerImageSearch:
    def __init__(self, db, load_image):
        self.db = db
        self.load_image = load_image
        self.encoder = VisualEncoder()
        self.task = None
        self.job_task = None
        self.busy = asyncio.Semaphore(2)
        self.owner = uuid.uuid4().hex
        self.last_region_search = None
        self.design_relations = load_relations()
        self.references = ReferenceBundle(os.environ.get("CUSTOMER_IMAGE_REFERENCE_MANIFEST"))

    async def catalogue(self):
        return await self.db.products.find({"status": "published", "images.0": {"$exists": True}}, PUBLIC_FIELDS).to_list(None)

    async def search_urls(self):
        products = await self.catalogue()
        urls = catalogue_urls(products)
        settings_collection = getattr(self.db, "settings", None) if self.db is not None else None
        settings = await settings_collection.find_one(
            {"id": "settings"}, {"_id": 0, "homepage_content.gallery.items": 1}
        ) if settings_collection is not None else {}
        settings = settings or {}
        items = (((settings.get("homepage_content") or {}).get("gallery") or {}).get("items") or [])
        for url, linked in gallery_urls(products, items).items():
            for product in linked:
                if product not in urls.setdefault(url, []):
                    urls[url].append(product)
        return urls

    async def manifest(self, urls):
        paths = [u.removeprefix("/api/files/") for u in urls if u.startswith("/api/files/")]
        files = await self.db.files.find({"storage_path": {"$in": paths}}, {"storage_path": 1, "public_sha256": 1, "sha256": 1, "updated_at": 1}).to_list(None)
        revisions = {"/api/files/" + r["storage_path"]: str(r.get("public_sha256") or r.get("sha256") or r.get("updated_at") or "") for r in files}
        return {url: hashlib.sha256((INDEX_VERSION + url + revisions.get(url, "")).encode()).hexdigest() for url in urls}

    async def rows(self, manifest, details=False):
        projection = {"_id": 0} if details else {"_id": 0, "design_vectors": 0}
        return await self.db.customer_visual_images.find({"_id": {"$in": list(manifest.values())}}, projection).to_list(None)

    async def detail_rows(self, manifest, urls, candidates):
        ids = {m["product"]["id"] for m in candidates}
        selected = [url for url, products in urls.items() if any(p["id"] in ids for p in products)]
        found = await self.db.customer_visual_images.find(
            {"_id": {"$in": [manifest[url] for url in selected]}},
            {"_id": 0, "url": 1, "design_vectors": 1, "design_version": 1},
        ).to_list(None)
        by_url = {r["url"]: r for r in found}
        return [by_url.get(url, {"url": url}) for url in selected]

    async def gallery_detail_rows(self, manifest, selected):
        if not selected:
            return []
        return await self.db.customer_visual_images.find(
            {"_id": {"$in": [manifest[url] for url in selected]}},
            {"_id": 0, "url": 1, "design_vectors": 1, "design_version": 1},
        ).to_list(None)

    async def refresh(self):
        urls = await self.search_urls()
        if not urls:
            return
        manifest = await self.manifest(urls)
        existing = {r["url"]: r for r in await self.rows(manifest, details=True)}
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
        self.job_task = asyncio.create_task(self.run_jobs())

    async def stop(self):
        tasks = [task for task in (self.task, self.job_task) if task]
        for task in tasks:
            task.cancel()
        for task in tasks:
            with contextlib.suppress(asyncio.CancelledError):
                await task

    async def status(self):
        urls = await self.search_urls()
        rows = await self.rows(await self.manifest(urls), details=True)
        return {
            "total_images": len(urls),
            "exact_indexed": sum(bool(r.get("pixels")) for r in rows),
            "visual_indexed": sum(bool(r.get("vectors")) for r in rows),
            "failed_images": sum(bool(r.get("retry_after")) for r in rows),
            "design_indexed": sum(r.get("design_version") == DESIGN_VERSION and bool(r.get("design_vectors")) for r in rows),
            "model_ready": self.encoder.session is not None,
            "worker_running": bool(self.task and not self.task.done()),
            "background_worker_running": bool(self.job_task and not self.job_task.done()),
            "region_search_version": REGION_VERSION,
            "inference_threads": getattr(self.encoder, 'inference_threads', None),
            "last_region_search": self.last_region_search,
        }

    @property
    def jobs(self):
        return self.db.customer_image_search_jobs

    async def enqueue_region_search(self, data, matches):
        now = datetime.now(timezone.utc)
        active = await self.jobs.count_documents({
            "status": {"$in": ["queued", "processing"]},
            "expires_at": {"$gt": now},
        })
        if active >= BACKGROUND_JOB_LIMIT:
            raise HTTPException(429, "Detailed image search is busy. Please try again shortly.")
        job_id = uuid.uuid4().hex
        await self.jobs.insert_one({
            "_id": job_id,
            "status": "queued",
            "image": data,
            "baseline": matches,
            "created_at": now,
            "updated_at": now,
            "expires_at": now + timedelta(minutes=BACKGROUND_JOB_TTL_MINUTES),
        })
        return job_id

    async def get_job(self, job_id):
        if len(job_id) != 32 or any(c not in "0123456789abcdef" for c in job_id):
            raise HTTPException(404, "Image search not found or expired.")
        job = await self.jobs.find_one({"_id": job_id}, {"_id": 0, "image": 0, "baseline": 0})
        if not job:
            raise HTTPException(404, "Image search not found or expired.")
        response = {
            "job_id": job_id,
            "search_status": "processing" if job["status"] in {"queued", "processing"} else job["status"],
            "poll_after_ms": 1500,
        }
        if job["status"] == "complete":
            response.update(job.get("result") or {})
        elif job["status"] == "failed":
            response["detail"] = "Detailed image search could not finish. Please upload the image again."
        return response

    async def run_jobs(self):
        try:
            await self.jobs.create_index("expires_at", expireAfterSeconds=0)
            # This deployment has one backend worker. Re-queue work interrupted by a restart.
            await self.jobs.update_many(
                {"status": "processing"},
                {"$set": {"status": "queued", "updated_at": datetime.now(timezone.utc)}},
            )
        except Exception:
            logger.exception("Could not initialise customer image search jobs")
        while True:
            try:
                now = datetime.now(timezone.utc)
                job = await self.jobs.find_one_and_update(
                    {"status": "queued", "expires_at": {"$gt": now}},
                    {"$set": {"status": "processing", "updated_at": now, "owner": self.owner}},
                    sort=[("created_at", 1)],
                    return_document=ReturnDocument.AFTER,
                )
                if not job:
                    await asyncio.sleep(.5)
                    continue
                await self.process_job(job)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Customer background image search worker temporarily unavailable")
                await asyncio.sleep(1)

    async def process_job(self, job):
        diagnostic = {"started_at": time.time(), "outcome": "running", "mode": "background"}
        cancelled = threading.Event()
        try:
            if self.encoder.session is None:
                await asyncio.to_thread(self.encoder.load)
            image = await asyncio.to_thread(decode_image, bytes(job["image"]))
            catalogue = await self.catalogue()
            catalogue_only = set(catalogue_urls(catalogue))
            urls = await self.search_urls()
            manifest = await self.manifest(urls)
            rows = await self.rows(manifest)
            matches = job.get("baseline") or []
            gallery_selected = [url for url in urls if url not in catalogue_only]
            gallery_rows = await self.gallery_detail_rows(manifest, gallery_selected)
            if gallery_rows:
                query_details = await asyncio.to_thread(encode_details, self.encoder, image)
                crop_matches = await asyncio.to_thread(
                    gallery_crop_matches, query_details, gallery_rows, urls, matches)
                if crop_matches is not matches:
                    matches = crop_matches
                    diagnostic.update(outcome="gallery_crop_match", gallery_images=len(gallery_rows))
            if diagnostic.get("outcome") != "gallery_crop_match":
                matches = await asyncio.to_thread(
                    rescue_region_matches, self.encoder, image, rows, urls, matches,
                    cancelled, diagnostic, seconds=BACKGROUND_REGION_SECONDS,
                    regions=BACKGROUND_REGIONS, force=True,
                )
            products = {p["id"]: p for values in urls.values() for p in values}
            matches = add_related_designs(matches, list(products.values()), self.design_relations)
            indexed = sum(bool(row.get("vectors")) for row in rows)
            result = {
                "matches": [{"product": m["product"], "match_type": m["match_type"]} for m in matches],
                "index_complete": indexed == len(urls) and bool(urls),
                "available": any(row.get("pixels") for row in rows),
                "similarity_available": self.encoder.session is not None and indexed > 0,
            }
            now = datetime.now(timezone.utc)
            await self.jobs.update_one(
                {"_id": job["_id"], "status": "processing", "owner": self.owner},
                {"$set": {"status": "complete", "result": result, "updated_at": now,
                           "expires_at": now + timedelta(minutes=BACKGROUND_RESULT_TTL_MINUTES)},
                 "$unset": {"image": "", "baseline": "", "owner": ""}},
            )
        except asyncio.CancelledError:
            diagnostic["outcome"] = "worker_cancelled"
            raise
        except Exception:
            diagnostic["outcome"] = "error"
            logger.exception("Customer background regional search failed")
            now = datetime.now(timezone.utc)
            await self.jobs.update_one(
                {"_id": job["_id"]},
                {"$set": {"status": "failed", "updated_at": now,
                           "expires_at": now + timedelta(minutes=BACKGROUND_RESULT_TTL_MINUTES)},
                 "$unset": {"image": "", "baseline": "", "owner": ""}},
            )
        finally:
            cancelled.set()
            self.last_region_search = dict(diagnostic)
            logger.info("Customer background regional search: %s", self.last_region_search)

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
            urls = await self.search_urls()
            manifest = await self.manifest(urls)
            rows = await self.rows(manifest)
            indexed = sum(bool(r.get("vectors")) for r in rows)
            vectors = await asyncio.to_thread(self.encoder.encode_query, image) if self.encoder.session is not None else None
            candidate_rows, candidate_urls = self.references.augment(rows, urls)
            matches = await asyncio.to_thread(rank_images, hashes, vectors, candidate_rows, candidate_urls)
            job_id = None
            background_ready = indexed == len(urls) and self.encoder.session is not None
            # Room photos that need the regional pass must leave the request path
            # before patch/detail inference. That work was the remaining source of
            # browser timeouts even after the regional scan itself became a job.
            if background_ready and needs_background_region_check(matches):
                job_id = await self.enqueue_region_search(data, matches)
            elif needs_detail_check(matches) and self.encoder.session is not None:
                try:
                    candidates = await asyncio.to_thread(rank_images, hashes, vectors, candidate_rows, candidate_urls, 60)
                    detail_rows = await self.detail_rows(manifest, urls, candidates)
                    details = await asyncio.to_thread(encode_details, self.encoder, image)
                    matches = await asyncio.to_thread(promote_detail_match, candidates, details, detail_rows, urls)
                except Exception:
                    logger.exception("Detail comparison unavailable; retaining original image results")
            if not job_id and background_ready and needs_background_region_check(matches):
                job_id = await self.enqueue_region_search(data, matches)
            if job_id:
                self.last_region_search = {
                    "started_at": time.time(), "outcome": "queued", "mode": "background",
                    "leading_score": round(matches[0]['score'], 4) if matches else None,
                }
            else:
                outcome = 'not_needed'
                if needs_background_region_check(matches):
                    outcome = 'index_incomplete' if indexed != len(urls) else 'model_unavailable'
                self.last_region_search = {"started_at": time.time(), "outcome": outcome, "elapsed_seconds": 0,
                                           "leading_score": round(matches[0]['score'], 4) if matches else None}
            products = {p["id"]: p for values in urls.values() for p in values}
            matches = add_related_designs(matches, list(products.values()), self.design_relations)
            response = {
                "matches": [{"product": m["product"], "match_type": m["match_type"]} for m in matches],
                "index_complete": indexed == len(urls) and bool(urls),
                "available": any(r.get("pixels") for r in rows),
                "similarity_available": vectors is not None and indexed > 0,
            }
            if job_id:
                response.update({"search_status": "processing", "job_id": job_id, "poll_after_ms": 1500})
            return response
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

    @router.get("/search/image/jobs/{job_id}")
    async def image_search_job(job_id: str):
        return await service.get_job(job_id)

    return router
