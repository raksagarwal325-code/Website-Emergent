# Uploaded conversation reconciliation ledger

Source reviewed in full: `Pasted markdown(20260909-124737).md` (607 lines), together with the category SOP files.

## Authority order

1. Explicit owner decisions in the uploaded conversation
2. Category upload/rectification SOP
3. Existing catalogue records used for duplicate comparison
4. Image-visible details
5. AI inference only where the preceding sources are silent

AI must never overwrite conversation-confirmed category, dimensions, counts, family, reference, or replacement instructions.

## Embedded exact decisions

| Uploaded filenames | Enforced decision |
|---|---|
| ChatGPT Image Sep 6 2026 03_57_18 PM + 03_57_22 PM | Chandelier; 6 lights |
| ChatGPT Image Sep 8 2026 05_13_43 PM + 05_13_49 PM | Chandelier; 6 lights |
| ChatGPT Image Sep 8 2026 12_06_01 PM + 12_06_06 PM | Chandelier; 6 lights |
| 097 (2).png + 097A.jpeg | Replace SGE-CH-018; never create a new SKU |
| 097 (1).png + 097A (1).png | Chandelier; 3 arms; 4 lights; reference SGE-WL-064 |
| 10 (2).png + 10A (2).png | Chandelier; 5 lights; brass bands; references SGE-WL-043/044/123 |
| 098–102 paired files | Chandelier; 5 lights; 24-inch height and width |
| 8 (1).png + 8A (1).png | Chandelier; 12 lights; reference SGE-WL-043 |
| 6 (1).png + 6A (1).png | Chandelier; 8 lights; reference SGE-CH-111 |
| 20 (1).png + 20A (1).png | Reference SGE-FL-007; glass differs |
| Aug 19 08_39_21 PM (3) + 10_04_06 AM (3) | Kandil family; Hanging Light; 3 lights |
| Aug 4 11_21_02 PM + Aug 11 11_42_44 PM | Candle Stand |
| Aug 22 04_39_00 PM + 04_39_03 PM | Gate Light |
| 126.png + 126A.png | Wall Light |

The conversation's filename groups explicitly identified as Hanging Lights are also embedded as category-only facts.

## Earlier completed workflow preserved

The conversation records Candle Stand SGE-CS-001 through SGE-CS-016 as completed. The Candle Stand SOP remains authoritative: exactly 16 specifications, two narrative paragraphs, exactly eight features, approved dimension fallback, black-background image first, preserved commercial fields, and the recorded Price-on-Request/Draft exceptions.

## Deliberately not invented

Some exported conversation turns refer to images only as “the above four products” or have attachment ordering that cannot be linked to exact filenames with confidence. Those statements are not assigned to arbitrary files. The uploader uses only safe category-level facts for those groups and requires owner review for unresolved associations.

## Enforcement behavior

- Exact filename-pair facts are injected into the generation prompt and applied again after AI output.
- Conversation dimensions fill empty UI fields.
- A selected category that conflicts with the conversation is rejected.
- Replacement instructions block draft creation.
- Duplicate SKU, similar name, existing image use, and within-batch duplicate names remain blocking validation.
- Products remain Draft / Needs Review and price defaults to Price on Request.
