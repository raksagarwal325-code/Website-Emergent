/**
 * Regression: Product JSON-LD must include Merchant listing fields
 * `hasMerchantReturnPolicy` and `shippingDetails` (Google Search Console
 * previously flagged these as missing), while never exposing a price for
 * products whose visible pricing state is "Price on request".
 *
 * These tests exercise the exact structured-data emitted by
 * `<ProductDetail>`. We render the page with a fixture product and grab
 * the JSON-LD from the DOM (SchemaLD renders it as an inline
 * <script type="application/ld+json">).
 */
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ---- Mocks ---------------------------------------------------------------
// jest.mock factory hoists — inline a copy of the fixture inside the mock
// factory so it doesn't need to reach back into the test module.
jest.mock("../lib/api", () => {
  const _fixture = {
    id: "p-1",
    name: "Antique Wine Chandelier",
    sku: "SGE-CH-101",
    category: "Chandelier",
    price: 42000,
    currency: "INR",
    short_description: "Handcrafted crystal chandelier from Firozabad.",
    description: "",
    images: [],
    rating: 0,
    review_count: 0,
    status: "published",
    price_display: "starting_from",
  };
  return {
    __esModule: true,
    api: {
      getProduct: jest.fn((id) => Promise.resolve({ ..._fixture, id })),
      listProducts: () => Promise.resolve({ items: [], total: 0 }),
      listReviews: () => Promise.resolve([]),
      createReview: () => Promise.resolve({}),
      getSettings: () => Promise.resolve({ whatsapp_number: "+919999999999" }),
      resolveImage: (u) => u || "",
    },
    formatPrice: (n) => `₹${n || 0}`,
    formatProductPrice: (p) => {
      const numericPrice = Number(p?.price);
      const onRequest =
        !Number.isFinite(numericPrice) ||
        numericPrice <= 0 ||
        p?.price_display === "on_request";
      return {
        onRequest,
        primary: onRequest ? "Price on request" : `₹${numericPrice}`,
        label: "",
        priceValue: onRequest ? null : numericPrice,
      };
    },
  };
});

const fixtureProduct = {
  id: "p-1",
  name: "Antique Wine Chandelier",
  sku: "SGE-CH-101",
  category: "Chandelier",
  price: 42000,
  currency: "INR",
  short_description: "Handcrafted crystal chandelier from Firozabad.",
  description: "",
  images: [],
  rating: 0,
  review_count: 0,
  status: "published",
  price_display: "starting_from",
};

jest.mock("../components/SEO", () => ({ __esModule: true, default: () => null }));
jest.mock("../context/SettingsContext", () => ({
  __esModule: true,
  useSettings: () => ({
    settings: { whatsapp_number: "+919999999999" },
    hp: {},
    refresh: jest.fn(),
  }),
}));
jest.mock("../context/CatalogContext", () => ({
  __esModule: true,
  useCatalog: () => ({
    cart: [],
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    updateQty: jest.fn(),
    clearCart: jest.fn(),
    cartTotal: 0,
    hasOnRequestItems: false,
    hasPricedItems: false,
    isItemOnRequest: () => false,
    favorites: [],
    toggleFavorite: jest.fn(),
    isFavorite: () => false,
  }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../lib/analytics", () => ({
  trackViewItem: jest.fn(),
  trackWhatsAppClick: jest.fn(),
}));
jest.mock("../components/SeenInProjects", () => ({
  __esModule: true,
  default: () => null,
}));

const { api } = require("../lib/api");
const ProductDetail = require("./ProductDetail").default;

beforeEach(() => {
  api.getProduct.mockImplementation((id) =>
    Promise.resolve({ ...fixtureProduct, id }),
  );
});

async function renderAndGetProductJsonLd() {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/product/p-1"]}>
        <Routes>
          <Route path="/product/:id" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await waitFor(() =>
    expect(screen.getByTestId("page-product-detail")).toBeInTheDocument(),
  );
  // Locate the JSON-LD emitted by SchemaLD (id begins with "product-").
  await waitFor(() => {
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    const productLd = Array.from(scripts).find((s) => {
      try {
        const j = JSON.parse(s.textContent);
        return j["@type"] === "Product";
      } catch {
        return false;
      }
    });
    if (!productLd) throw new Error("Product JSON-LD not yet rendered");
    return productLd;
  });
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );
  const ld = Array.from(scripts)
    .map((s) => JSON.parse(s.textContent))
    .find((j) => j["@type"] === "Product");
  return ld;
}

