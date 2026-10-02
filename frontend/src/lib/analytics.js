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
 *   trackPhoneClick(payload)           - any public tel: CTA
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


const ATTRIBUTION_FIRST_TOUCH_KEY = "sge_attribution_first_touch";
const ATTRIBUTION_SESSION_KEY = "sge_attribution_session";

const _cleanAttributionValue = (value, max = 80) =>
  String(value || "").trim().slice(0, max);

const _readJsonStorage = (storage, key) => {
  try {
    const value = JSON.parse(storage.getItem(key));
    return value && typeof value === "object" ? value : null;
  } catch (_) {
    return null;
  }
};

const _externalReferrerHost = () => {
  if (typeof document === "undefined" || !document.referrer) return "";
  try {
    const referrer = new URL(document.referrer);
    const currentHost = window.location?.hostname || "";
    if (!referrer.hostname || referrer.hostname === currentHost) return "";
    return referrer.hostname.toLowerCase().replace(/^www\./, "");
  } catch (_) {
    return "";
  }
};

export const detectMarketingAttribution = ({ href = "", referrerHost = "" } = {}) => {
  let params;
  try {
    params = new URL(href || "https://samratglass.com", "https://samratglass.com").searchParams;
  } catch (_) {
    params = new URLSearchParams();
  }

  const utmSource = _cleanAttributionValue(params.get("utm_source"), 50);
  const utmMedium = _cleanAttributionValue(params.get("utm_medium"), 50);
  const utmCampaign = _cleanAttributionValue(params.get("utm_campaign"), 80);
  const hasGoogleClickId = Boolean(params.get("gclid") || params.get("gbraid") || params.get("wbraid"));
  const hasMetaClickId = Boolean(params.get("fbclid"));

  let source = utmSource;
  let medium = utmMedium;
  let paidPlatform = "";

  if (hasGoogleClickId) {
    source = source || "google";
    medium = medium || "cpc";
    paidPlatform = "google";
  } else if (hasMetaClickId) {
    source = source || "meta";
    medium = medium || "paid_social";
    paidPlatform = "meta";
  }

  const host = _cleanAttributionValue(referrerHost, 80).toLowerCase();
  if (!source && host) {
    source = host;
    medium = "referral";
  }
  if (!source) {
    source = "direct";
    medium = "none";
  }

  return {
    source: source.toLowerCase(),
    medium: (medium || "unknown").toLowerCase(),
    campaign: utmCampaign,
    paid_platform: paidPlatform,
  };
};

export const captureMarketingAttribution = () => {
  if (!_hasWindow()) return { firstTouch: null, session: null };

  const current = detectMarketingAttribution({
    href: window.location?.href || "",
    referrerHost: _externalReferrerHost(),
  });
  let firstTouch = _readJsonStorage(window.localStorage, ATTRIBUTION_FIRST_TOUCH_KEY);
  let session = _readJsonStorage(window.sessionStorage, ATTRIBUTION_SESSION_KEY);

  if (!firstTouch) {
    firstTouch = current;
    _safe(() => window.localStorage.setItem(ATTRIBUTION_FIRST_TOUCH_KEY, JSON.stringify(firstTouch)));
  }

  const hasCampaignSignal =
    current.source !== "direct" ||
    current.medium !== "none" ||
    Boolean(current.campaign) ||
    Boolean(current.paid_platform);

  if (!session || hasCampaignSignal) {
    session = current;
    _safe(() => window.sessionStorage.setItem(ATTRIBUTION_SESSION_KEY, JSON.stringify(session)));
  }

  return { firstTouch, session };
};

const _leadAttributionParams = () => {
  const { firstTouch, session } = captureMarketingAttribution();
  const out = {};
  if (firstTouch?.source) out.first_touch_source = firstTouch.source;
  if (firstTouch?.medium) out.first_touch_medium = firstTouch.medium;
  if (firstTouch?.campaign) out.first_touch_campaign = firstTouch.campaign;
  if (session?.source) out.session_source = session.source;
  if (session?.medium) out.session_medium = session.medium;
  if (session?.campaign) out.session_campaign = session.campaign;
  if (session?.paid_platform) out.paid_platform = session.paid_platform;
  return out;
};

const AI_REFERRAL_SESSION_KEY = "sge_ai_referral_source";

