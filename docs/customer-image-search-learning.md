# Verified real-world image-search examples

The Admin **Image Search** panel feeds difficult client photographs into the
existing customer image-search ranker. It does not create a second public
search flow. Both the website search and the quotation builder continue to use
the same `/api/search/image` endpoint.

For every verified example the backend stores only SHA/pixel fingerprints,
DINOv2 feature vectors, the selected published product IDs, and audit metadata.
The uploaded client image bytes are discarded after processing.

Learned references use a stricter `0.86` similarity gate and never label a
room photograph as an exact catalogue-product match. A reference below that
gate is ignored completely, preserving established catalogue ranking. One
photo may be linked to as many as 12 products for genuine multi-product rooms.

Deleting a product or unpublishing it automatically removes it from learned
search results because references resolve against the current published
catalogue on every request. Removing the verified example in Admin disables it
immediately and does not require a deployment or index rebuild.
