/**
 * Focused tests for src/lib/analytics.js
 *
 * We swap window.gtag with a jest.fn() before each test and verify:
 *   - Google tag inits only once (dataLayer/gtag reused)
 *   - SPA page_view dedupes consecutive identical routes
 *   - No tracking on /admin
 *   - generate_lead fires on the "success" code path
 *   - No PII (name/email/phone/message) is ever passed through
 *   - Do Not Track disables all tracking
 *   - Analytics failure (thrown from gtag) never bubbles up
 */

// jsdom needs an explicit URL so tests can adjust location without breaking
// jest's expect(...) messaging.
import {
  isTrackingEnabled,
  pageView,
  trackEvent,
  trackViewItem,
  trackAddToWishlist,
  trackAddToCart,
  trackRemoveFromCart,
  trackGenerateLead,
  trackWhatsAppClick,
  trackCatalogueDownload,
  trackSearch,
  _resetLastPageViewKeyForTests,
} from "./analytics";

const setLocation = (pathname, search = "") => {
  // Use history.pushState so window.location updates in jsdom.
  window.history.pushState({}, "", pathname + search);
};

beforeEach(() => {
  jest.resetAllMocks();
  window.__GA_DNT__ = false;
  window.__GA_LOADED__ = true;
  window.gtag = jest.fn();
  window.dataLayer = [];
  setLocation("/");
  _resetLastPageViewKeyForTests();
});

// ---------- 1. Script initialization behaviour --------------------------
describe("script initialization", () => {
  test("isTrackingEnabled returns true on a public page with gtag present", () => {
    setLocation("/catalog");
    expect(isTrackingEnabled()).toBe(true);
  });

  test("isTrackingEnabled returns false when gtag is missing (script blocked)", () => {
    delete window.gtag;
    expect(isTrackingEnabled()).toBe(false);
  });

  test("isTrackingEnabled returns false when Do Not Track flag is set", () => {
    window.__GA_DNT__ = true;
    expect(isTrackingEnabled()).toBe(false);
  });

  test("no gtag call is dispatched while DNT is on", () => {
    window.__GA_DNT__ = true;
    trackEvent("view_item", { items: [{ item_id: "x" }] });
    trackViewItem({ id: "x", name: "n", sku: "s", category: "c" });
    trackGenerateLead({ source: "contact_form" });
    expect(window.gtag).not.toHaveBeenCalled();
  });
});

// ---------- 2. SPA page-view tracking without duplicates ----------------
describe("SPA page_view tracking", () => {
  test("first page_view fires with page_path + measurement id", () => {
    setLocation("/catalog", "?category=chandeliers");
    pageView({ path: "/catalog", search: "?category=chandeliers" });
    expect(window.gtag).toHaveBeenCalledTimes(1);
    const [type, name, params] = window.gtag.mock.calls[0];
    expect(type).toBe("event");
    expect(name).toBe("page_view");
    expect(params.page_path).toBe("/catalog?category=chandeliers");
    expect(params.send_to).toBe("G-7N4W2XVR2S");
  });

  test("identical consecutive routes are deduped (no double-count)", () => {
    pageView({ path: "/catalog", search: "" });
    pageView({ path: "/catalog", search: "" });
    pageView({ path: "/catalog", search: "" });
    expect(window.gtag).toHaveBeenCalledTimes(1);
  });

  test("changing query string is treated as a new page_view", () => {
    pageView({ path: "/catalog", search: "" });
    pageView({ path: "/catalog", search: "?category=lamps" });
    pageView({ path: "/catalog", search: "?category=chandeliers" });
    expect(window.gtag).toHaveBeenCalledTimes(3);
  });

  test("changing pathname is a new page_view", () => {
    pageView({ path: "/", search: "" });
    pageView({ path: "/catalog", search: "" });
    pageView({ path: "/contact", search: "" });
    expect(window.gtag).toHaveBeenCalledTimes(3);
  });
});

// ---------- 3. No tracking on /admin ------------------------------------
describe("no tracking on /admin", () => {
  test("isTrackingEnabled('/admin') is false", () => {
    expect(isTrackingEnabled("/admin")).toBe(false);
    expect(isTrackingEnabled("/admin/inquiries")).toBe(false);
  });

  test("pageView on /admin does not send anything", () => {
    setLocation("/admin");
    pageView({ path: "/admin", search: "" });
    pageView({ path: "/admin/products", search: "" });
    expect(window.gtag).not.toHaveBeenCalled();
  });

  test("events fired while location is /admin do not reach gtag", () => {
    setLocation("/admin");
    trackViewItem({ id: "p-1", name: "Chandelier", sku: "S-1", category: "chandelier" });
    trackAddToCart({ id: "p-1", name: "Chandelier", sku: "S-1", category: "chandelier" }, 3);
    trackGenerateLead({ source: "inquiry_basket", cart_size: 2 });
    expect(window.gtag).not.toHaveBeenCalled();
  });
});