export const detectAIReferralSource = ({ href = "", referrer = "" } = {}) => {
  const normalizedHref = String(href || "");
  const normalizedReferrer = String(referrer || "");
  let utmSource = "";
  try {
    utmSource = new URL(normalizedHref, "https://samratglass.com").searchParams.get("utm_source") || "";
  } catch (_) { /* ignore malformed URL */ }

  const source = utmSource.toLowerCase();
  if (source.includes("chatgpt") || source.includes("openai")) return "chatgpt";
  if (source.includes("perplexity")) return "perplexity";
  if (source.includes("copilot")) return "copilot";
  if (source.includes("gemini")) return "gemini";

  let host = "";
  try { host = new URL(normalizedReferrer).hostname.toLowerCase(); } catch (_) { return ""; }
  if (host === "chatgpt.com" || host.endsWith(".chatgpt.com") || host === "chat.openai.com") return "chatgpt";
  if (host === "perplexity.ai" || host.endsWith(".perplexity.ai")) return "perplexity";
  if (host === "copilot.microsoft.com" || host.endsWith(".copilot.microsoft.com")) return "copilot";
  if (host === "gemini.google.com") return "gemini";
  return "";
};

const _currentAIReferralSource = () => {
  if (!_hasWindow()) return "";
  const detected = detectAIReferralSource({
    href: window.location?.href || "",
    referrer: typeof document !== "undefined" ? document.referrer : "",
  });
  if (detected) {
    _safe(() => window.sessionStorage.setItem(AI_REFERRAL_SESSION_KEY, detected));
    return detected;
  }
  try {
    return window.sessionStorage.getItem(AI_REFERRAL_SESSION_KEY) || "";
  } catch (_) {
    return "";
  }
};

// OpenAI Ads conversion tracking is intentionally narrower than GA4: only
// genuine enquiry actions are measured. The payload is a fixed, PII-free
// event defined in Ads Manager; names, phones, emails and messages never
// enter this function.
const OPENAI_LEAD_DEDUPE_MS = 2000;
const OPENAI_LEAD_DEDUPE_KEY = "sge_openai_last_lead";
let _lastOpenAILeadAt = null;

const _readStoredOpenAILead = () => {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(OPENAI_LEAD_DEDUPE_KEY));
    return stored && Number.isFinite(stored.at) ? stored : null;
  } catch (_) {
    return null;
  }
};

const _createOpenAILeadEventId = (now) => {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
  } catch (_) { /* fall through */ }
  return `lead-${now}-${Math.random().toString(36).slice(2, 12)}`;
};

const _measureOpenAILead = (pathname) => {
  if (!_hasWindow() || window.__GA_DNT__) return;
  const p = pathname == null
    ? (window.location && window.location.pathname) || "/"
    : String(pathname);
  if (p.startsWith(ADMIN_PATH_PREFIX) || typeof window.oaiq !== "function") return;
  const now = Date.now();
  const stored = _readStoredOpenAILead();
  const lastAt = Math.max(_lastOpenAILeadAt || 0, stored?.at || 0);
  if (lastAt && now - lastAt < OPENAI_LEAD_DEDUPE_MS) return;

  const eventId = _createOpenAILeadEventId(now);
  _lastOpenAILeadAt = now;
  _safe(() => window.sessionStorage.setItem(
    OPENAI_LEAD_DEDUPE_KEY,
    JSON.stringify({ at: now, eventId }),
  ));
  _safe(() => window.oaiq(
    "measure",
    "lead_created",
    { type: "customer_action" },
    { event_id: eventId },
  ));
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

  captureMarketingAttribution();
  const aiReferralSource = _currentAIReferralSource();
  _safe(() =>
    window.gtag("event", "page_view", {
      page_path: key,
      page_location: window.location.href,
      page_title: title || document.title,
      ...(aiReferralSource ? { ai_referral_source: aiReferralSource } : {}),
      send_to: MEASUREMENT_ID,
    }),
  );
  if (aiReferralSource) {
    _dispatch("ai_referral_visit", {
      source: aiReferralSource,
      landing_path: key.slice(0, 120),
    }, pathname);
  }
};

