# Regional search on CPU-limited deployments

Version: `efficient-regions-v2`.

The original regional rescue could perform 72 separate model passes within its eight-second wall-clock budget. Expiry returned the original ranking without a reason in admin status. Full indexing therefore did not establish that regional matching completed.

## Changes

- Regional discovery uses one aspect-preserving padded view for each of the same 18 windows.
- Up to three windows receive the same five additional padded subviews; each reuses its coarse vector. Maximum: 33 model passes.
- Catalogue embeddings, the pinned model, normal 12-view search, matching thresholds, reviewed relations and optional references are unchanged. No reindex or environment change.
- ONNX uses one intra-op thread when CPU affinity or cgroup v1/v2 quota provides fewer than two CPUs; otherwise it retains two. This avoids oversubscription on constrained containers.
- The shared encoder lock respects the remaining regional budget. Cancellation and expiry stop subsequent passes and preserve the original matches. One in-flight native model pass cannot be interrupted.
- No batching or extra model session is added to production.

## Admin diagnosis

GET `/api/admin/customer-image-search/status` now also reports:
- `region_search_version`
- `inference_threads` (null until the model loads)
- `last_region_search`: timestamp, leading score, outcome, and available duration/coarse/refined counts.

Outcomes distinguish matched, no improvement, not needed, incomplete index, unavailable model, invalid vectors, no promising regions, budget expiry, cancellation and errors. This is the latest search on the responding worker, resets on restart, and is also logged for actual regional attempts. It contains no uploaded image, image identifier, customer identity or product list.

## Deployment and limits

Sync and restart the backend, then publish through the usual Emergent flow. Confirm the new version in live admin status and retry the original image. An older or absent version means the new backend is not serving that request. A budget outcome identifies a runtime resource problem without rebuilding the index.

The eight-second regional budget and twenty-second request timeout remain unchanged. Severe resource contention can still trigger fallback. Reduced views are a general retrieval approximation; sample regression checks cannot establish accuracy for every future photo. Live deployment must be validated separately from isolated evaluations.
