Auth-Gated App Testing Playbook (Emergent Google Auth)

- Cookie name: `session_token` — HttpOnly, Secure, SameSite=None
- Session storage: MongoDB `user_sessions` collection; 7-day expiry timezone-aware
- Admin allowlist: `ADMIN_EMAILS` env var (comma-separated exact emails, no domain matching)
- Public routes: GET /api/products, GET /api/settings, POST /api/inquiries, POST /api/catalogue-request, POST /api/reviews (rate-limited)
- Admin-only routes (require valid session AND email in ADMIN_EMAILS):
  - POST/PUT/DELETE /api/products/*, PUT /api/settings, GET/PATCH /api/inquiries/*, GET /api/contact,
    POST /api/uploads/*, POST /api/ai/*, GET /api/proxy-image, POST /api/admin/*, POST /api/seed
- 401 for anonymous, 403 for authenticated non-admin

Test flow:
1. Anonymous curl any admin route → expect 401.
2. Insert fake session for non-admin email → curl admin route → expect 403.
3. Insert fake session for allowlisted email → curl admin route → expect 200.
4. Curl /api/proxy-image with `?url=http://169.254.169.254/latest/meta-data/` → expect 400.
5. Curl /api/proxy-image with `?url=http://localhost:8001/` → expect 400.
6. Post > 5 inquiries from same IP in 60s → expect 429 on the 6th.