describe("Product JSON-LD — merchant listing fields", () => {
  test("emits a valid Product with Offer", async () => {
    const ld = await renderAndGetProductJsonLd();
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Product");
    expect(ld.name).toBe(fixtureProduct.name);
    expect(ld.sku).toBe(fixtureProduct.sku);
    expect(ld.offers["@type"]).toBe("Offer");
    expect(ld.offers.price).toBe("42000");
    expect(ld.offers.priceCurrency).toBe("INR");
    expect(ld.offers.availability).toMatch(/^https:\/\/schema\.org\/(InStock|PreOrder|BackOrder|OutOfStock)$/);
  });

  test("omits price and currency when the visible price is zero/missing", async () => {
    api.getProduct.mockResolvedValueOnce({ ...fixtureProduct, price: 0 });
    const ld = await renderAndGetProductJsonLd();
    expect(ld.offers.price).toBeUndefined();
    expect(ld.offers.priceCurrency).toBeUndefined();
  });

  test("does not expose an internal price when price_display is on_request", async () => {
    api.getProduct.mockResolvedValueOnce({
      ...fixtureProduct,
      price: 42000,
      price_display: "on_request",
    });
    const ld = await renderAndGetProductJsonLd();
    expect(ld.offers.price).toBeUndefined();
    expect(ld.offers.priceCurrency).toBeUndefined();
  });

  test("Offer includes a valid hasMerchantReturnPolicy", async () => {
    const ld = await renderAndGetProductJsonLd();
    const p = ld.offers.hasMerchantReturnPolicy;
    expect(p).toBeDefined();
    expect(p["@type"]).toBe("MerchantReturnPolicy");
    expect(p.applicableCountry).toBe("IN");
    expect(p.returnPolicyCategory).toBe(
      "https://schema.org/MerchantReturnNotPermitted",
    );
    expect(p.merchantReturnLink).toMatch(/\/legal\/returns$/);
  });

  test("Offer includes India shippingDetails without an unverified transit-time estimate", async () => {
    const ld = await renderAndGetProductJsonLd();
    const s = ld.offers.shippingDetails;
    expect(s).toBeDefined();
    expect(s["@type"]).toBe("OfferShippingDetails");
    expect(s.shippingDestination["@type"]).toBe("DefinedRegion");
    expect(s.shippingDestination.addressCountry).toBe("IN");
    expect(s.deliveryTime).toBeUndefined();
  });

  test("shippingDetails does NOT invent a monetary shippingRate", async () => {
    // Business does not have a fixed shipping charge — the schema must
    // omit `shippingRate` rather than invent one. Google surfaces this
    // as a warning, not an error.
    const ld = await renderAndGetProductJsonLd();
    expect(ld.offers.shippingDetails.shippingRate).toBeUndefined();
  });

  test("Offer keeps all previously-valid fields (no regression)", async () => {
    const ld = await renderAndGetProductJsonLd();
    expect(ld.offers.price).toBe("42000");
    expect(ld.offers.priceCurrency).toBe("INR");
    expect(ld.offers.availability).toBeDefined();
    expect(ld.offers.seller["@type"]).toBe("Organization");
    expect(ld.brand["@type"]).toBe("Brand");
    expect(ld.brand.name).toBe("Samrat Glass Emporium");
  });
});
