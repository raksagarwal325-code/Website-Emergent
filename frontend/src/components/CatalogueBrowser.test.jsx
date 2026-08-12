/**
 * Batch B · Item 1 — URL-based pagination for the catalog browser.
 *
 * Verifies:
 *   1. Initial render shows page 1 with a "Page N of M" indicator.
 *   2. Clicking "Next" changes `?page=` in the URL and REPLACES products
 *      (never appends).
 *   3. "Previous" is disabled on page 1; "Next" is disabled on the last
 *      page.
 *   4. Changing the search input resets to page 1 (removes `?page=` from
 *      the URL).
 *   5. Landing directly on `?page=2` fetches page 2 immediately.
 *   6. An invalid page number (`?page=999`) is clamped to the last valid
 *      page after the total_pages is known.
 *
 * We avoid rendering the full Catalog page because it drags in SEO/head
 * management; we render CatalogueBrowser directly inside a MemoryRouter.
 */
import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---- Mock api.listProducts BEFORE importing the component ---------------
const mockListProducts = jest.fn();
jest.mock("../lib/api", () => ({
  __esModule: true,
  api: {
    listProducts: (...args) => mockListProducts(...args),
    resolveImage: (u) => u || "",
  },
  formatProductPrice: (p) => `₹${p?.price || 0}`,
}));

// Stub out ProductCard so we can count rendered products cheaply.
jest.mock("./ProductCard", () => ({
  __esModule: true,
  default: ({ product }) => (
    <div data-testid={`product-card-${product.id}`}>{product.name}</div>
  ),
}));

// Stub out shadcn Slider + Select so their portal + Radix-UI internals
// don't complicate the test tree.
jest.mock("./ui/slider", () => ({
  __esModule: true,
  Slider: () => <div data-testid="price-slider-stub" />,
}));
jest.mock("./ui/select", () => ({
  __esModule: true,
  Select: ({ children }) => <div>{children}</div>,
  SelectTrigger: ({ children }) => <div>{children}</div>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children }) => <div>{children}</div>,
  SelectValue: () => null,
}));

const CatalogueBrowser = require("./CatalogueBrowser").default;

const makePage = (page, totalPages, total, count = 24) => ({
  items: Array.from({ length: count }, (_, i) => ({
    id: `p${page}-${i}`,
    name: `Product ${page}-${i}`,
    price: 1000 + i,
    images: [],
  })),
  total,
  page,
  limit: 24,
  total_pages: totalPages,
});

beforeEach(() => {
  mockListProducts.mockReset();
  // Default: 3 pages of 24 products (72 total)
  mockListProducts.mockImplementation((params = {}) => {
    const p = params.page || 1;
    return Promise.resolve(makePage(p, 3, 72, 24));
  });
});

const renderBrowser = (initialEntries = ["/catalog"], extraProps = {}) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <CatalogueBrowser {...extraProps} />
    </MemoryRouter>,
  );

// Bypass the internal 250ms debounce.
const advanceDebounce = async () => {
  jest.useFakeTimers();
  jest.advanceTimersByTime(300);
  jest.useRealTimers();
};

