/**
 * Regression test — production hotfix.
 *
 * A missing `import { schemaAvailabilityFor, isMadeToOrder } from
 * "../lib/productAvailability"` in ProductDetail.jsx blanked every live
 * `/product/<id>` page with a `ReferenceError: schemaAvailabilityFor is
 * not defined`. This test renders the component with a mocked product
 * fixture so the same identifiers are exercised at render time.
 *
 * Availability policy:
 *   1. published + Number(stock) > 0     -> InStock (no visible preorder note)
 *   2. published + Number(stock) <= 0    -> PreOrder in schema, but visible UI
 *      stays "Available on request" unless the product is explicitly flagged
 *      as preorder/made-to-order.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

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
  specs: {},
};

const zeroStockFixture = {
  ...inStockFixture,
  id: "p-on-request",
  name: "Copper Ottoman Lantern",
  sku: "SGE-CH-REQUEST-001",
  stock: 0,
};

const explicitPreorderFixture = {
  ...zeroStockFixture,
  id: "p-preorder",
  sku: "SGE-CH-PREORDER-001",
  preorder: true,
};

const actualProductPilotFixture = {
  ...inStockFixture,
  id: "p-actual-product-pilot",
  name: "Rajsi Classic Diamond-Lattice Clear-Glass Urn Table Lamp",
  sku: "SGE-TL-009",
  category: "Table Lamp",
};

let mockCurrentFixture = inStockFixture;
let mockReviews = [];

jest.mock("../lib/api", () => ({
  __esModule: true,
  api: {
    getProduct: jest.fn(),
    listProducts: jest.fn(),
    resolveImage: jest.fn(),
    listReviews: jest.fn(),
    submitReview: jest.fn(),
    createReview: jest.fn(),
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
  mockCurrentFixture = inStockFixture;
  mockReviews = [];
  api.getProduct.mockImplementation(() => Promise.resolve(mockCurrentFixture));
  api.listProducts.mockImplementation(() => Promise.resolve({ items: [], total: 0, total_pages: 1 }));
  api.resolveImage.mockImplementation((u) => u || "");
  api.listReviews.mockImplementation(() => Promise.resolve(mockReviews));
  api.submitReview.mockImplementation(() => Promise.resolve({ ok: true }));
  api.createReview.mockImplementation(() => Promise.resolve({ ok: true }));
  api.getSettings.mockImplementation(() => Promise.resolve({ whatsapp_number: "+919999999999", whatsapp: "+919999999999", admin_email: "test@example.com" }));
  formatPrice.mockImplementation((v) => `₹${v}`);
  formatProductPrice.mockImplementation((p) => ({ onRequest: false, primary: `₹${p.price || 0}`, label: null, compareAt: null }));
  formatPhone.mockImplementation((p) => p);
  useCatalog.mockReturnValue({
    addToCart: jest.fn(),
    toggleFavorite: jest.fn(),
    isFavorite: () => false,
    favorites: [],
    cart: [],
    settings: { admin_email: "test@example.com", whatsapp: "+919999999999" },
  });
  window.requestAnimationFrame = (cb) => cb();
  Element.prototype.scrollIntoView = jest.fn();
});

const renderProduct = () =>
  render(
    <MemoryRouter initialEntries={[`/product/${mockCurrentFixture.id}`]}>
      <Routes>
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ProductDetail — availability regression (hotfix)", () => {
  test("renders linked Home, category and product breadcrumb context", async () => {
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: inStockFixture.name });
    const breadcrumb = screen.getByTestId("product-breadcrumb");
    expect(breadcrumb).toHaveTextContent(`Home/Chandeliers/${inStockFixture.name}`);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Chandeliers" })).toHaveAttribute("href", "/category/chandeliers");
  });

  test("renders an in-stock product without a ReferenceError and shows no made-to-order note", async () => {
    mockCurrentFixture = inStockFixture;
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: inStockFixture.name });
    expect(screen.queryByTestId("made-to-order-note")).toBeNull();
  });

  test("zero stock alone does not show a duplicate preorder message", async () => {
    mockCurrentFixture = zeroStockFixture;
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: zeroStockFixture.name });
    expect(screen.queryByTestId("made-to-order-note")).toBeNull();
    expect(screen.getAllByText("Available on request").length).toBeGreaterThan(0);
  });

  test("an explicitly flagged preorder still shows the preorder note", async () => {
    mockCurrentFixture = explicitPreorderFixture;
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: explicitPreorderFixture.name });
    const note = await screen.findByTestId("made-to-order-note");
    expect(note).toBeInTheDocument();
    expect(note.textContent).toMatch(/pre-?order/i);
  });
});

describe("ProductDetail — ProductTabs decision flow", () => {
  test("Shipping & ordering details activates Shipping & Delivery and scrolls to the tabs", async () => {
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: inStockFixture.name });
    fireEvent.click(screen.getByTestId("buying-confidence-shipping-link"));
    expect(await screen.findByTestId("tab-content-shipping")).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByTestId("tab-content-shipping")).toHaveTextContent(/share photos of the product and packaging within 48 hours/i);
    expect(screen.getByTestId("tab-content-shipping")).not.toHaveTextContent(/replace at our cost/i);
  });

  test("Description, Specifications, and Inquiry tabs remain selectable", async () => {
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: inStockFixture.name });
    expect(screen.getByTestId("tab-content-description")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("tab-specifications"));
    expect(screen.getByTestId("tab-content-specifications")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("tab-inquiry"));
    expect(screen.getByTestId("tab-content-inquiry")).toBeInTheDocument();
  });
});

describe("ProductDetail — zero-review UX", () => {
  test("zero approved reviews does not render Be the first to review", async () => {
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: inStockFixture.name });
    expect(screen.queryByText(/Be the first to review/i)).not.toBeInTheDocument();
  });

  test("zero reviews uses an invitation heading and removes the empty rating state", async () => {
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: inStockFixture.name });
    expect(screen.getByTestId("reviews-heading")).toHaveTextContent("Share your experience");
    expect(screen.getByTestId("reviews-supporting")).toHaveTextContent("Purchased this piece? Tell us what you loved about it.");
    expect(screen.queryByText("What clients say")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reviews-rating-row")).not.toBeInTheDocument();
    expect(screen.queryByText("(0 reviews)")).not.toBeInTheDocument();
  });

  test("zero reviews shows the feedback card and keeps the Write a review CTA", async () => {
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: inStockFixture.name });
    const prompt = screen.getByTestId("reviews-empty-prompt");
    expect(prompt).toHaveTextContent("Your feedback matters");
    expect(prompt).toHaveTextContent("Reviews are moderated before appearing publicly.");
    expect(screen.getByTestId("write-review-cta")).toBeInTheDocument();
    expect(prompt).not.toHaveTextContent("Purchased this piece?");
    expect(prompt).not.toHaveTextContent("Share your experience.");
  });

  test("customer can still submit the review form when reviews are zero", async () => {
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: inStockFixture.name });
    fireEvent.change(screen.getByTestId("review-author"), { target: { value: "Test Customer" } });
    fireEvent.change(screen.getByTestId("review-body"), { target: { value: "Beautiful piece and excellent finish." } });
    fireEvent.click(screen.getByTestId("submit-review-btn"));
    await waitFor(() => expect(api.createReview).toHaveBeenCalledTimes(1));
  });

  test("products with approved reviews still show What clients say and the reviews list", async () => {
    mockCurrentFixture = { ...inStockFixture, rating: 5, review_count: 1 };
    mockReviews = [
      { id: "review-1", author: "Client", title: "Excellent", rating: 5, body: "A wonderful chandelier in our home." },
    ];
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: inStockFixture.name });
    expect(screen.getByTestId("reviews-heading")).toHaveTextContent("What clients say");
    expect(screen.getByTestId("reviews-rating-row")).toHaveTextContent("(1 reviews)");
    expect(screen.getByTestId("review-review-1")).toBeInTheDocument();
    expect(screen.queryByTestId("reviews-empty-prompt")).not.toBeInTheDocument();
  });
});

test.each([false, true])("shows confirmed Indian origin below the price, including price-on-request=%s", async (onRequest) => {
  formatProductPrice.mockReturnValue({ onRequest, primary: "₹45000", label: null });
  renderProduct();
  const origin = await screen.findByRole("link", { name: /Made in India.*See our workshop/i });
  expect(origin).toHaveAttribute("href", "/craft");
  const price = screen.getByTestId("product-price");
  const inquiry = screen.getByTestId("add-to-cart-btn");
  expect(price.compareDocumentPosition(origin) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(origin.compareDocumentPosition(inquiry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getAllByText("Made in India")).toHaveLength(1);
});


describe("ProductDetail — actual product pilot", () => {
  test("shows a current photo/video request only for SGE-TL-009", async () => {
    mockCurrentFixture = actualProductPilotFixture;
    renderProduct();

    const panel = await screen.findByTestId("actual-product-check");
    expect(panel).toHaveTextContent("See the current piece before ordering");
    expect(panel).toHaveTextContent("current workshop or showroom photos");

    const requestLink = screen.getByTestId("actual-product-request-btn");
    expect(requestLink).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/919999999999?text="),
    );
    const message = new URL(requestLink.getAttribute("href")).searchParams.get("text");
    expect(message).toContain("SGE-TL-009");
    expect(message).toContain("current actual photos");
    expect(message).toContain("/product/");
  });

  test("does not show the pilot on other products", async () => {
    mockCurrentFixture = inStockFixture;
    renderProduct();
    await screen.findByRole("heading", { level: 1, name: inStockFixture.name });
    expect(screen.queryByTestId("actual-product-check")).not.toBeInTheDocument();
  });
});
