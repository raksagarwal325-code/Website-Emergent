import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
  return {
    __esModule: true,
    default: ({ onListingChange }) => {
      React.useEffect(() => {
        const timer = setTimeout(() => {
          onListingChange?.({
            products: [
              { id: "catalog-25", name: "Catalog Visible 25" },
              { id: "catalog-26", name: "Catalog Visible 26" },
            ],
            total: 50,
            totalPages: 3,
            page: 2,
          });
        }, 0);
        return () => clearTimeout(timer);
      }, [onListingChange]);
      return <div data-testid="catalogue-browser-stub" />;
    },
  };
});

const Catalog = require("./Catalog").default;

beforeEach(() => {
  mockCategories.mockReset();
  mockCategories.mockResolvedValue([]);
});

test("/catalog ItemList follows the accepted visible page and global positions", async () => {
  render(
    <MemoryRouter initialEntries={["/catalog?page=2"]}>
      <Catalog />
    </MemoryRouter>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("schema-catalog-item-list")).toBeInTheDocument(),
  );

  const node = screen.getByTestId("schema-catalog-item-list");
  expect(node.getAttribute("data-schema-id")).toBe("catalog-item-list");
  const schema = JSON.parse(node.textContent);
  expect(schema["@context"]).toBe("https://schema.org");
  expect(schema["@type"]).toBe("ItemList");
  expect(schema.numberOfItems).toBe(2);
  expect(schema.itemListElement).toEqual([
    {
      "@type": "ListItem",
      "position": 25,
      "url": "https://samratglass.com/product/catalog-25",
      "name": "Catalog Visible 25",
    },
    {
      "@type": "ListItem",
      "position": 26,
      "url": "https://samratglass.com/product/catalog-26",
      "name": "Catalog Visible 26",
    },
  ]);
});