describe("CatalogueBrowser — URL-based pagination", () => {
  test("renders page 1 by default with a page indicator", async () => {
    renderBrowser();
    await waitFor(() =>
      expect(screen.getByTestId("product-card-p1-0")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("page-indicator").textContent).toMatch(/Page 1 of 3/i);
    // Previous is disabled on page 1.
    expect(screen.getByTestId("pagination-prev")).toBeDisabled();
    // Next is enabled.
    expect(screen.getByTestId("pagination-next")).not.toBeDisabled();
  });

  test("clicking Next fetches page 2 and REPLACES products (no append)", async () => {
    renderBrowser();
    await waitFor(() =>
      expect(screen.getByTestId("product-card-p1-0")).toBeInTheDocument(),
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("pagination-next"));
    });

    // Page 1 products must be gone; page 2 products must be present.
    await waitFor(() =>
      expect(screen.getByTestId("product-card-p2-0")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("product-card-p1-0")).toBeNull();
    // The most recent call to the API should carry page=2.
    const lastCall = mockListProducts.mock.calls[mockListProducts.mock.calls.length - 1][0];
    expect(lastCall.page).toBe(2);
    expect(screen.getByTestId("page-indicator").textContent).toMatch(/Page 2 of 3/i);
  });

  test("onListingChange reports the same accepted page that replaces the visible grid", async () => {
    const onListingChange = jest.fn();
    renderBrowser(["/catalog"], { onListingChange });

    await waitFor(() =>
      expect(screen.getByTestId("product-card-p1-0")).toBeInTheDocument(),
    );
    expect(onListingChange).toHaveBeenCalled();
    expect(onListingChange.mock.calls[onListingChange.mock.calls.length - 1][0]).toMatchObject({
      total: 72,
      totalPages: 3,
      page: 1,
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("pagination-next"));
    });

    await waitFor(() =>
      expect(screen.getByTestId("product-card-p2-0")).toBeInTheDocument(),
    );
    const reported = onListingChange.mock.calls[onListingChange.mock.calls.length - 1][0];
    expect(reported.page).toBe(2);
    expect(reported.total).toBe(72);
    expect(reported.totalPages).toBe(3);
    expect(reported.products).toHaveLength(24);
    expect(reported.products[0].id).toBe("p2-0");
    expect(reported.products.some((p) => p.id === "p1-0")).toBe(false);
  });

  test("Next is disabled on the last page", async () => {
    renderBrowser(["/catalog?page=3"]);
    await waitFor(() =>
      expect(screen.getByTestId("product-card-p3-0")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("pagination-next")).toBeDisabled();
    expect(screen.getByTestId("pagination-prev")).not.toBeDisabled();
  });

  test("changing the search input resets to page 1", async () => {
    renderBrowser(["/catalog?page=2"]);
    await waitFor(() =>
      expect(screen.getByTestId("product-card-p2-0")).toBeInTheDocument(),
    );

    // Now type in the search box — it must reset to page 1.
    const searchInput = screen.getByTestId("catalog-search");
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "chandelier" } });
    });

    await waitFor(() => {
      const call = mockListProducts.mock.calls[mockListProducts.mock.calls.length - 1][0];
      expect(call.page).toBe(1);
      expect(call.q).toBe("chandelier");
    });
    expect(screen.getByTestId("page-indicator").textContent).toMatch(/Page 1 of 3/i);
  });

  test("landing on ?page=2 directly fetches page 2 (deep-linkable state)", async () => {
    renderBrowser(["/catalog?page=2"]);
    await waitFor(() => {
      const firstCall = mockListProducts.mock.calls[0][0];
      expect(firstCall.page).toBe(2);
    });
    await waitFor(() =>
      expect(screen.getByTestId("product-card-p2-0")).toBeInTheDocument(),
    );
  });

  test("out-of-range ?page=999 clamps to the last valid page", async () => {
    renderBrowser(["/catalog?page=999"]);
    // First request goes out with page=999; server returns total_pages=3.
    // The component must re-render on page 3 (or clamp URL). We assert on
    // the visible page indicator settling on 3, which is the terminal state.
    await waitFor(
      () =>
        expect(screen.getByTestId("page-indicator").textContent).toMatch(/Page 3 of 3/i),
      { timeout: 3000 },
    );
    // A follow-up fetch for the clamped page must eventually happen (the
    // debounce delay before the second fetch is 250 ms).
    await waitFor(
      () => {
        const callPages = mockListProducts.mock.calls.map((c) => c[0].page);
        expect(callPages).toContain(3);
      },
      { timeout: 3000 },
    );
  });

  test("hides pagination entirely when there is only one page", async () => {
    mockListProducts.mockImplementation(() =>
      Promise.resolve(makePage(1, 1, 5, 5)),
    );
    renderBrowser();
    await waitFor(() =>
      expect(screen.getByTestId("product-card-p1-0")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("catalog-pagination")).toBeNull();
  });
});

describe("CatalogueBrowser — sidebar category rendering", () => {
  test("renders title-cased label (not raw uppercase db_name) for dynamic categories", async () => {
    // Dynamic category object comes from mergeDynamicCategories → the
    // fallback label is Title Cased even when the raw db_name is
    // "CEILING LIGHT".
    const dynamicCategories = [
      { slug: "ceiling-lights", db_name: "CEILING LIGHT", label: "Ceiling Light", _dynamic: true },
      { slug: "chandeliers", db_name: "Chandelier", label: "Chandeliers" },
    ];
    renderBrowser(["/catalog"], { dynamicCategories });
    await waitFor(() =>
      expect(screen.getByTestId("product-card-p1-0")).toBeInTheDocument(),
    );
    // testid is derived from db_name (case-insensitive kebab).
    const btn = screen.getByTestId("cat-ceiling-light");
    // Human-visible text must be the Title Cased label, not the raw
    // "CEILING LIGHT" from the DB.
    expect(btn.textContent).toBe("Ceiling Light");
    // The curated entry also renders its label.
    expect(screen.getByTestId("cat-chandelier").textContent).toBe("Chandeliers");
  });

  test("does not emit a React unique-key warning for the categories map", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const dynamicCategories = [
      { slug: "ceiling-lights", db_name: "CEILING LIGHT", label: "Ceiling Light" },
      { slug: "chandeliers", db_name: "Chandelier", label: "Chandeliers" },
      { slug: "wall-lights", db_name: "Wall Light", label: "Wall Lights" },
    ];
    renderBrowser(["/catalog"], { dynamicCategories });
    await waitFor(() =>
      expect(screen.getByTestId("product-card-p1-0")).toBeInTheDocument(),
    );
    const keyWarnings = errorSpy.mock.calls.filter((args) =>
      String(args[0] || "").includes("unique \"key\" prop"),
    );
    expect(keyWarnings).toHaveLength(0);
    errorSpy.mockRestore();
  });
});
