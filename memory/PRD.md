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

