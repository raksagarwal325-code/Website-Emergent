# Owner-labelled customer image-search evaluation

These product photographs were supplied by the catalogue owner for testing customer image search.

| File | Owner-confirmed expected product/family | Use |
|---|---|---|
| cs-001.jpg | SGE-CS-001 | Supplemental-reference experiment |
| wl-085.jpg | SGE-WL-085; SGE-WL-081 is also similar | Supplemental-reference experiment |
| cs-002.jpg | SGE-CS-002 | Supplemental-reference experiment |
| wl-060.jpg | SGE-WL-060 | Independent holdout, never added to reference index |
| hl-114.jpg | SGE-HL-114 | Independent holdout, never added to reference index |
| meher.jpg | Meher family (clear examples CH-128, CH-131, CH-124) | Independent family holdout |

The existing published search is the baseline. The owner tested about 30 products and reported desired results in almost every case. Those exact 30 photos have not all been supplied, so the evaluation must not claim to cover them.

The experiment downloads every public catalogue page and every unique catalogue image, verifies coverage, and creates both candidate indexes only in runner memory. It aborts rather than presenting a partial index as full coverage. Running it does not modify the deployed application, restart a server, or contact a database. The optional runtime implementation is disabled by default. The supplemental references are not added to public product galleries.

Matching a seeded reference, or a compressed copy of one, is a sanity check only. It is not evidence of generalisation to a different photograph. Independent photos of the three difficult products are still required for that claim.

The workflow runs only on the dedicated experiment branch and uses no secrets. Its model inference phase prohibits network sockets, including telemetry. Reports are attached to the run for review. Do not merge or deploy merely because the workflow completes.
