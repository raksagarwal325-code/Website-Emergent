import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockApi = {
  listAllProducts: jest.fn(), adminGetSettings: jest.fn(), stats: jest.fn(), categories: jest.fn(), adminReviewCounts: jest.fn(),
};
beforeEach(() => {
  mockApi.listAllProducts.mockResolvedValue([
    { id: "one", sku: "SGE-TL-001", name: "Rajsri Lamp", tags: ["collection:rajsri"], images: [], status: "published" },
  ]);
  mockApi.adminGetSettings.mockResolvedValue({ homepage_content: {
    collections_registry_version: 2, collections: [{ slug: "rajsri", name: "Rajsri" }],
    variant_families: [{ slug: "rajsri-lamps", name: "Rajsri Lamps", product_ids: ["one", "two"] }],
  } });
  mockApi.stats.mockResolvedValue({});
  mockApi.categories.mockResolvedValue([]);
  mockApi.adminReviewCounts.mockResolvedValue({});
});
jest.mock("../lib/api", () => ({ api: mockApi, compareBySku: () => 0 }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../components/AIProductGenerator", () => () => null);
jest.mock("../components/BulkCatalogueManager", () => () => null);
jest.mock("../components/ProductNameSuggester", () => () => null);
jest.mock("../components/ProductFullRegenerator", () => () => null);
const Admin = require("./Admin").default;

test("admin product list shows both saved relationship names", async () => {
  render(<MemoryRouter><Admin /></MemoryRouter>);
  fireEvent.click(screen.getByTestId("admin-tab-products"));
  const row = await screen.findByTestId("admin-product-one");
  expect(row).toHaveTextContent("Collection: Rajsri");
  expect(row).toHaveTextContent("Variant family: Rajsri Lamps");
  expect(mockApi.listAllProducts).toHaveBeenCalledWith(expect.objectContaining({ raw: true }));
});
