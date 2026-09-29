# Regional search timing diagnostics

The authenticated `/api/admin/customer-image-search/status` response includes
`last_region_search`. A regional attempt now includes `timing_version:
region-stage-timing-v1` and these measurements in seconds:

- `preprocess_seconds`: padding and preparing tensors.
- `lock_wait_seconds`: waiting for the shared visual encoder lock.
- `inference_seconds`: elapsed wall time inside model calls, including a call
  that overruns the budget or raises an error.
- `inference_thread_cpu_seconds`: CPU time on the calling thread during model
  calls. This excludes ONNX worker threads; it is not total model CPU usage.
- `other_seconds`: remaining regional work, including catalogue preparation,
  crop creation, vector comparisons, normalization and scheduling delays.
- `inference_calls`: calls started; `lock_timeouts`: unsuccessful lock acquisitions.

These are regional-stage measurements, not total HTTP request timings. The
first four wall-time components (preprocess, lock wait, inference, other) sum
to regional elapsed time, within rounding. Thread CPU is a separate measure.
High lock wait indicates encoder contention. High inference wall time with low
lock wait rules out lock waiting as the main regional delay, but does not by
itself distinguish CPU throttling, host contention or slow model execution.
No automatic upgrade recommendation is inferred from these numbers.

Search thresholds, inference inputs, call count, deadline, model and index
versions remain unchanged. Metrics contain no uploaded image or credentials.
They are available through the existing authenticated status endpoint and logs,
not public search responses. Status is per worker and records its latest attempt;
a different request may overwrite it, or another worker may report no attempt.

After deploying, run the failing room photo once, then inspect status immediately.
Use the timing version to distinguish an instrumented attempt from older status.
No environment setting or index rebuild is required.
