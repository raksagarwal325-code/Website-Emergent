# Half-CPU customer image-search evaluation — 2026-09-29

## Decision

No experimental runtime change is approved for production. None of the tested
shortcuts preserved the owner-labelled room-photo requirements while providing
a convincing live-performance margin. Main remains on the timing-diagnostics
release; these experiments are isolated.

## Required room-photo results

HL-076, HL-077 and HL-078 first (closest); HL-072, HL-073, HL-074, HL-075
and HL-079 among similar products. Check the original and compressed photo.
No hardcoded SKU lookup was added to the runtime.

## Evidence

The live diagnostic reported 8.423 regional seconds: 7.677071 in model execution,
0.000101 waiting for its lock, 0.411784 preprocessing and 0.333568 other work.
It started 11 inference calls, completed 10 coarse regions and no refinements.
The 1,092-image index was complete with zero failures.

Offline tests use 544 public products and 1,092 public catalogue images. Inference
has network access denied. systemd enforces CPUQuota=50%, with cpu.max verified
as 50000 100000. ONNX uses one inference thread, as observed on live.
The runner is faster per model call than production; equal quota does not imply
equal hardware performance.

- Quantized model: 106 existing cases exercised. Original room scan still
  exceeded eight seconds. With enough time it promoted HL-075 ahead of HL-077
  and omitted HL-078 from the leading group. Compressed photo failed even with
  the longer diagnostic budget. Rejected.
  https://github.com/raksagarwal325-code/Website-Emergent/actions/runs/36551169169
- Smaller inputs: original export rejects non-224 input due to fixed positional
  interpolation scale. Isolated corrected exports execute, but 168/140 inputs
  change required matching and 112 inputs fail to rescue either room photo.
  Rejected before broader regression testing.
  https://github.com/raksagarwal325-code/Website-Emergent/actions/runs/36553644899
- Stored detail features selecting fixed crop windows: faster, but HL-078 does
  not lead; compressed photo loses expected alternatives. Rejected.
  https://github.com/raksagarwal325-code/Website-Emergent/actions/runs/36554441396
- Feature-based object bounds, including thin-chain filtering: tested several
  thresholds; none preserves the required leading group and all expected
  alternatives on both room-photo versions. Rejected.
  https://github.com/raksagarwal325-code/Website-Emergent/actions/runs/36555610516

The full original 224-pixel scan, with its diagnostic timeout extended offline,
still returns the required leading three and expected alternatives for both
versions. Its regional stage took roughly 9–12 seconds on half-CPU test runners;
live per-call timings suggest a materially longer duration there.

## Limits and next decision

No claim that all possible optimizations are exhausted. No claim that a resource
upgrade alone is verified. The owner's roughly 30 successful photos are not all
available as independent regression fixtures.

A longer background detailed-search job could retain the full matching work
without the synchronous request timeout, but changes customer waiting time.
More processing capacity is another unverified option with additional cost.
This product tradeoff needs agreement before implementing a different request
lifecycle or recommending a purchase. No index rebuild is needed for the
current diagnostic release.
