# Regional matching for customer room photos

When the existing leading match is below 0.80 (but at least 0.55), regional rescue examines 18 generic overlapping portrait windows. It selects at most three promising, spatially separated windows and runs the existing query encoder on those crops. This is bounded regional retrieval, not a learned object detector or guaranteed segmentation.

The existing pinned model, catalogue vectors, hashes, index version, reference bundle, and reviewed relationships are unchanged. No reindex, new dependency, environment setting, catalogue-image download, or manual SKU mapping is required.

A regional winner must score at least 0.80 and improve on the existing leader by at least 0.03. If the winner is unchanged, the original results remain unchanged. Near-leading variants from its region can appear alongside it; another region's winner requires at least 0.75 and supporting evidence of at least 0.72 from another region. Results are deduplicated and capped at 12, with at most six closest designs. Visual matches never receive the exact-image label.

Exact results, existing closest/related results, stronger leaders, incomplete global indexes, invalid vectors, failed scans, and scans exceeding eight seconds retain the existing result path. Cancellation stops further crop processing between model calls. The additional work runs off the event loop and performs no index writes.

## Verification

The owner-labelled room photograph in `tests/fixtures/customer-reference-evaluation/pendants-room.jpg` is an evaluation fixture only, never indexed as a runtime reference. Expected close designs: SGE-HL-076, SGE-HL-077, SGE-HL-078. Expected similar designs: SGE-HL-072, SGE-HL-073, SGE-HL-074, SGE-HL-075, SGE-HL-079. Additional similar results may appear.

Full-catalogue evaluation compares the original and compressed photo plus 104 existing cases against the current released ranking. Unit tests cover evidence thresholds, corroboration, exact-result preservation, bounded results, cancellation and corrupt/incomplete data. Service tests cover saved-index integration and failure fallback.

This does not guarantee recognition of every unseen room, angle, occlusion or image quality. The owner's full set of approximately 30 successful independent photographs has not been supplied. Weak searches incur extra processing; ordinary strong searches bypass it.
