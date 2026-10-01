# Samrat Glass AI / Search Visibility Tracker

Baseline established: 2026-10-01

## Purpose
Track whether Samrat Glass Emporium is surfaced for commercially relevant discovery queries across search and AI answer systems, and record which Samrat page is selected.

## Fixed query set

### Manufacturer / provenance
- chandelier manufacturer India
- chandelier manufacturer Firozabad
- Firozabad chandelier manufacturer
- handcrafted glass chandelier India
- decorative lighting manufacturer India
- Firozabad decorative lighting manufacturer

### Custom / project
- custom chandelier manufacturer India
- custom decorative lighting India
- made to order chandelier India
- custom glass chandelier India
- bulk decorative lighting supplier India

### Architects / designers
- decorative lighting for architects India
- chandelier supplier for interior designers India
- custom lighting for interior designers India
- decorative lighting project supplier India

### Tall spaces / problem-led
- double height chandelier India
- chandelier for double height living room India
- staircase chandelier India
- chandelier for villa foyer India

### Product-led
- glass chandelier India
- coloured glass chandelier India
- traditional Indian chandelier
- handcrafted hanging lights India
- glass wall lights India

## What to record per query
- Surface: Google web / Google AI result when shown / ChatGPT / Gemini / Perplexity
- Samrat mentioned: yes/no
- Samrat linked or cited: yes/no
- Landing page selected
- Competitors or alternative sources surfaced
- Citation/source domains used
- Notes on wording, intent mismatch, or missing evidence
- Date checked

## Search Console baseline (latest settled window available on 2026-10-01)
- "firozabad chandelier manufacturers" -> homepage; 25 impressions; avg position 5.84; 1 click
- "chandelier manufacturers in firozabad" -> homepage; 15 impressions; avg position 2.13; 0 clicks
- "chandelier manufacturers in firozabad" -> /category/chandeliers; 1 impression; avg position 5
- No meaningful Search Console rows yet for: "custom chandelier", "decorative lighting", "double height chandelier", "architect lighting", "interior designer lighting", or "handcrafted glass chandelier"

## Interpretation
Google understands the Samrat brand and Firozabad-manufacturer relationship, but broader national-intent discovery has not yet built meaningful query volume. The website should route these intents to dedicated existing pages rather than creating near-duplicate landing pages.

## Current target pages
- Manufacturer -> /chandelier-manufacturer-india
- Custom / bulk -> /custom-lighting-bulk-orders
- Architects / designers -> /architects-interior-designers
- Double-height -> /double-height-chandeliers-india
- General chandeliers -> /category/chandeliers
- Evidence -> /gallery and /craft

## Change log
- 2026-10-01: PR #468 improved image-discovery alt text.
- 2026-10-01: National-intent routing patch prepared to strengthen internal links and metadata around the four target landing pages.
