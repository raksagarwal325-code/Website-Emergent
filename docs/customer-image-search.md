# Customer image search

A standalone feature accessed through the camera button inside the catalogue/category search bar. It does not call or modify quotation matching, use quotation collections, or require an admin session for searching.

## Architecture

- `POST /api/search/image`: JPG/PNG/WebP upload, 10 MB and 20 megapixel limits, 20 requests per IP per five minutes, two concurrent searches per worker. Upload bytes are processed transiently; they are not persisted or sent to an external inference service.
- `customer_visual_images`: persistent byte/pixel hashes and two normalized CLIP vectors per published catalogue image. All saved product images are considered; no first-page or first-image cap.
- `customer_visual_state`: distributed indexing lease. A background worker checks published product records every five minutes, indexes new/changed images, and removes obsolete index entries. Search joins against the current published records, excluding deleted/unpublished products immediately.
- Search computes features only for the uploaded image and reads the existing index; it never downloads catalogue photos or starts indexing/model downloads during the request.
- Exact means identical bytes or decoded pixels. Embedding neighbours are labelled “Similar designs”, including different-angle/recompressed photos. Scores are not presented as probabilities. Similarity alone never establishes exact product identity.
- Catalogue URLs must change when externally hosted image bytes change. Application-managed files also use their saved content revision. Uploaded customer images never supply a URL for the backend to fetch.

## Deployment and readiness

Install the updated backend requirements (adds CPU ONNX Runtime). The background worker automatically downloads the pinned 85 MB model into the Hugging Face cache on first deployment. It needs outbound access to Hugging Face and its model CDN, plus enough memory for ONNX inference. No new paid API key is needed. Model loading is separate from web startup. Preserve the model cache between deploys where possible.

Alternatively provision the identical pinned model and set `CUSTOMER_IMAGE_MODEL_PATH` to its local filename. The model is `Xenova/clip-vit-base-patch32`, revision `d15189d7028b43f1d3e65039190477f6af591c2a`, file `onnx/vision_model_quantized.onnx`. Preprocessing follows that revision's `preprocessor_config.json` (RGB, bicubic resize, 224 centre crop, CLIP mean/std); a padded whole-object view is also indexed.

`CUSTOMER_IMAGE_SEARCH_ENABLED=false` stops the background worker (used by CI to avoid model downloads). It must be absent or `true` in production. An unavailable model still permits exact-image indexing/search. Failed images retry after an hour; model failures retry in the next five-minute cycle.

While signed into Admin, request `GET /api/admin/customer-image-search/status`. Before considering launch complete, verify `model_ready=true`, `worker_running=true`, and `visual_indexed=exact_indexed=total_images`, with zero failed images. Incomplete coverage is disclosed in the customer results. Then test original catalogue photos, screenshots, a different-angle room photo and an unrelated photo in the deployed preview on desktop and mobile. Publish through the usual Emergent workflow only after these checks.

## Validation

Local validation passed: 10 backend tests and 7 React interaction tests. Full repository tests, production build/prerender and security workflows run on PR #425; check the latest commit checks and review annotations before merging. The uploaded-photo preview decodes the image and creates a fresh PNG thumbnail rather than exposing the uploaded bytes directly as a browser image source.

Local deterministic tests cover upload validation, public field projection, no query-time catalogue downloads, exact/visual labels, product deduplication and removal, cancellation/stale-response behaviour and incomplete-index states. Real-model smoke testing used 13 live product images across five categories: all 13 originals and all 13 resized/JPEG-recompressed copies ranked their own product first against that sample. Local feature extraction/ranking took 0.10–0.19 seconds per sample, excluding network/database time. This does not establish full-catalogue retrieval accuracy or accuracy on unseen room photos. Production index readiness and deployed response times remain deployment checks.
