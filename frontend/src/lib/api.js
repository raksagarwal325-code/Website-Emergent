import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Cookie-based admin sessions: `withCredentials: true` sends the HttpOnly
// session cookie back on every request. The `X-Requested-With: fetch` header
// is our CSRF guard — browsers block cross-origin requests carrying custom
// headers unless CORS explicitly allows them (server.py restricts CORS to the
// site's own origin), so state-changing calls can only originate from our UI.
const client = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: { "X-Requested-With": "fetch" },
});

export const api = {
  authMe: () => client.get("/auth/me").then(r => r.data),
  authSession: (session_id) => client.post("/auth/session", { session_id }).then(r => r.data),
  authLogout: () => client.post("/auth/logout").then(r => r.data),
  listProducts: (params = {}) => client.get("/products", { params }).then(r => r.data),
  /**
   * Fetch every page of /products so callers that need the full catalogue
   * (Admin, catalogue PDF, gallery cross-references, styled-by page, etc.)
   * can still get a flat array of items. The public cap is 48/page, admins
   * get 5000/page — either way we page until total_pages is reached.
   */
  listAllProducts: async (params = {}) => {
    const collected = [];
    const seen = new Set();
    let page = 1;
    const per = params.limit || 48;
    // Hard safety cap so a runaway loop can never happen.
    for (let i = 0; i < 200; i++) {
      const res = await client
        .get("/products", { params: { ...params, page, limit: per } })
        .then((r) => r.data);
      const items = res?.items || [];
      for (const p of items) {
        if (p?.id && !seen.has(p.id)) {
          seen.add(p.id);
          collected.push(p);
        }
      }
      const totalPages = res?.total_pages || 1;
      if (page >= totalPages || items.length === 0) break;
      page += 1;
    }
    return collected;
  },
  getProduct: (id) => client.get(`/products/${id}`).then(r => r.data),
  createProduct: (data) => client.post("/products", data).then(r => r.data),
  updateProduct: (id, data) => client.put(`/products/${id}`, data).then(r => r.data),
  deleteProduct: (id) => client.delete(`/products/${id}`).then(r => r.data),
  categories: () => client.get("/products/categories").then(r => r.data),

  listReviews: (product_id) => client.get(`/reviews`, { params: { product_id } }).then(r => r.data),
  createReview: (data) => client.post("/reviews", data).then(r => r.data),

  createInquiry: (data) => client.post("/inquiries", data).then(r => r.data),
  listInquiries: () => client.get("/inquiries").then(r => r.data),
  updateInquiryStatus: (id, status) => client.patch(`/inquiries/${id}`, null, { params: { status } }).then(r => r.data),

  createContact: (data) => client.post("/contact", data).then(r => r.data),
  listContact: () => client.get("/contact").then(r => r.data),

  getSettings: () => client.get("/settings").then(r => r.data),
  updateSettings: (data) => client.put("/settings", data).then(r => r.data),

  upload: (file) => {
    // Client-side guard so users get a friendly message before the network round-trip.
    // Server hard cap: 25MB for images, 100MB for videos.
    const isVideo = (file?.type || "").toLowerCase().startsWith("video/");
    const MAX = isVideo ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file && file.size > MAX) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      if (isVideo) {
        return Promise.reject(new Error(`Video is ${sizeMB}MB — max 100MB. Trim/compress the clip before uploading.`));
      }
      return Promise.reject(new Error(`Image is ${sizeMB}MB — max 25MB. Please compress with tinypng.com or resize to ~2000px on the long edge.`));
    }
    const fd = new FormData();
    fd.append("file", file);
    return client.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data);
  },

  exportCsvUrl: () => `${API}/export/products.csv`,
  stats: () => client.get("/stats").then(r => r.data),
  googleReviews: () => client.get("/google/reviews").then(r => r.data),
  pullInstagramCover: (url) => client.post("/admin/instagram/cover", { url }).then(r => r.data),
  requestCatalogue: (name, phone, source = "contact_page") =>
    client.post("/catalogue-request", { name, phone, source }).then(r => r.data),
  aiGenerateProduct: (image_url) =>
    client.post("/ai/generate-product", { image_url }).then(r => r.data),
  aiGenerateProductsBulk: (images) =>
    client.post("/ai/generate-products-bulk", { images }).then(r => r.data),
  aiNameSuggestions: (opts) =>
    client.post("/ai/name-suggestions", opts).then(r => r.data),
  aiRegenerateDetails: (opts) =>
    client.post("/ai/regenerate-details", opts).then(r => r.data),
  aiRegenerateFromName: (opts) =>
    client.post("/ai/regenerate-from-name", opts).then(r => r.data),
  resolveImage: (u, opts = {}) => {
    if (!u) return "";
    if (u.startsWith("/api/")) return `${BACKEND_URL}${u}`;
    if (u.startsWith("http")) {
      if (opts.proxy) return `${API}/proxy-image?url=${encodeURIComponent(u)}`;
      return u;
    }
    return u;
  },
};

