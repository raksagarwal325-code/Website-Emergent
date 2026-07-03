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
- Fully editable sections: Hero, **Trusted-by strip (new · Feb 2026)**, 1000+ Light Options collage, Featured, Google Reviews fallback, Reasons Why We Are Better, The Atelier, Footer
- Trusted-by strip: hidden until admin adds at least one client/venue; each item has name + optional logo upload; static row on desktop, auto-scrolling marquee on mobile

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
- 2026-02-03: Added founder photo to About page (Mr. Sunil Kumar Agarwal). CMS-editable via Admin → Homepage → About → "Founder photo". Circle-initial fallback preserved when no image is set.
- 2026-02-03: Raised image upload limit from 8MB → 25MB (server.py + client-side pre-flight validation). Verification pending user acceptance.

