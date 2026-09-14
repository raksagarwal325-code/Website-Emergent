import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    homepage_content: {
      collections: [{ slug: "gulzar", name: "Gulzar" }],
      collections_registry_version: 2,
    },
  }));
  mockApi.updateSettings.mockImplementation((value) => Promise.resolve(value));
  mockApi.updateProduct.mockImplementation((id, value) => Promise.resolve(value));
  mockApi.resolveImage.mockImplementation((value) => `https://example.com${value}`);
});

test("returns accidentally registered collections to private suggestions", async () => {
  mockApi.adminGetSettings.mockResolvedValue({
    id: "settings",
    homepage_content: { collections: [
      { slug: "gulzar", name: "Gulzar" },
      { slug: "rajsri", name: "Rajsri" },
    ] },
  });
  render(<MemoryRouter><CollectionsAdmin /></MemoryRouter>);

  expect(await screen.findByRole("button", { name: "Gulzar" })).toBeInTheDocument();
  expect(mockApi.listAllProducts).toHaveBeenCalledWith({
    include_drafts: 1,
    limit: 5000,
    raw: true,
  });
  await waitFor(() => expect(mockApi.updateSettings).toHaveBeenCalledWith(
    expect.objectContaining({
      homepage_content: expect.objectContaining({
        collections: [{ slug: "gulzar", name: "Gulzar" }],
        collections_registry_version: 2,
      }),
    }),
  ));

  fireEvent.click(screen.getByRole("button", { name: /Suggested collections/i }));
  const suggestion = await screen.findByTestId("collection-suggestion-rajsri");
  expect(within(suggestion).getByText("SGE-TL-057")).toBeInTheDocument();
  expect(within(suggestion).getByText(/1 product.*Not live/i)).toBeInTheDocument();
});

test("shows product thumbnail, prominent SKU and publication state", async () => {
  render(<MemoryRouter><CollectionsAdmin /></MemoryRouter>);

  const row = await screen.findByTestId("collection-product-SGE-TL-057");
  expect(within(row).getByText("SGE-TL-057")).toBeInTheDocument();
  expect(row).toHaveTextContent("Rajsri Lattice-Cut Crystal Table Lamp");
  expect(row).toHaveTextContent(/Table Lamp.*Published/);
  expect(document.querySelector('img[src="https://example.com/api/files/rajsri.png"]')).toHaveAttribute(
    "src",
    "https://example.com/api/files/rajsri.png",
  );
});

test("keeps suggested collections private while showing images and SKUs for review", async () => {
  mockApi.listAllProducts.mockResolvedValue([
    {
      id: "amber", sku: "SGE-CH-101", name: "Mayurcrest Amber Chandelier",
      category: "Chandelier", status: "published", images: ["/amber.jpg"], tags: [],
    },
    {
      id: "clear", sku: "SGE-CH-102", name: "Mayurcrest Clear Chandelier",
      category: "Chandelier", status: "published", images: ["/clear.jpg"], tags: [],
    },
  ]);

  render(<MemoryRouter><CollectionsAdmin /></MemoryRouter>);

  fireEvent.click(await screen.findByRole("button", { name: /Suggested collections/i }));
  const suggestion = await screen.findByTestId("collection-suggestion-mayurcrest");
  expect(within(suggestion).getByText("SGE-CH-101")).toBeInTheDocument();
  expect(within(suggestion).getByText("SGE-CH-102")).toBeInTheDocument();
  const previewImages = within(suggestion).getAllByRole("img");
  expect(previewImages).toHaveLength(2);
  expect(previewImages[0]).toHaveAttribute("loading", "lazy");
  expect(mockApi.updateSettings).not.toHaveBeenCalled();

  fireEvent.click(within(suggestion).getByRole("button", { name: "Review" }));
  expect(await screen.findByRole("button", { name: "Approve & publish collection" })).toBeInTheDocument();
  expect(screen.getByDisplayValue("Mayurcrest")).toBeInTheDocument();
  expect(screen.getByText(/Reviewing a private suggestion/)).toBeInTheDocument();
  expect(mockApi.updateSettings).not.toHaveBeenCalled();
});