export const formatPrice = (v, symbol = "₹") => {
  if (v == null) return "";
  return `${symbol}${Number(v).toLocaleString("en-IN")}`;
};

// Formats an Indian mobile like "+91 89203 92937" for premium display.
// Falls back gracefully for non-Indian or malformed numbers.
export const formatPhone = (raw) => {
  if (!raw) return "";
  const digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return raw;
};

// Luxury price rendering — single source of truth for cards, product detail,
// wishlist, catalogue and gallery lists. Returns a structured object so views
// can style each part however they want.
//
//   product.price_display: "starting_from" (default) | "fixed" | "on_request"
//   product.fixed_price: legacy boolean — mapped to "fixed" when set.
//   product.compare_at_price: only shown if > 0 AND > product.price.
export const formatProductPrice = (product, symbol = "₹") => {
  if (!product) return { onRequest: false, label: null, primary: "", compareAt: null };

  // Resolve display mode with legacy fallback
  let mode = product.price_display;
  if (!mode) mode = product.fixed_price ? "fixed" : "starting_from";

  // Fallback: if the price is missing or 0 (and not explicitly free), always
  // show "Price on request" instead of a bare "₹0" or blank field.
  const numericPrice = Number(product.price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return { onRequest: true, label: null, primary: "Price on request", compareAt: null };
  }

  if (mode === "on_request") {
    return { onRequest: true, label: null, primary: "Price on request", compareAt: null };
  }

  const primary = product.price != null ? formatPrice(product.price, symbol) : "";
  const label = mode === "fixed" ? null : "From";

  const cmp = Number(product.compare_at_price);
  const showCompare =
    Number.isFinite(cmp) && cmp > 0 && Number(product.price) > 0 && cmp > Number(product.price);
  const compareAt = showCompare ? formatPrice(cmp, symbol) : null;

  return { onRequest: false, label, primary, compareAt };
};

// Legacy plain-text helper kept for print/PDF views.
export const formatLuxuryPrice = (product, symbol = "₹") => {
  const p = formatProductPrice(product, symbol);
  if (p.onRequest) return "Price on request";
  return p.label ? `${p.label} ${p.primary}` : p.primary;
};

// --- SKU sorting ------------------------------------------------------------
// Natural sort keyed on the trailing numeric segment of the SKU. Splits on
// dashes/underscores so `SGE-CH-001` → prefix `SGE-CH`, num 1. Non-numeric
// tails (e.g. `SGE-HL-DMC`) get num = +Infinity so they always sort AFTER
// numbered SKUs within the same prefix, per the owner's spec.
export function skuSortKey(sku) {
  if (!sku) return { prefix: "\uFFFF", num: Number.POSITIVE_INFINITY, tail: "" };
  const parts = String(sku).split(/[-_]/);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const prefix = parts.slice(0, Math.max(1, parts.length - 1)).join("-").toUpperCase();
  const num = /^\d+$/.test(last) ? parseInt(last, 10) : Number.POSITIVE_INFINITY;
  return { prefix, num, tail: last.toUpperCase() };
}

export function compareBySku(a, b, dir = "asc") {
  const A = skuSortKey(a?.sku);
  const B = skuSortKey(b?.sku);
  const mult = dir === "desc" ? -1 : 1;
  if (A.prefix !== B.prefix) return mult * A.prefix.localeCompare(B.prefix);
  if (A.num !== B.num) return mult * (A.num - B.num);
  return mult * A.tail.localeCompare(B.tail);
}

export default api;
