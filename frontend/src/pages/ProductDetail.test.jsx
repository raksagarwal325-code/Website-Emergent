/**
 * Regression test — production hotfix.
 *
 * A missing `import { schemaAvailabilityFor, isMadeToOrder } from
 * "../lib/productAvailability"` in ProductDetail.jsx blanked every live
 * `/product/<id>` page with a `ReferenceError: schemaAvailabilityFor is
 * not defined`. This test renders the component with a mocked product
 * fixture so the same identifiers are exercised at render time — if the
 * import is ever removed again, this test fails immediately.
 *
 * Two fixtures cover the two schema.org branches we care about:
 *   1. published + Number(stock) > 0     -> InStock (no visible note)
 *   2. published + Number(stock) <= 0    -> PreOrder (visible note)
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// --- Mocks (must be declared BEFORE the ProductDetail import) --------------

const inStockFixture = {
  id: "p-in-stock",
  name: "Ruby Empire Chandelier",
  sku: "SGE-CH-INSTOCK-001",
  price: 45000,
  stock: 3,
  status: "published",
  category: "Chandelier",
  short_description: "In-stock demo chandelier",
  description: "In-stock demo chandelier — for the regression test only.",
  images: ["/api/files/demo.jpg"],
  rating: 0,
  review_count: 0,
  tags: [],
};

const preOrderFixture = {
  ...inStockFixture,
  id: "p-preorder",
  name: "Copper Ottoman Lantern",
  sku: "SGE-CH-PREORDER-001",
  stock: 0,
};

// Every hook & side-effect ProductDetail touches gets a minimal stub. We
// mutate `mockCurrentFixture` between tests so the same api mock returns the
// right product for each render. The `mock` prefix is required by Jest —
// jest.mock() factories may only reference variables whose names start with
// `mock` (case-insensitive).
let mockCurrentFixture = inStockFixture;

// CRA sets Jest's `resetMocks: true`, so any mock implementation attached
// at file scope is wiped before each test. We register the mocks bare here
// and re-attach implementations inside `beforeEach`.
jest.mock("../lib/api", () => ({
  __esModule: true,
  api: {
    getProduct: jest.fn(),
    listProducts: jest.fn(),
    resolveImage: jest.fn(),
    listReviews: jest.fn(),
    submitReview: jest.fn(),
    getSettings: jest.fn(),
  },
  formatPrice: jest.fn(),
  formatProductPrice: jest.fn(),
  formatPhone: jest.fn(),
}));

jest.mock("../context/CatalogContext", () => ({
  __esModule: true,
  useCatalog: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../components/SEO", () => () => null);
jest.mock("../components/SchemaLD", () => () => null);
jest.mock("../components/SeenInProjects", () => () => null);
jest.mock("../lib/analytics", () => ({ trackViewItem: jest.fn() }));

const ProductDetail = require("./ProductDetail").default;
const { api, formatPrice, formatProductPrice, formatPhone } = require("../lib/api");
const { useCatalog } = require("../context/CatalogContext");

beforeEach(() => {
  // Rewire implementations after Jest's per-test mock reset.
  api.getProduct.mockImplementation(() => Promise.resolve(mockCurrentFixture));
  api.listProducts.mockImplementation(() => Promise.resolve({ items: [], total: 0, total_pages: 1 }));
  api.resolveImage.mockImplementation((u) => u || "");
  api.listReviews.mockImplementation(() => Promise.resolve([]));
  api.submitReview.mockImplementation(() => Promise.resolve({ ok: true }));
  api.getSettings.mockImplementation(() => Promise.resolve({ whatsapp: "+919999999999", admin_email: "test@example.com" }));
  formatPrice.mockImplementation((v) => `₹${v}`);
  formatProductPrice.mockImplementation((p) => `₹${p.price || 0}`);
  formatPhone.mockImplementation((p) => p);
  useCatalog.mockReturnValue({
    addToCart: jest.fn(),
    toggleFavorite: jest.fn(),
    isFavorite: () => false,
    favorites: [],
    cart: [],
    settings: { admin_email: "test@example.com", whatsapp: "+919999999999" },
  });
});

// Real MemoryRouter with a `:id` route — useParams resolves naturally from
// the URL, so we don't need to mock react-router-dom (whose v7 package.json
// `exports` field trips Jest's resolver).
const renderProduct = () =>
  render(
    <MemoryRouter initialEntries={[`/product/${mockCurrentFixture.id}`]}>
      <Routes>
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ProductDetail — availability regression (hotfix)", () => {
  test("renders an in-stock product without a ReferenceError and shows no made-to-order note", async () => {
    mockCurrentFixture = inStockFixture;
    renderProduct();
    // Product name appears once the mocked getProduct resolves.
    await waitFor(() =>
      expect(screen.getByText(inStockFixture.name)).toBeInTheDocument(),
    );
    // The made-to-order note MUST NOT appear for an in-stock product.
    expect(screen.queryByTestId("made-to-order-note")).toBeNull();
  });

  test("renders a stock=0 published product with the made-to-order note visible", async () => {
    mockCurrentFixture = preOrderFixture;
    renderProduct();
    await waitFor(() =>
      expect(screen.getByText(preOrderFixture.name)).toBeInTheDocument(),
    );
    // The visible note is rendered when isMadeToOrder(product) === true.
    const note = await screen.findByTestId("made-to-order-note");
    expect(note).toBeInTheDocument();
    expect(note.textContent).toMatch(/pre-?order/i);
  });
});
