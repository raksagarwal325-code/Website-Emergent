import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const mockApi = {
  listAllProducts: jest.fn(),
  adminGetSettings: jest.fn(),
  updateSettings: jest.fn(),
  resolveImage: jest.fn((value) => `https://example.com${value}`),
};

jest.mock("../../lib/api", () => ({ api: mockApi }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const VariantFamiliesAdmin = require("./VariantFamiliesAdmin").default;

beforeEach(() => {
  mockApi.listAllProducts.mockResolvedValue([
    { id: "amber", sku: "SGE-CH-101", name: "Neelpushp Amber Chandelier", category: "Chandelier", status: "published", images: ["/amber.jpg"], specs: { "Glass Colour": "Amber" } },
    { id: "clear", sku: "SGE-CH-102", name: "Neelpushp Clear Chandelier", category: "Chandelier", status: "published", images: ["/clear.jpg"], specs: { "Glass Colour": "Clear" } },
    { id: "other", sku: "SGE-CH-999", name: "Unrelated Chandelier", category: "Chandelier", status: "published", images: ["/other.jpg"] },
  ]);
  mockApi.adminGetSettings.mockResolvedValue({ id: "settings", homepage_content: { variant_families: [] } });
  mockApi.updateSettings.mockImplementation((value) => Promise.resolve(value));
  mockApi.resolveImage.mockImplementation((value) => `https://example.com${value}`);
});

test("review shows selected variants first with images and a visible private approval action", async () => {
  const scrollIntoView = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
  render(<VariantFamiliesAdmin />);

  fireEvent.click(await screen.findByRole("button", { name: "Review group" }));

  expect(await screen.findByText("Reviewing a private variant suggestion")).toBeInTheDocument();
  await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
  expect(screen.getAllByRole("button", { name: "Approve reviewed family" }).length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Differs by Glass colour" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: /Differs by Metal finish/ }));
  expect(mockApi.updateSettings).not.toHaveBeenCalled();

  const rows = screen.getAllByTestId(/^variant-product-/);
  expect(rows[0]).toHaveAttribute("data-testid", "variant-product-SGE-CH-101");
  expect(rows[1]).toHaveAttribute("data-testid", "variant-product-SGE-CH-102");
  expect(within(rows[0]).getByText("SGE-CH-101")).toBeInTheDocument();
  expect(document.querySelector('img[src="https://example.com/amber.jpg"]')).toHaveAttribute("loading", "lazy");

  fireEvent.click(screen.getAllByRole("button", { name: "Approve reviewed family" })[0]);
  await waitFor(() => expect(mockApi.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
    homepage_content: expect.objectContaining({
      variant_families: [expect.objectContaining({
        name: "Neelpushp",
        product_ids: ["amber", "clear"],
        axes: ["glass_colour", "metal_finish"],
      })],
    }),
  })));
});
