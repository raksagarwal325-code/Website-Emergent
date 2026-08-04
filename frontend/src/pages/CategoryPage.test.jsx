/**
 * Regression: dynamic category slug resolution on `/category/<slug>`.
 *
 * Bug: `getCategoryBySlug` only checked the curated JSON registry, so a
 * slug like `ceiling-lights` (auto-generated for a published-product
 * category not in the registry) rendered NotFound.
 *
 * Fix: CategoryPage now falls back to `/api/products/categories` and
 * `mergeDynamicCategories` — the exact same source the Catalog page
 * uses — so any dynamically-discovered category with at least one
 * published product renders normally.
 *
 * These tests verify the four required outcomes:
 *   1. Curated slug still resolves (chandeliers).
 *   2. Dynamic published slug resolves (ceiling-lights).
 *   3. Draft-only category (absent from /api/products/categories) → NotFound.
 *   4. Nonexistent slug → NotFound.
 */
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ---- Mocks (must be set up before requiring the page) ---------------------
const mockCategories = jest.fn();
const mockListProducts = jest.fn();
jest.mock("../lib/api", () => ({
  __esModule: true,
  api: {
    categories: (...args) => mockCategories(...args),
    listProducts: (...args) => mockListProducts(...args),
    resolveImage: (u) => u || "",
  },
  formatProductPrice: (p) => `₹${p?.price || 0}`,
}));

// Stub SEO helper: it uses react-helmet-async which we don't need in JSDOM.
jest.mock("../components/SEO", () => ({
  __esModule: true,
  default: () => null,
}));

// Stub CatalogueBrowser to something cheap — this test is about resolution,
// not the browser UI. We still assert it receives the correct db_name so
// dynamic categories filter products correctly.
jest.mock("../components/CatalogueBrowser", () => ({
  __esModule: true,
  default: ({ lockedCategory }) => (
    <div data-testid="catalogue-browser-stub" data-locked-category={lockedCategory} />
  ),
}));

// Stub NotFound so we can assert on a stable testid.
jest.mock("./NotFound", () => ({
  __esModule: true,
  default: () => <div data-testid="not-found-view">NotFound</div>,
}));

const CategoryPage = require("./CategoryPage").default;

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/category/:slug" element={<CategoryPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  mockCategories.mockReset();
  mockListProducts.mockReset();
  mockListProducts.mockResolvedValue({ items: [], total: 0, total_pages: 1 });
});

describe("CategoryPage — slug resolution", () => {
  test("curated slug resolves synchronously with hand-written H1", async () => {
    // API list-categories is not needed for curated slugs — the sync path
    // returns immediately. But if it IS called, return a value that
    // would not accidentally satisfy the curated slug.
    mockCategories.mockResolvedValue(["Chandelier"]);
    await act(async () => {
      renderAt("/category/chandeliers");
    });
    // No loading flash — curated resolution is sync.
    expect(screen.queryByTestId("page-category-loading")).toBeNull();
    // Hand-written H1 from categories.data.json.
    expect(
      screen.getByTestId("category-h1-chandeliers").textContent,
    ).toMatch(/Handcrafted Crystal Chandeliers/);
    // Locked category passed to browser is the exact DB name.
    expect(
      screen.getByTestId("catalogue-browser-stub").getAttribute("data-locked-category"),
    ).toBe("Chandelier");
    // Let the product-list fetch settle to avoid an act() warning.
    await waitFor(() => expect(mockListProducts).toHaveBeenCalled());
  });

  test("dynamic published category (ceiling-lights) resolves and renders", async () => {
    // Simulates a fresh admin who published a "Ceiling Light" product but
    // has not added an entry to categories.data.json yet.
    mockCategories.mockResolvedValue(["Chandelier", "Ceiling Light"]);
    renderAt("/category/ceiling-lights");

    // Brief loading state before the API returns.
    expect(screen.getByTestId("page-category-loading")).toBeInTheDocument();

    // After resolution, the page renders with the fallback H1.
    await waitFor(() =>
      expect(screen.queryByTestId("page-category-loading")).toBeNull(),
    );
    // Fallback H1 is the Title Cased label — NOT "Not Found".
    expect(screen.queryByTestId("not-found-view")).toBeNull();
    expect(
      screen.getByTestId("category-h1-ceiling-lights").textContent,
    ).toBe("Ceiling Light");
    // Locked category is the exact DB name so filtering works.
    expect(
      screen.getByTestId("catalogue-browser-stub").getAttribute("data-locked-category"),
    ).toBe("Ceiling Light");
    // Let the product-list fetch settle to avoid an act() warning.
    await waitFor(() => expect(mockListProducts).toHaveBeenCalled());
  });

  test("dynamic category filters products by db_name (not slug)", async () => {
    mockCategories.mockResolvedValue(["Ceiling Light"]);
    renderAt("/category/ceiling-lights");
    await waitFor(() => {
      // The JSON-LD ItemList fetch should query products by the exact
      // canonical db_name, not the slug.
      const call = mockListProducts.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.category).toBe("Ceiling Light");
    });
  });

  test("draft-only category (absent from /api/products/categories) shows NotFound", async () => {
    // Backend already filters this endpoint to `status=published` for anon
    // callers — a draft-only category cannot appear here. Simulate that:
    // the slug is requested but the API only returned curated ones.
    mockCategories.mockResolvedValue(["Chandelier"]);
    renderAt("/category/floor-mirrors");
    await waitFor(() =>
      expect(screen.getByTestId("not-found-view")).toBeInTheDocument(),
    );
  });

  test("completely nonexistent slug shows NotFound", async () => {
    mockCategories.mockResolvedValue(["Chandelier", "Ceiling Light"]);
    renderAt("/category/pizza");
    await waitFor(() =>
      expect(screen.getByTestId("not-found-view")).toBeInTheDocument(),
    );
  });

  test("API failure on unknown slug degrades gracefully to NotFound (no infinite spinner)", async () => {
    mockCategories.mockRejectedValue(new Error("network"));
    renderAt("/category/ceiling-lights");
    await waitFor(() =>
      expect(screen.getByTestId("not-found-view")).toBeInTheDocument(),
    );
  });
});
