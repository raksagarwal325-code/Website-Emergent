/**
 * Google Analytics 4 wrapper — SPA-friendly, PII-safe, admin-aware.
 *
 * The actual gtag.js loader lives at the top of public/index.html so the
 * script is present before React boots. This module owns all runtime calls
 * into gtag: it wraps them in try/catch (never throws), skips /admin, and
 * respects Do Not Track.
 *
 * Public API:
 *   isTrackingEnabled(pathname?)       - boolean guard used by tests + callers
 *   pageView({ path, search, title? }) - manual SPA page_view
 *   trackEvent(name, params)           - generic event
 *   trackViewItem(product)             - product-detail views (id/sku/name/category only)
 *   trackAddToWishlist(product)        - favorites toggle → added
 *   trackAddToCart(product, quantity)  - inquiry basket add
 *   trackRemoveFromCart(item)          - basket remove
 *   trackGenerateLead(source)          - contact submit / inquiry submit (post-success)
 *   trackWhatsAppClick(payload)        - any WhatsApp CTA
 *   trackCatalogueDownload(source?)    - catalogue PDF / lookbook actions
 *   trackSearch(term)                  - catalog search
 *
 * PII contract: NO name / email / phone / message / address values ever
 * leave this module. Callers pass rich objects; we cherry-pick only
 * non-personal identifiers (product id / sku / name / category / source).
 */

const ADMIN_PATH_PREFIX = "/admin";
const MEASUREMENT_ID = "G-7N4W2XVR2S";

const _hasWindow = () => typeof window !== "undefined";

export const isTrackingEnabled = (pathname) => {
  if (!_hasWindow()) return false;
  if (window.__GA_DNT__) return false;
  if (typeof window.gtag !== "function") return false;
  const p = pathname == null
    ? (window.location && window.location.pathname) || "/"
    : String(pathname);
  if (p.startsWith(ADMIN_PATH_PREFIX)) return false;
  return true;
};

// Internal safe caller — guarantees analytics failures never bubble up.
const _safe = (fn) => {
  try { return fn(); } catch (e) { /* swallow */ }
};

const _dispatch = (name, params, pathname) => {
  if (!isTrackingEnabled(pathname)) return;
  _safe(() => window.gtag("event", name, params || {}));
};

// ---------- Page view (SPA) ---------------------------------------------
let _lastPageViewKey = null;

export const pageView = ({ path, search, title } = {}) => {
  if (!_hasWindow()) return;
  const pathname = path || (window.location && window.location.pathname) || "/";
  if (!isTrackingEnabled(pathname)) return;

  const key = `${pathname}${search || ""}`;
  if (key === _lastPageViewKey) return; // dedupe consecutive identical route entries
  _lastPageViewKey = key;

  _safe(() =>
    window.gtag("event", "page_view", {
      page_path: key,
      page_location: window.location.href,
      page_title: title || document.title,
      send_to: MEASUREMENT_ID,
    }),
  );
};

// Public reset — only for tests. Never called from app code.
export const _resetLastPageViewKeyForTests = () => { _lastPageViewKey = null; };

// ---------- Generic event ------------------------------------------------
export const trackEvent = (name, params = {}) => _dispatch(name, params);

// ---------- E-commerce style events -------------------------------------
const _productToItem = (product = {}) => ({
  item_id: product.id || product._id || product.product_id || "",
  item_name: product.name || "",
  item_sku: product.sku || "",
  item_category: product.category || "",
});

export const trackViewItem = (product) => {
  const item = _productToItem(product);
  if (!item.item_id) return;
  _dispatch("view_item", { items: [item] });
};

export const trackAddToWishlist = (product) => {
  const item = _productToItem(product);
  if (!item.item_id) return;
  _dispatch("add_to_wishlist", { items: [item] });
};

export const trackAddToCart = (product, quantity = 1) => {
  const item = _productToItem(product);
  if (!item.item_id) return;
  _dispatch("add_to_cart", {
    items: [{ ...item, quantity: Number(quantity) || 1 }],
  });
};

export const trackRemoveFromCart = (item) => {
  const cartItem = {
    item_id: item?.product_id || item?.id || "",
    item_name: item?.name || "",
    item_sku: item?.sku || "",
    quantity: Number(item?.quantity) || 1,
  };
  if (!cartItem.item_id) return;
  _dispatch("remove_from_cart", { items: [cartItem] });
};

// ---------- Lead / WhatsApp / Catalogue / Search ------------------------
// Contact / cart submissions call this AFTER the network request succeeds.
// Only opaque, non-personal identifiers are accepted.
export const trackGenerateLead = ({ source, enquiry_type, cart_size } = {}) => {
  const params = {};
  if (source) params.source = String(source).slice(0, 40);
  if (enquiry_type) params.enquiry_type = String(enquiry_type).slice(0, 20);
  if (cart_size != null) params.cart_size = Number(cart_size) || 0;
  _dispatch("generate_lead", params);
};

export const trackWhatsAppClick = ({ source, page, product } = {}) => {
  const params = {};
  if (source) params.source = String(source).slice(0, 40);
  if (page) params.page = String(page).slice(0, 60);
  if (product?.id) params.item_id = product.id;
  if (product?.sku) params.item_sku = product.sku;
  _dispatch("whatsapp_click", params);
};

export const trackCatalogueDownload = (source = "unknown") => {
  _dispatch("catalogue_download", { source: String(source).slice(0, 40) });
};

export const trackSearch = (term) => {
  const t = String(term || "").trim();
  if (!t) return;
  _dispatch("search", { search_term: t.slice(0, 100) });
};
