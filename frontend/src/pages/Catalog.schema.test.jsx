import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockCategories = jest.fn();
jest.mock("../lib/api", () => ({
  __esModule: true,
  api: {
    categories: (...args) => mockCategories(...args),
  },
}));

jest.mock("../components/SEO", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../components/SchemaLD", () => ({
  __esModule: true,
  default: ({ id, data }) => data ? (
    <div data-testid={`schema-${id}`} data-schema-id={id}>
      {JSON.stringify(data)}
    </div>
  ) : null,
}));

jest.mock("../components/CatalogueBrowser", () => {
  const React = require("react");
  const page1 = {
    products: [
      { id: "catalog-1", name: "Catalog Visible 1" },
      { id: "catalog-2", name: "Catalog Visible 2" },
    ],
    total: 50,
    totalPages: 3,
    page: 1,
  };
  const page2 = {
    products: [
      { id: "catalog-25", name: "Catalog Visible 25" },
      { id: "catalog-26", name: "Catalog Visible 26" },
    ],
    total: 50,
    totalPages: 3,
    page: 2,
  };
  return {
    __esModule: true,
    default: ({ onListingChange }) => {
      React.useEffect(() => {
        const timer = setTimeout(() => onListingChange?.(page1), 0);
        return () => clearTimeout(timer);
      }, [onListingChange]);
      return (
        <button
          type="button"
          data-testid="catalogue-browser-next-stub"
          onClick={() => onListingChange?.(page2)}
        >
          Next page
        </button>
      );
    },
  };
});

const Catalog = require("./Catalog").default;

beforeEach(() => {
  mockCategories.mockReset();
  mockCategories.mockResolvedValue([]);
});

const readCatalogSchema = () =>
  JSON.parse(screen.getByTestId("schema-catalog-item-list").textContent);

test("/catalog ItemList replaces page data and keeps global positions", async () => {
  render(
    <MemoryRouter initialEntries={["/catalog"]}>
      <Catalog />
    </MemoryRouter>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("schema-catalog-item-list")).toBeInTheDocument(),
  );

  const node = screen.getByTestId("schema-catalog-item-list");
  expect(node.getAttribute("data-schema-id")).toBe("catalog-item-list");

  const firstPage = readCatalogSchema();
  expect(firstPage["@context"]).toBe("https://schema.org");
  expect(firstPage["@type"]).toBe("ItemList");
  expect(firstPage.numberOfItems).toBe(2);
  expect(firstPage.itemListElement.map((item) => item.position)).toEqual([1, 2]);
  expect(firstPage.itemListElement.map((item) => item.url)).toEqual([
    "https://samratglass.com/product/catalog-1",
    "https://samratglass.com/product/catalog-2",
  ]);

  fireEvent.click(screen.getByTestId("catalogue-browser-next-stub"));

  await waitFor(() => {
    const secondPage = readCatalogSchema();
    expect(secondPage.itemListElement[0].url).toBe(
      "https://samratglass.com/product/catalog-25",
    );
  });

  const secondPage = readCatalogSchema();
  expect(secondPage.numberOfItems).toBe(2);
  expect(secondPage.itemListElement.map((item) => item.position)).toEqual([25, 26]);
  expect(secondPage.itemListElement.map((item) => item.url)).toEqual([
    "https://samratglass.com/product/catalog-25",
    "https://samratglass.com/product/catalog-26",
  ]);
  expect(secondPage.itemListElement.some((item) => item.url.endsWith("/catalog-1"))).toBe(false);
});
