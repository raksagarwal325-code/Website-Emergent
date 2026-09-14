import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockApi = {
  listAllProducts: jest.fn(),
  adminGetSettings: jest.fn(),
  updateSettings: jest.fn(),
  updateProduct: jest.fn(),
  resolveImage: jest.fn((value) => `https://example.com${value}`),
};

jest.mock("../lib/api", () => ({ api: mockApi }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../components/admin/VariantFamiliesAdmin", () => () => <div />);

const CollectionsAdmin = require("./CollectionsAdmin").default;

beforeEach(() => {
  mockApi.listAllProducts.mockImplementation(() => Promise.resolve([
    {
      id: "product-rajsri",
      sku: "SGE-TL-057",
      name: "Rajsri Lattice-Cut Crystal Table Lamp",
      category: "Table Lamp",
      status: "published",
      images: ["/api/files/rajsri.png"],
      tags: ["collection:rajsri", "collection-label:rajsri:Rajsri"],
    },
  ]));
  mockApi.adminGetSettings.mockImplementation(() => Promise.resolve({
    id: "settings",
    homepage_content: { collections: [{ slug: "gulzar", name: "Gulzar" }] },
  }));
  mockApi.updateSettings.mockImplementation((value) => Promise.resolve(value));
  mockApi.updateProduct.mockImplementation((id, value) => Promise.resolve(value));
  mockApi.resolveImage.mockImplementation((value) => `https://example.com${value}`);
});

test("recovers tag-saved collections and loads raw product metadata", async () => {
  render(<MemoryRouter><CollectionsAdmin /></MemoryRouter>);

  expect(await screen.findByRole("button", { name: "Rajsri" })).toBeInTheDocument();
  expect(mockApi.listAllProducts).toHaveBeenCalledWith({
    include_drafts: 1,
    limit: 5000,
    raw: true,
  });
  await waitFor(() => expect(mockApi.updateSettings).toHaveBeenCalledWith(
    expect.objectContaining({
      homepage_content: expect.objectContaining({
        collections: expect.arrayContaining([
          { slug: "gulzar", name: "Gulzar" },
          { slug: "rajsri", name: "Rajsri" },
        ]),
      }),
    }),
  ));
});

test("shows product thumbnail, prominent SKU and publication state", async () => {
  render(<MemoryRouter><CollectionsAdmin /></MemoryRouter>);

  expect(await screen.findByText("SGE-TL-057")).toBeInTheDocument();
  expect(screen.getByText("Rajsri Lattice-Cut Crystal Table Lamp")).toBeInTheDocument();
  expect(screen.getByText("Table Lamp · Published")).toBeInTheDocument();
  expect(document.querySelector('img[src="https://example.com/api/files/rajsri.png"]')).toHaveAttribute(
    "src",
    "https://example.com/api/files/rajsri.png",
  );
});
