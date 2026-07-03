import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

export const api = {
  listProducts: (params = {}) => client.get("/products", { params }).then(r => r.data),
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
    // Server hard cap is 25MB.
    const MAX = 25 * 1024 * 1024;
    if (file && file.size > MAX) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return Promise.reject(new Error(`Image is ${sizeMB}MB — max 25MB. Please compress with tinypng.com or resize to ~2000px on the long edge.`));
    }
    const fd = new FormData();
    fd.append("file", file);
    return client.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data);
  },

  exportCsvUrl: () => `${API}/export/products.csv`,
  stats: () => client.get("/stats").then(r => r.data),
  googleReviews: () => client.get("/google/reviews").then(r => r.data),
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

// Luxury "From ₹X" display — used on discovery views (cards, product detail, wishlist, catalogue).
// Skipped when product.fixed_price === true or a plain formatted price is passed in.
export const formatLuxuryPrice = (product, symbol = "₹") => {
  if (!product || product.price == null) return "";
  const base = formatPrice(product.price, symbol);
  return product.fixed_price ? base : `From ${base}`;
};

export default api;
