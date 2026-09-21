# Product Upload SOP Control Matrix

This document records the deterministic website rules reconciled from the approved Samrat Glass Emporium category SOPs. The executable source of truth is `backend/product_upload_sop.py`.

The Admin reads the versioned registry exposed by `GET /api/admin/product-sop`. The upload generator and Website Health audit therefore use the same category schemas, SKU prefixes, image rules and global defaults. The language model can propose product-specific copy, but it cannot override these deterministic controls.

## Global controls

- Owner-confirmed notes override image inference and catalogue comparisons.
- Check duplicate SKU, product name, batch name and image reuse before creation.
- New uploads remain `Draft / Needs Review`, use `Price on request` unless an approved numeric price is supplied, and are never auto-published.
- Use the illuminated black/dark image first and the matching white/light image second whenever both are supplied.
- Images must depict the identical product, colour, glass, base, arms and light configuration.
- Use one 20–35 word sentence for the short description.
- Use exactly two narrative paragraphs followed by exactly eight product-specific Key Features.
- Never invent dimensions, materials, holders, bulbs, wattage, weight, IP rating, origin, certification, warranty or family.
- Height and Width require units or exactly `To be confirmed before order`.
- Never use `Made to Order` as a factual value and never leave template placeholders.
- Lights and genuine structural arms are counted independently.
- The commit endpoint revalidates the record and rechecks duplicates before persistence.
- An exact catalogue reference can be selected or entered as a full or abbreviated SKU (for example `SGE-FL-013` or `FL-13 and 16`). References are resolved across the complete catalogue before the model runs.
- Every generated draft records its SOP version, exact matched references, source filenames, unresolved references and authority order in `sop_evidence`.
- Admin correction instructions remain attached to the same draft in `sop_corrections`; corrections do not create a disconnected replacement draft.

## Category controls

| Category | SKU | Fields | Category-specific control |
|---|---|---:|---|
| Candle Stand | SGE-CS-### | 16 | Candle holders, arms and Candle Type; candle exclusion where applicable |
| Chandelier | SGE-CH-### | 18 | Suspension Type; central light is not an arm |
| Floor Chandelier | SGE-FC-### | 18 | Freestanding Base Type |
| Floor Lamp | SGE-FL-### | 18 | Base Type and Shade Type |
| Gate Light | SGE-GL-### | 20 | Mounting Type and evidence-based Weather Suitability; no invented IP rating |
| Hanging Light | SGE-HL-### | 18 | Suspension Type; cascades do not acquire invented arms |
| Table Chandelier | SGE-TA-### | 18 | Tabletop Base Type |
| Table Lamp | SGE-TL-### | 16 | Shade Type; central single holder normally has no arms |
| Wall Light | SGE-WL-### | 17 | Wall-mounted identity; backplate and decorative scrolls are not arms |

## Workflow gates

1. Analyse images and owner facts without creating a catalogue row.
2. Display the generated draft, warnings and blocking validation errors.
3. Require admin review before the separate Create action becomes available.
4. Create only validation-clean records.
5. Recheck SKU, name and image conflicts immediately before insertion.
6. Reopen the persisted row programmatically and run validation again.
7. Return per-item failures without stopping valid items in the batch.
8. Persist the evidence and correction trail with the draft so a reviewer can see why the product was identified and named.

Any future SOP change must update the category profile, schema, prompt controls and regression tests together.
