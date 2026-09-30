# Optional customer image-search references

The existing search is the default and remains unchanged when
`CUSTOMER_IMAGE_REFERENCE_MANIFEST` is unset. Model version, query views,
thresholds, fallback limits and public galleries are unchanged.

An optional manifest links approved real-world product photographs to their
published SKUs. The worker encodes that small bundle once and caches it in
memory. Requests augment candidate rows with those vectors using the existing
ranking function. No reference data is written to MongoDB or to a product's
gallery. References are returned only while their SKU resolves to exactly one
currently published catalogue product. An invalid/unavailable bundle falls back
to normal catalogue search.

The supplied opt-in bundle is
`backend/customer_reference_bundles/2026-09-28/manifest.json` and contains the
owner-confirmed CS-001, WL-085 and CS-002 examples, with approved SHA-256 hashes.
All file paths must remain inside the bundle directory. At most 20 references
are allowed; normal image size/format checks still apply.

This setting is **not activated by the PR**. Do not activate it based on a green
unit test or on matching the very same seeded photographs. Review the isolated
full-catalogue evaluation report first. Adding candidates can change existing
rankings even though the model and thresholds are unchanged.

For an approved Emergent deployment the absolute manifest path would be
`/app/backend/customer_reference_bundles/2026-09-28/manifest.json`. Unsetting
the variable and restarting the backend restores the original candidate set;
there are no database changes to undo.

## Evaluation boundaries

The experiment branch's GitHub Actions workflow retrieves every public catalogue
page and image. Coverage failures abort the run. Downloads are cached for retry;
model inference runs with network sockets disabled. The report separates seeded
sanity checks, compressed derivatives, independent owner-labelled photographs,
and catalogue-derived controls across categories.

The rebuilt public-image index is not an export of production's stored vectors.
The owner's complete set of approximately 30 successful photos is not available.
Passing the supplied controls does not prove zero impact on all future searches.

The reference feature belongs only to customer image search. Quotation logic is
untouched.
