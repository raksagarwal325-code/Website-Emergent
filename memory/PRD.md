# Samrat Glass Emporium — Product Catalog PRD

## Original Problem Statement
Create a fully functional, production-ready catalog app.

Customized (Feb 2026) as: **Samrat Glass Emporium** — a premium Indian fancy lights,
chandeliers, glass lamps and decorative lighting catalog based in Firozabad.

## Business Info
- Brand: Samrat Glass Emporium
- Address: Raniwala Market, Babboo Ji Ki Jeen, Firozabad – 283203, UP, India
- WhatsApp: +91-8920392937
- Email: samratglassemp@gmail.com
- GSTIN: 09ADCFS9258D1ZS
- Shipping: Pan-India, 7–10 business days
- Payments: UPI · Net Banking (Stripe/Razorpay deferred)

## User Personas
- Homeowners & interior clients (browse, wishlist, WhatsApp inquiry)
- Bulk buyers (wedding planners, hotels, showrooms) — contact via email/WhatsApp
- Admin (owner) — manage products, inquiries, messages, settings via /admin

## Architecture
- Backend: FastAPI + MongoDB (motor), `/api/*` routes
- Object storage: Emergent object storage (via EMERGENT_LLM_KEY) for product images
- Frontend: React 19 + Tailwind + Shadcn UI + sonner toasts + framer-motion
- State: React Context (cart + favorites) persisted in localStorage
- Design: Dark luxury (deep black + gold #D4AF37, Playfair Display + Outfit fonts)

## Implemented (Feb 2026)
### Backend endpoints (all under /api)
- Products CRUD: GET/POST/PUT/DELETE /products, GET /products/{id}, GET /products/categories
- Reviews: POST /reviews, GET /reviews?product_id — auto-updates product rating
- Inquiries: POST /inquiries (cart submission), GET /inquiries, PATCH /inquiries/{id}
- Contact: POST /contact, GET /contact
- Settings: GET/PUT /settings (brand, WhatsApp, email, address, GSTIN, delivery, payments)
- Uploads: POST /upload → object storage, GET /files/{path} → serve
- Export: GET /export/products.csv
- Stats: GET /stats

### Frontend routes
- / Home (hero, value strip, featured, atelier editorial)
- /catalog (search + filters + sort + CSV/PDF export)
- /product/:id (gallery, WhatsApp inquiry, reviews)
- /favorites (wishlist, localStorage)
- /cart (inquiry basket → saved to DB + WhatsApp deep-link)
- /contact (contact form → DB)
- /admin (dashboard, products, inquiries, messages, settings)

### Seed data
12 lighting products across 7 categories: Chandeliers, Pendant Lights,
Wall Lights, Ceiling Lamps, Table Lamps, Floor Lamps, Decorative Lights.
INR pricing with en-IN formatting.

### Homepage CMS (Admin → Homepage Editor)
- Fully editable sections: Hero, **Trusted-by strip (new · Feb 2026)**, 1000+ Light Options collage, Featured, Google Reviews fallback, Reasons Why We Are Better, The Atelier, **Influencer Promotions "As Styled By" (new · Feb 2026)**, Footer
- Trusted-by strip: hidden until admin adds at least one client/venue; each item has name + optional logo upload; static row on desktop, auto-scrolling marquee on mobile
- Influencer Promotions: responsive grid (3-col desktop / 2-col tablet / 1-col mobile) rendering Instagram embeds. Admin can paste EITHER a full Instagram embed code OR just a Reel/Post URL (auto-detected). Supports handle, caption, optional "View More on Instagram" CTA. Auto-hides when empty.

## Backlog / Next Actions
### P0 (before hard launch)
- Real image uploads for all seeded products (replace stock photos with owner's inventory)
- Attach a real .in domain and update REACT_APP_BACKEND_URL

### P1
- Razorpay/UPI checkout (currently only inquiry flow)
- Email notification on new inquiry (Resend API key needed)
- Product bulk-import via CSV in admin
- SEO meta tags + sitemap.xml for organic discovery

### P2
- Multi-language (Hindi + English)
- Order tracking, invoice PDF with GSTIN
- Customer accounts (JWT) + order history
- Analytics dashboard (top viewed products, inquiry funnel)
- Instagram feed on Home page

## Changelog
- 2026-02-13: **Natural SKU sort in Admin + Catalogue PDF.** Added a shared `compareBySku()` / `skuSortKey()` helper in `lib/api.js` that splits every SKU on `-`/`_`, treats the trailing numeric segment as an integer (so `SGE-HL-009 < SGE-HL-010`), and pushes non-numeric tails (`SGE-HL-DMC`) to the end within the same prefix. Admin → Products now defaults to **SKU · Low to High** and offers 5 more modes via a new `admin-sort-select` dropdown: SKU High→Low, Newest, Oldest, Name A–Z, Category (secondary-sorted by SKU). The Catalogue PDF now applies the same ascending SKU order to every category group so the printed catalogue matches the admin view row-for-row. Node-tested comparator: input `010, 009, 001, DMC, CH-002, CH-001, TL-001, 011` sorts to `CH-001, CH-002, HL-001, HL-009, HL-010, HL-011, HL-DMC, TL-001` ✅.

- 2026-02-13: **Admin → Products: SKU visible + searchable.** Every product row now shows `SKU · SGE-XX-NNN` in antique-bronze right under the product name (`admin-product-sku-{id}`). New free-text search box in the toolbar (`admin-product-search`) filters by name, SKU or category — composable with the existing category dropdown so `Category=Table Lamp` + search `TL-005` narrows to a single row. Also plumbed SKU end-to-end: `InquiryItem.sku` added to the backend model, cart items now carry SKU, cart WhatsApp deep-link now includes `(SKU: SGE-XX-NNN)` per item, admin inquiry rows now show `· SKU SGE-XX-NNN` next to each line item. Verified SKU stays admin-only on the customer-facing site — `ProductCard.jsx` still has no SKU reference; `ProductDetail.jsx` already displays it softly as "Reference Code: SGE-XX-NNN". Catalogue PDF already renders `REF · {sku}` on each product card.

- 2026-02-13: **Admin → Products: Category column + top filter.** Added a dedicated **Category** column in the products list with a gold-outline pill (`admin-product-category-{id}`), and a new top-right filter dropdown (`admin-cat-filter`) with the 9 requested options — Chandelier, Hanging Light, Table Lamp, Wall Light, Candle Stand, Floor Lamp, Sconce, Pendant Light, Custom Design (plus any custom values already saved on products). The filter narrows the list live and updates the count ("… (36 of 54 · 10 draft)"). The product edit form's category chips now also seed from the same default list so the owner can pick a category before any product uses it. Deliberately kept minimal — no bulk edit, no category-management tab, no downstream propagation, per your instruction.

- 2026-02-13: **Two-mode AI regeneration — name-only vs full-details with preview/diff.** Split the AI product tools into two clearly separated actions inside the Admin product edit form:
  1. **Regenerate Name Only** (existing `ProductNameSuggester`, re-labelled): 5 unique names + rationales as inline chips + modal. Now also carries a checkbox *"Update related fields based on new name"* — when ticked, applying a suggestion silently calls a new `POST /api/ai/regenerate-from-name` endpoint that regenerates seo_name, category, short_description, description and tags to match the chosen name (based on the product image), then merges those fields into the form and flips the product to Draft. When unchecked, only the name is updated.
  2. **Regenerate Full Product Details** (new `ProductFullRegenerator` component): calls new `POST /api/ai/regenerate-details` (does NOT persist), opens a side-by-side **preview/diff modal** with every field (Name, SEO title, Category, Short description, Full description, Tags, Specs: Material/Finish/Glass Type/Product Type/Suitable For/Style/Color, plus any extras). Each row shows CURRENT → AI SUGGESTION with a checkbox to accept. Rows with no change are greyed out and disabled. Bulk `Select all changes` / `Keep all current` toggles. On apply, only ticked fields are merged into the form; any major-field change (name / category / short_description / description) flips `status` to `draft` so nothing is silently republished.
  Backend: `_resolve_product_image()` helper consolidated the 3 duplicate image-loading blocks; both new endpoints reuse it and the existing `_generate_product_json()` for consistent tone/naming rules. Both endpoints curl-tested — regenerate-details returned a full JSON with all fields; regenerate-from-name honoured a fixed "Amber Bell Crystal Hanging Light" name and produced aligned category/description/tags. Live-verified end-to-end in the admin UI. Rewrote the Gemini system prompt for both existing `/api/ai/generate-product` and new `/api/ai/name-suggestions` endpoints. Names now follow `[Distinctive Design Feature] + [Material/Finish/Colour] + [Product Type]` and BAN the generic words *Maharaja, Royal, Regent, Premium, Luxury, Elegant, Classic, Grand, Heritage, Majestic, Imperial, Palatial, Signature, Deluxe, Opulent, Splendid, Prestige, Vintage* unless the design visibly justifies them. AI is directed to lead with visible features: glass shape (bell/lotus/tulip/lantern/drum/dome/globe/teardrop/conical), shade shape (scallop/pleated/fluted), arm/light count, colour, finish, pattern, drops, texture, motif, product type. New backend endpoint `POST /api/ai/name-suggestions` returns exactly 5 unique names + rationales, checked case-insensitively (and punctuation-insensitively) against the full catalogue; up to 3 batches are called silently to backfill any duplicates the model returns. New `ProductNameSuggester` React component in the Admin product form: inline chip picker below the Name field ("Suggest Names" → 5 chips), plus a "See all rationales →" modal with 5 cards (name + Info-icon rationale + one-click Apply), plus a "Generate 5 More" button in the modal. Backend tested via curl (returned 5 clean, visual names for a real chandelier product); frontend flow verified end-to-end (edit → button → 5 chips → modal → cards).

- 2026-02-13: **Catalogue PDF v3 — transparent SVG watermark + reliable image rendering.** Replaced the JPEG-based logo watermark (which showed as an opaque rectangle) with a hand-drawn **inline SVG chandelier line-art** in the shared `<Page>` component — pure paths at 8% opacity in antique-bronze `#BF9972`, ~62% page width, centered slightly lower. Includes ceiling mount, canopy, capital, multi-arm candelabra with candle-flames + hanging drops, decorative droplet ring, teardrop finial, and a faint "SAMRAT GLASS EMPORIUM" caption. Zero background box possible because SVG has no fill. Watermark renders identically on cover, TOC, About, Why Choose Us, all category dividers, all product listing pages, and the final contact page. **PDF pipeline rewrite** — swapped from `html2pdf.js` (rasterises the whole doc to one canvas and silently fails past Chrome's ~16384px canvas limit — a 29-page × 296mm × scale 2 doc = ~65000px tall) to a direct `html2canvas` + `jsPDF` loop that renders each `.pdf-page` as its own canvas (1191 × 1678 @ scale 1.5) and appends it. Result: a real 5.06 MB, 31-page PDF with fully rendered product images, watermark, and QR codes — verified end-to-end via a headless Playwright download. Added `Promise.all(imgs.map(img.decode()))` preflight + `onError` fallback on every product image to swap to the SVG placeholder instead of a blank black box.

  **PDF pipeline rewrite** — swapped from `html2pdf.js` (which rasterizes the whole doc to one giant canvas and silently fails past Chrome's ~16384px canvas limit — a 29-page × 296mm × scale 2 doc = ~65000px tall, producing empty pages) to a direct `html2canvas` + `jsPDF` loop that renders each `.pdf-page` as its own canvas (1191 × 1678 @ scale 1.5) and appends it to the PDF. Result: a real 5.06 MB, 31-page PDF with fully rendered product images, watermark, and QR codes — verified end-to-end via a headless Playwright download.

  **Image reliability** — added an `await Promise.all(imgs.map(img.decode()))` preflight before rendering so no `<img>` is snapshot mid-decode, plus an `onError` fallback on every product image that swaps to the SVG placeholder ("Image coming soon" tile) instead of a blank black box.

- 2026-02-13: **Catalogue PDF — full-page background watermark + luxury polish.** Replaced per-image logo overlay with a single centered chandelier/logo watermark rendered behind ALL content on every page (cover, TOC, about, why, category dividers, product pages, contact). Product-card CTA switched from bright green (#25D366) to a gold→bronze→copper gradient pill. WhatsApp number rendered as `+91 89203 92937`. Description font upped from 9.5pt→10.5pt with 1.7 line-height; specs from 8.5pt→9.5pt/1.55. New `isMeaningfulSpec()` filter hides blank, "-", "—", "N/A", "TBD", "unconfirmed", "not specified", "0", "nil". Business hours normalized to "Mon – Sat: 10:30 AM – 8:00 PM · Sunday: Closed". Added "Scan to Connect" QR row on contact page (WhatsApp, Website, Google Maps, Instagram) via new `qrcode` npm package.
- 2026-02-13: **Global "Currently unavailable" verbiage removed.** Verified via grep across `/app/frontend/src/` — zero occurrences. `ProductDetail.jsx` shows "Available on request" when `stock === 0`; `ProductCard.jsx` / `Catalog.jsx` / `Cart.jsx` intentionally don't render stock badges (inquiry-based catalog). Live-verified on 0-stock product `/product/23afd515-…` — screenshot confirms clean "Price on request" + "Available on request" copy.
- 2026-02-12: **AI description style upgraded to Samrat Catalogue voice.** New `_AI_PROMPT_SYSTEM` enforces a 4-part description: (1) elegant introduction, (2) visible design details (hedged), (3) ideal usage spaces drawn from a curated list (living/dining/bedroom/hotel/villa/temple/restaurant/showroom/luxury villa/banquet), (4) a mandatory `Key Features:` heading with 4-6 `• `-prefixed bullets. Explicitly forbids overusing *exquisite/timeless/captivating/mesmerizing/enchanting* (max once each). Tags now mix category + material-look + use-case (12-14 comma-separated phrases). Existing product detail page already renders newlines via `whitespace-pre-wrap` — no frontend change needed. Verified live: real chandelier image produced clean 4-section output with 6 bullets, hedged material language, zero fabricated specs.
- 2026-02-12: **Product detail page cleaner rules.** Details in previous entry.
- 2026-02-12: **AI Product Details Generator (Gemini 3 Flash + vision).** Full details in previous entry.
- 2026-02-12: **"Send catalogue via WhatsApp" lead capture on Contact page.** Full details in previous entry.
- 2026-02-12: **Catalogue PDF fully rebuilt.** 27 clean A4 pages, images pre-converted to data-URLs, no cut cards, no black boxes, per-page footer with page numbers. Full details in previous entry.
- 2026-02-11: **"As Styled By" is now a carousel + full `/styled-by` gallery page.** Homepage carousel: 3 cards on desktop / 2 on tablet / 1 on mobile via `useVisibleCount` matchMedia hook. Auto-slides every 5s (pauses on hover + when tab hidden), continuous loop, prev/next arrows, gold pill-expanding dot pagination. New gold "View All Styled Looks" button routes to `/styled-by` gallery. Shared card at `components/InfluencerCard.jsx`.
- 2026-02-11: **"As Styled By" entrance animations (Framer Motion).** Header and CTA fade+slide in when the section enters the viewport; cards reveal in sequence with a 120ms stagger. `once: true` — no re-flicker on scroll back.
- 2026-02-11: **Auto-pull cover — fixed "wrong cover" bug for collab reels & related-post pages.** The old extractor grabbed the first `<img alt="Video by …">` which for co-authored reels or reels with a "More posts from …" grid was picking an unrelated older post from the same account. New priority order: (1) `og:image` meta tag (Instagram's canonical share thumbnail, always accurate), (2) `twitter:image`, (3) main `<video>` poster attribute, (4) first `<img>` inside `<article>` only — never the "More posts" grid. Verified live on 5 different reels/posts in the user's dashboard — all showing correct covers.
- 2026-02-11: **Auto-pull cover — upgraded to headless Chromium (Playwright).** Instagram no longer exposes `og:image` to plain HTTP scrapers, so the endpoint now spins up a real headless browser server-side, waits for the SPA to render, and extracts the poster image. Pulled cover is downloaded and cached in Emergent object storage; Instagram is never called again for that reel. ~6-8s per pull (browser cold start). `playwright==1.55.0` pinned in requirements + `PLAYWRIGHT_BROWSERS_PATH=/app/.pw-browsers` (persistent) in backend `.env`.
- 2026-02-11: **Auto-pull cover — improved error handling & URL/handle normalization.**
  · Instagram URL is now stripped of tracking params (`?utm_source=`, `&igsh=`, etc.) on the frontend (onBlur) and again on the backend.
  · Creator handle field auto-converts a full profile URL (`https://www.instagram.com/mysa_space/`) into `@mysa_space` on blur.
  · Backend now differentiates: `private_or_deleted` only for genuine 404/410 responses ("appears deleted or URL is incorrect"), `no_thumbnail` for any other failure ("Instagram did not provide a cover image for this post — please upload manually"). No more misleading "private/deleted" messages for public posts.
  · Helper text updated to: "Instagram may not provide covers automatically for all public reels/posts. If auto-pull fails, upload a 9:16 screenshot manually."
- 2026-02-11: **Auto-pull cover from Instagram** — added `POST /api/admin/instagram/cover` endpoint (server-side scrape via `og:image` with fallback JSON-blob parse) + `InstagramCoverPicker` component in Admin. Successfully-pulled covers are cached in Emergent object storage and served as `/api/files/...` so Instagram is only called once per pull. Manual upload preserved as primary fallback. "Refresh cover from Instagram" button appears once a cover exists. Public site strictly requires URL + handle + cover to render a card (never a broken/half-configured card). NOTE: Instagram now blocks most anonymous scrapes (all UAs return login-walled HTML) — Facebook Graph oEmbed API integration remains as a future upgrade path if the client provides FB App credentials.
- 2026-02-11: **Influencer card redesigned to fully custom (dropped IG iframe).** Layout switched to `flex-wrap: justify-center` so 1 → centered, 2 → centered pair with no empty right column, 3+ → 3 per row. Card width fixed 380px desktop / capped mobile. Card shows: cover thumbnail (9:16) → Reel/Post/IGTV badge → gold-ringed play icon → Shop-this-look pill → footer with @handle + Featuring product. Clicking the card opens the original Reel/Post on Instagram in a new tab.
- 2026-02-11: **"Shop this look" pill** added to Influencer Promotions. Each item in Admin → Homepage → Influencer Promotions now has an optional `product_id` picker; when set, a gold pill appears bottom-right on the card, footer shows "Featuring · {product name}" instead of the custom caption, and the pill deep-links to `/product/{id}`. Products are fetched only when at least one item is linked (lazy).
- 2026-02-11: **Influencer Promotions ("As Styled By") visual refinement.** Removed trailing period from heading. Tightened subtitle→cards gap. Cards now use deep-maroon gradient bg, gold border, 10px rounded corners, layered shadow + inner glow, ornamental gold hairline. Fixed frame height (560/500px) top-aligned to crop IG likes/comments chrome. Gold-outlined IG icon avatar in footer, "STYLED BY" eyebrow + `@handle`. Maroon→gold gradient CTA button with hover-flip.
- 2026-02-11: **Influencer Promotions ("As Styled By") section shipped.** New CMS-editable section on Home (renders after "Our Work in the Wild"). Admin can add unlimited items via `/admin` → Homepage → Influencer Promotions; each item accepts a full Instagram embed `<blockquote>` code OR just a Reel/Post URL (auto-normalized). Frontend loads `embed.js` once and re-processes on item changes. Responsive grid: 3-col desktop / 1-col mobile. Section auto-hides when list empty. Files: `frontend/src/components/InfluencerPromotions.jsx` (new), `frontend/src/components/AdminHomepage.jsx`, `frontend/src/lib/homepageDefaults.js`, `frontend/src/pages/Home.jsx`.
- 2026-02-03: Added founder photo to About page (Mr. Sunil Kumar Agarwal). CMS-editable via Admin → Homepage → About → "Founder photo". Circle-initial fallback preserved when no image is set.
- 2026-02-03: Raised image upload limit from 8MB → 25MB (server.py + client-side pre-flight validation). Verification pending user acceptance.

