# Customer image search

A shared catalogue visual-search service accessed through the public camera button and the quotation maker’s Search by image tab. Public searching does not require an admin session. Quotation customisation references and PDF generation remain separate.

## Architecture

- `POST /api/search/image`: JPG/PNG/WebP upload, 10 MB and 20 megapixel limits, 20 requests per IP per five minutes, two concurrent searches per worker. Upload bytes are processed transiently; they are not persisted or sent to an external inference service.
- `customer_visual_images`: persistent byte/pixel hashes and two normalized DINOv2 vectors per published catalogue image. All saved product images are considered; no first-page or first-image cap.
- `customer_visual_state`: distributed indexing lease. A background worker checks published product records every five minutes, indexes new/changed images, and removes obsolete index entries. Search joins against the current published records, excluding deleted/unpublished products immediately.
- Search computes features only for the uploaded image and reads the existing index; it never downloads catalogue photos or starts indexing/model downloads during the request.
- Exact means identical bytes or decoded pixels. Embedding neighbours are labelled “Similar designs”, including different-angle/recompressed photos. Scores are not presented as probabilities. Similarity alone never establishes exact product identity.
- Catalogue URLs must change when externally hosted image bytes change. Application-managed files also use their saved content revision. Uploaded customer images never supply a URL for the backend to fetch.

## Deployment and readiness

Install the updated backend requirements using the Python environment that actually runs Uvicorn. In the current Emergent preview that is `/root/.venv/bin/python`; installing into the terminal's default Python does not update the backend environment. The background worker automatically downloads the pinned 89 MB model into the Hugging Face cache on first deployment. It needs outbound access to Hugging Face and its model CDN, plus enough memory for ONNX inference. No new paid API key is needed. Model loading is separate from web startup. Preserve the model cache between deploys where possible.

Alternatively provision the identical pinned model and set `CUSTOMER_IMAGE_MODEL_PATH` to its local filename. The model is `Xenova/dinov2-small`, revision `c2bb04a51fab207c420665f1946016107bffc701`, file `onnx/model.onnx`. Preprocessing follows that revision's `preprocessor_config.json` (RGB, bicubic shortest-edge resize to 256, 224 centre crop, ImageNet mean/std). The normalized 384-dimensional CLS token is stored for the original and padded views. FP32 weights avoid introducing quantized scoring differences between CPU architectures. The index version changes with the model, so old CLIP vectors are never mixed with DINOv2 vectors; existing deployments rebuild the image index. If `CUSTOMER_IMAGE_MODEL_PATH` is set, replace the old model file with these pinned weights before restarting.

`CUSTOMER_IMAGE_SEARCH_ENABLED=false` stops the background worker (used by CI to avoid model downloads). It must be absent or `true` in production. An unavailable model still permits exact-image indexing/search. Failed images retry after an hour; model failures retry in the next five-minute cycle.

While signed into Admin, request `GET /api/admin/customer-image-search/status`. Before considering launch complete, verify `model_ready=true`, `worker_running=true`, and `visual_indexed=exact_indexed=total_images`, with zero failed images. Incomplete coverage is disclosed in the customer results. Then test original catalogue photos, screenshots, a different-angle room photo and an unrelated photo in the deployed preview on desktop and mobile. Publish through the usual Emergent workflow only after these checks.

## Validation

Local validation passed: 10 backend tests and 7 React interaction tests. Full repository tests, production build/prerender and security workflows run on PR #425; check the latest commit checks and review annotations before merging. The uploaded-photo preview decodes the image and creates a fresh PNG thumbnail rather than exposing the uploaded bytes directly as a browser image source.

Local deterministic tests cover upload validation, public field projection, no query-time catalogue downloads, exact/visual labels, product deduplication and removal, cancellation/stale-response behaviour and incomplete-index states. Real-model smoke testing used 13 live product images across five categories: all 13 originals and all 13 resized/JPEG-recompressed copies ranked their own product first against that sample. Local feature extraction/ranking took 0.10–0.19 seconds per sample, excluding network/database time. This does not establish full-catalogue retrieval accuracy or accuracy on unseen room photos. Production index readiness and deployed response times remain deployment checks.

## Room-photo ranking correction

The initial CLIP model ranked a supplied Noorvastra room photo behind unrelated hanging lights: CH-002 was fifth and CH-069 eleventh in the preview. Changing only the crop aggregation did not reliably correct this. DINOv2-small replaces the visual encoder for catalogue search; exact byte/pixel matching and request limits remain unchanged. Both finish variants are valid similar results; neither is labelled an exact image match from a different photograph.

## Background-heavy uploads and tentative candidates

Query encoding additionally inspects five fixed overlapping regions (left/right and upper/middle/lower centre). The original and padded full-photo vectors stay first. This is bounded to twelve query vectors, uses the same pinned model locally, and does not change catalogue embeddings or require an index rebuild. No SKU, filename, or customer-photo rule is used.

Strong visual results retain the 0.72 threshold and the “Similar designs” label. If there are no strong or exact results, whole-photo scores of at least 0.55 may produce up to four “Possible matches”, restricted to 0.06 of the best whole-photo candidate. Weak regional matches cannot trigger this fallback. The UI explicitly asks customers to compare details and does not represent these as identified products. Exact still means byte/pixel identity only.

This update does not resolve HEIC support or transient catalogue download failures. Deploy both frontend and backend together so the `possible` match type is rendered. Validate the supplied wall-light, Kandil and Meher examples against the complete production catalogue as well as unrelated uploads; local sample results alone do not establish full-catalogue accuracy.


## Quotation maker integration

The quotation maker calls the same `POST /api/search/image` endpoint and polls the same background job endpoint as the public search. It receives the same exact-first ordering, design-family relations, regional/multi-product matching, gallery-image mappings and automatic catalogue index updates. Results are adapted only for quotation selection: an administrator must explicitly choose **Add** before a product becomes a quotation line.

The older quotation-only quick matcher, AI detail job and technical diagnostics are no longer used by this interface. Their backend routes remain temporarily available for compatibility, but they do not affect quotation-maker results. Customisation reference images still describe requested product changes and are not sent through catalogue identification.