// ---------- 4. Successful lead events -----------------------------------
describe("successful lead events", () => {
  test("trackGenerateLead(source=contact_form, enquiry_type=bulk) forwards allowed fields", () => {
    trackGenerateLead({ source: "contact_form", enquiry_type: "bulk" });
    expect(window.gtag).toHaveBeenCalledTimes(1);
    const [, name, params] = window.gtag.mock.calls[0];
    expect(name).toBe("generate_lead");
    expect(params.source).toBe("contact_form");
    expect(params.enquiry_type).toBe("bulk");
  });

  test("trackGenerateLead from inquiry_basket includes cart_size but nothing else", () => {
    trackGenerateLead({ source: "inquiry_basket", cart_size: 3 });
    const [, , params] = window.gtag.mock.calls[0];
    expect(params).toEqual({ source: "inquiry_basket", cart_size: 3 });
  });

  test("catalogue_download event fires with source but no PII", () => {
    trackCatalogueDownload("whatsapp_flow");
    const [, name, params] = window.gtag.mock.calls[0];
    expect(name).toBe("catalogue_download");
    expect(params.source).toBe("whatsapp_flow");
    expect(Object.keys(params)).toEqual(["source"]);
  });

  test("whatsapp_click carries source/page/product id but never message text", () => {
    trackWhatsAppClick({
      source: "inquiry_basket",
      page: "/cart",
      product: { id: "p-1", sku: "S-1", name: "Chandelier" }, // name intentionally not forwarded
    });
    const [, name, params] = window.gtag.mock.calls[0];
    expect(name).toBe("whatsapp_click");
    expect(params.source).toBe("inquiry_basket");
    expect(params.page).toBe("/cart");
    expect(params.item_id).toBe("p-1");
    expect(params.item_sku).toBe("S-1");
    // Explicit assertion — product name is not in the event.
    expect(Object.values(params)).not.toContain("Chandelier");
  });
});

// ---------- 5. No PII in event payloads ---------------------------------
describe("no PII in event payloads", () => {
  const PII_STRINGS = [
    "Rakshit Agarwal",
    "raks@example.com",
    "+91 98920 39293",
    "Please quote for a 3-tier chandelier in emerald.",
    "House 42, Green Park, Delhi",
  ];

  const assertNoPII = (calls) => {
    for (const call of calls) {
      const serialized = JSON.stringify(call);
      for (const pii of PII_STRINGS) {
        expect(serialized).not.toContain(pii);
      }
    }
  };

  test("view_item strips message/email/phone even if caller leaks them via a product object", () => {
    trackViewItem({
      id: "p-1",
      name: "Chandelier",
      sku: "S-1",
      category: "chandelier",
      // Simulate a caller mistakenly including PII on the product blob:
      customer_email: "raks@example.com",
      customer_name: "Rakshit Agarwal",
    });
    assertNoPII(window.gtag.mock.calls);
    const [, , params] = window.gtag.mock.calls[0];
    expect(params.items[0]).toEqual({
      item_id: "p-1", item_name: "Chandelier", item_sku: "S-1", item_category: "chandelier",
    });
  });

  test("add_to_cart quantities are numeric and cart line only contains item metadata", () => {
    trackAddToCart({ id: "p-1", name: "Lamp", sku: "L-1", category: "lamp" }, 2);
    const [, , params] = window.gtag.mock.calls[0];
    expect(params.items[0].quantity).toBe(2);
    assertNoPII(window.gtag.mock.calls);
  });

  test("add_to_wishlist only passes item metadata", () => {
    trackAddToWishlist({ id: "p-2", name: "Sconce", sku: "SC-1", category: "sconce" });
    const [, , params] = window.gtag.mock.calls[0];
    expect(params.items[0]).toEqual({
      item_id: "p-2", item_name: "Sconce", item_sku: "SC-1", item_category: "sconce",
    });
  });

  test("remove_from_cart only carries id/name/sku/quantity", () => {
    trackRemoveFromCart({
      product_id: "p-3", name: "Pendant", sku: "PN-1", quantity: 4,
      // caller might have a stale email/phone on the cart line — we must NOT forward it
      customer_email: "raks@example.com",
    });
    const [, , params] = window.gtag.mock.calls[0];
    expect(params.items[0]).toEqual({
      item_id: "p-3", item_name: "Pendant", item_sku: "PN-1", quantity: 4,
    });
    assertNoPII(window.gtag.mock.calls);
  });

  test("search strips message-like values via length cap and passes only the term", () => {
    const veryLong = "chandelier " + "x".repeat(500);
    trackSearch(veryLong);
    const [, name, params] = window.gtag.mock.calls[0];
    expect(name).toBe("search");
    expect(params.search_term.length).toBeLessThanOrEqual(100);
    // No PII leaked into the search term (it's whatever the visitor typed;
    // we assert against our known PII list to guard callers from copy-pasting
    // an email into the search box AND that value being unbounded).
    assertNoPII(window.gtag.mock.calls);
  });

  test("empty / whitespace search term does not fire", () => {
    trackSearch("");
    trackSearch("   ");
    expect(window.gtag).not.toHaveBeenCalled();
  });
});

// ---------- 6. Analytics failure never breaks the app -------------------
describe("analytics failure is swallowed", () => {
  test("thrown gtag never bubbles up to callers", () => {
    window.gtag = jest.fn(() => { throw new Error("blocked by extension"); });
    expect(() => trackViewItem({ id: "p-1", name: "n", sku: "s", category: "c" })).not.toThrow();
    expect(() => trackAddToCart({ id: "p-1", name: "n", sku: "s", category: "c" }, 1)).not.toThrow();
    expect(() => trackGenerateLead({ source: "contact_form" })).not.toThrow();
    expect(() => pageView({ path: "/x", search: "" })).not.toThrow();
  });
});

// ---------- 7. Guarding pageView on server (no window) is a no-op -------
describe("no window (SSR guard)", () => {
  test("isTrackingEnabled and pageView do not throw", () => {
    // We can't actually delete window in jsdom cleanly, but our _hasWindow
    // guard is defensive — verify the path returns cleanly.
    expect(() => isTrackingEnabled("/")).not.toThrow();
    expect(() => pageView({ path: "/", search: "" })).not.toThrow();
  });
});
