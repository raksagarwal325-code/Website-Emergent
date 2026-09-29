# Customer background image search

Weak whole-photo matches now use a durable background regional scan instead of
holding the public upload request open. Exact and confident searches keep the
existing synchronous path and ranking.

## Flow

1. `POST /api/search/image` runs the existing exact, visual and detail checks.
2. If the existing `needs_region_check` gate is false, the response is unchanged.
3. If the gate is true, the server stores a short-lived job and returns
   `search_status: processing`, a random `job_id`, and `poll_after_ms`.
4. One worker claims queued jobs and runs the same regional ranking with a
   45-second budget.
5. `GET /api/search/image/jobs/{job_id}` returns `processing`, `complete`, or
   `failed`. The customer UI polls and displays only completed results.

The worker is single-file and shares the visual encoder lock, so it does not
start parallel ONNX inference on the 0.5-vCPU deployment. Jobs survive a backend
restart. A TTL index removes expired documents. Uploaded bytes and the internal
baseline are explicitly removed as soon as a job completes or fails; completed
result metadata expires after one hour.

No new environment variable or catalogue re-index is required.

## Verification

- Exact and confident searches return without creating a job.
- Weak searches return quickly with a job ID.
- Queued jobs remain `processing` to the public client until claimed.
- The background scan uses the longer budget and retains existing regional
  ranking rules.
- Completed/failed jobs contain no uploaded image bytes.
- Closing or replacing the browser search cancels polling.