// Public reset — only for tests. Never called from app code.
export const _resetLastPageViewKeyForTests = () => { _lastPageViewKey = null; };
export const _resetOpenAILeadDedupeForTests = () => {
  _lastOpenAILeadAt = null;
  _safe(() => window.sessionStorage.removeItem(OPENAI_LEAD_DEDUPE_KEY));
};
export const _resetAIReferralForTests = () => {
  _safe(() => window.sessionStorage.removeItem(AI_REFERRAL_SESSION_KEY));
};
export const _resetMarketingAttributionForTests = () => {
  _safe(() => window.sessionStorage.removeItem(ATTRIBUTION_SESSION_KEY));
  _safe(() => window.localStorage.removeItem(ATTRIBUTION_FIRST_TOUCH_KEY));
};

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
  const params = { ..._leadAttributionParams() };
  if (source) params.source = String(source).slice(0, 40);
  if (enquiry_type) params.enquiry_type = String(enquiry_type).slice(0, 20);
  if (cart_size != null) params.cart_size = Number(cart_size) || 0;
  _dispatch("generate_lead", params);
  _measureOpenAILead();
};

export const trackWhatsAppClick = ({ source, page, product } = {}) => {
  const params = { ..._leadAttributionParams() };
  if (source) params.source = String(source).slice(0, 40);
  if (page) params.page = String(page).slice(0, 60);
  if (product?.id) params.item_id = product.id;
  if (product?.sku) params.item_sku = product.sku;
  _dispatch("whatsapp_click", params);
};


export const trackPhoneClick = ({ source, page } = {}) => {
  const params = { ..._leadAttributionParams() };
  if (source) params.source = String(source).slice(0, 40);
  if (page) params.page = String(page).slice(0, 60);
  _dispatch("phone_click", params);
};

/**
 * Global fallback tracker for ANY public WhatsApp CTA that wasn't wired
 * with an explicit `trackWhatsAppClick(...)` onClick — e.g. header /
 * footer / product / gallery / commercial-landing / atelier / etc.
 *
 * Only 2 of the site's ~14 WA links previously fired the custom event.
 * A single capture-phase listener on the document catches every click
 * on any anchor whose href points at `wa.me/` and dispatches the
 * `whatsapp_click` event once — labelled with the DOM data-testid so
 * GA4 can distinguish sources.
 *
 * Idempotent: the listener is attached exactly once (guarded by a
 * module-level flag) so hot-reload or double-import can't stack it.
 */
let _waListenerAttached = false;
export const installWhatsAppClickListener = () => {
  if (_waListenerAttached) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  _waListenerAttached = true;
  document.addEventListener(
    "click",
    (e) => {
      // Traverse up to find the <a> — a click may land on the icon/span
      // inside the anchor.
      let el = e.target;
      while (el && el !== document.body && el.tagName !== "A") {
        el = el.parentElement;
      }
      if (!el || el.tagName !== "A") return;
      const href = el.getAttribute("href") || "";
      if (!/^https:\/\/(www\.)?wa\.me\//.test(href)) return;
      const source =
        el.getAttribute("data-testid") ||
        el.getAttribute("data-source") ||
        "unknown";
      _measureOpenAILead();
      trackWhatsAppClick({
        source,
        page:
          (typeof window !== "undefined" && window.location?.pathname) ||
          undefined,
      });
    },
    true, // capture phase — fires even if child handlers stopPropagation
  );
};


let _phoneListenerAttached = false;
export const installPhoneClickListener = () => {
  if (_phoneListenerAttached) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  _phoneListenerAttached = true;
  document.addEventListener(
    "click",
    (e) => {
      let el = e.target;
      while (el && el !== document.body && el.tagName !== "A") {
        el = el.parentElement;
      }
      if (!el || el.tagName !== "A") return;
      const href = el.getAttribute("href") || "";
      if (!/^tel:/i.test(href)) return;
      const source =
        el.getAttribute("data-testid") ||
        el.getAttribute("data-source") ||
        "unknown";
      trackPhoneClick({
        source,
        page: window.location?.pathname || undefined,
      });
    },
    true,
  );
};

export const trackCatalogueDownload = (source = "unknown") => {
  _dispatch("catalogue_download", { source: String(source).slice(0, 40) });
};

export const trackSearch = (term) => {
  const t = String(term || "").trim();
  if (!t) return;
  _dispatch("search", { search_term: t.slice(0, 100) });
};
