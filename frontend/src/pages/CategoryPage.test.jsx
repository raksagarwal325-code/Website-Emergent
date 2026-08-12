/**
 * Focused regressions for `/category/<slug>` resolution and structured data.
 *
 * The page must resolve curated/dynamic categories exactly as before, while
 * Product listing JSON-LD is driven only by the accepted CatalogueBrowser
 * result — never by a second schema-only product fetch.
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

jest.mock("../components/SEO", () => ({
  __esModule: true,
  default: () => null,
}));

// Capture SchemaLD props in the rendered test tree. The production component
// still owns head insertion/deduplication; this mock only makes schema data
// directly assertable.
jest.mock("../components/SchemaLD", () => ({
  __esModule: true,
  default: ({ id, data }) => data ? (
    <div data-testid={`schema-${id}`} data-schema-id={id}>
      {JSON.stringify(data)}
    </div>
  ) : null,
}));

// Stub CatalogueBrowser cheaply but preserve the new contract: after mount it
// reports one accepted visible result. Page 2 is deliberate so schema position
// assertions prove global pagination offsets are used.
jest.mock("../components/CatalogueBrowser", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ lockedCategory, onListingChange }) => {
      React.useEffect(() => {
        const timer = setTimeout(() => {
          onListingChange?.({
            products: [
              { id: "visible-25", name: `${lockedCategory} Visible 25`, images: [] },
              { id: "visible-26", name: `${lockedCategory} Visible 26`, images: [] },
            ],
            total: 50,
            totalPages: 3,
            page: 2,
          });
        }, 0);
        return () => clearTimeout(timer);
      }, [lockedCategory, onListingChange]);
      return (
        <div data-testid="catalogue-browser-stub" data-locked-category={lockedCategory} />
      );
    },
  };
});

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

const readSchema = (testId) => JSON.parse(screen.getByTestId(testId).textContent);

beforeEach(() => {
  mockCategories.mockReset();
  mockListProducts.mockReset();
});

describe("CategoryPage — slug resolution", () => {
  test("curated slug resolves synchronously with hand-written H1", async () => {
    mockCategories.mockResolvedValue(["Chandelier"]);
    await act(async () => {
      renderAt("/category/chandeliers");
    });
    expect(screen.queryByTestId("page-category-loading")).toBeNull();
    expect(
      screen.getByTestId("category-h1-chandeliers").textContent,
    ).toMatch(/Handcrafted Crystal Chandeliers/);
    expect(
      screen.getByTestId("catalogue-browser-stub").getAttribute("data-locked-category"),
    ).toBe("Chandelier");
  });

  test("newly-curated slug (ceiling-lights) resolves synchronously", async () => {
    mockCategories.mockResolvedValue(["Chandelier", "Ceiling Light"]);
    await act(async () => {
      renderAt("/category/ceiling-lights");
    });
    expect(screen.queryByTestId("page-category-loading")).toBeNull();
    expect(
      screen.getByTestId("category-h1-ceiling-lights").textContent,
    ).toBe("Decorative Ceiling Lights");
    expect(
      screen.getByTestId("catalogue-browser-stub").getAttribute("data-locked-category"),
    ).toBe("Ceiling Light");
  });

  test("newly-curated slug (gate-lights) resolves synchronously", async () => {
    mockCategories.mockResolvedValue(["Chandelier", "Gate Light"]);
    await act(async () => {
      renderAt("/category/gate-lights");
    });
    expect(screen.queryByTestId("page-category-loading")).toBeNull();
    expect(
      screen.getByTestId("category-h1-gate-lights").textContent,
    ).toBe("Decorative Gate Lights");
    expect(
      screen.getByTestId("catalogue-browser-stub").getAttribute("data-locked-category"),
    ).toBe("Gate Light");
  });

  test("dynamic (uncurated) published category resolves and renders", async () => {
    mockCategories.mockResolvedValue(["Chandelier", "Novelty Lamp"]);
    renderAt("/category/novelty-lamps");

    expect(screen.getByTestId("page-category-loading")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByTestId("page-category-loading")).toBeNull(),
    );
    expect(screen.queryByTestId("not-found-view")).toBeNull();
    expect(
      screen.getByTestId("category-h1-novelty-lamps").textContent,
    ).toBe("Novelty Lamp");
    expect(
      screen.getByTestId("catalogue-browser-stub").getAttribute("data-locked-category"),
    ).toBe("Novelty Lamp");
  });

  test("draft-only category (absent from /api/products/categories) shows NotFound", async () => {
    mockCategories.mockResolvedValue(["Chandelier"]);
    renderAt("/category/floor-mirrors");
    await waitFor(() =>
      expect(screen.getByTestId("not-found-view")).toBeInTheDocument(),
    );
  });

  test("completely nonexistent slug shows NotFound", async () => {
    mockCategories.mockResolvedValue(["Chandelier", "Novelty Lamp"]);
    renderAt("/category/pizza");
    await waitFor(() =>
      expect(screen.getByTestId("not-found-view")).toBeInTheDocument(),
    );
  });

  test("API failure on unknown slug degrades gracefully to NotFound (no infinite spinner)", async () => {
    mockCategories.mockRejectedValue(new Error("network"));
    renderAt("/category/novelty-lamps");
    await waitFor(() =>
      expect(screen.getByTestId("not-found-view")).toBeInTheDocument(),
    );
  });
});

describe("CategoryPage — listing structured data", () => {
  test("does not perform a separate schema-only product fetch", async () => {
    mockCategories.mockResolvedValue(["Chandelier"]);
    renderAt("/category/chandeliers");
    await waitFor(() =>
      expect(screen.getByTestId("schema-category-chandeliers")).toBeInTheDocument(),
    );
    expect(mockListProducts).not.toHaveBeenCalled();
  });

  test("CollectionPage ItemList uses the accepted visible page and global positions", async () => {
    mockCategories.mockResolvedValue(["Chandelier"]);
    renderAt("/category/chandeliers");
    await waitFor(() =>
      expect(screen.getByTestId("schema-category-chandeliers")).toBeInTheDocument(),
    );

    const schema = readSchema("schema-category-chandeliers");
    expect(schema["@type"]).toBe("CollectionPage");
    expect(schema.mainEntity["@type"]).toBe("ItemList");
    expect(schema.mainEntity.numberOfItems).toBe(2);
    expect(schema.mainEntity.itemListElement.map((item) => item.position)).toEqual([25, 26]);
    expect(schema.mainEntity.itemListElement.map((item) => item.url)).toEqual([
      "https://samratglass.com/product/visible-25",
      "https://samratglass.com/product/visible-26",
    ]);
  });

  test("runtime schema uses stable category and breadcrumb keys", async () => {
    mockCategories.mockResolvedValue(["Chandelier"]);
    renderAt("/category/chandeliers");
    await waitFor(() =>
      expect(screen.getByTestId("schema-category-chandeliers")).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId("schema-category-chandeliers").getAttribute("data-schema-id"),
    ).toBe("category-chandeliers");
    expect(
      screen.getByTestId("schema-category-breadcrumb-chandeliers").getAttribute("data-schema-id"),
    ).toBe("category-breadcrumb-chandeliers");
  });

  test("BreadcrumbList labels and canonical URLs match the visible breadcrumb", async () => {
    mockCategories.mockResolvedValue(["Chandelier"]);
    renderAt("/category/chandeliers");
    await waitFor(() =>
      expect(screen.getByTestId("schema-category-breadcrumb-chandeliers")).toBeInTheDocument(),
    );

    const schema = readSchema("schema-category-breadcrumb-chandeliers");
    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement).toEqual([
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://samratglass.com/",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Catalog",
        "item": "https://samratglass.com/catalog",
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Chandeliers",
        "item": "https://samratglass.com/category/chandeliers",
      },
    ]);
  });
});
