import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockApi = { getProductVariants: jest.fn(), resolveImage: jest.fn((value) => value) };
jest.mock("../lib/api", () => ({ api: mockApi }));

const ProductVariants = require("./ProductVariants").default;

test("customer selector shows only the differences approved by the administrator", async () => {
  const amber = {
    id: "amber", sku: "SGE-CH-101", name: "Neelpushp Amber Chandelier",
    category: "Chandelier", specs: { "Glass Colour": "Amber", Finish: "Antique Brass" },
  };
  const clear = {
    id: "clear", sku: "SGE-CH-102", name: "Neelpushp Clear Chandelier",
    category: "Chandelier", specs: { "Glass Colour": "Clear", Finish: "Chrome" },
  };
  mockApi.getProductVariants.mockResolvedValue({
    family: { slug: "neelpushp", name: "Neelpushp", axes: ["glass_colour"] },
    items: [amber, clear],
  });

  render(<MemoryRouter><ProductVariants product={amber} /></MemoryRouter>);

  expect(await screen.findByText("Glass colour")).toBeInTheDocument();
  expect(screen.queryByText("Metal finish")).not.toBeInTheDocument();
  expect(screen.getByText("Clear").closest("a")).toHaveAttribute("href");
});

test("separates same-category choices from matching pieces in other categories", async () => {
  const chandelier = {
    id: "ch-blue", sku: "SGE-CH-094", name: "Bagh-e-Noor Cobalt Chandelier",
    category: "Chandelier", images: ["/ch-blue.jpg"], specs: { "Glass Colour": "Cobalt Blue" },
  };
  const wallBlue = {
    id: "wl-blue", sku: "SGE-WL-093", name: "Bagh-e-Noor Cobalt Wall Light",
    category: "Wall Light", images: ["/wl-blue.jpg"], specs: { "Glass Colour": "Cobalt Blue" },
  };
  const wallRed = {
    id: "wl-red", sku: "SGE-WL-094", name: "Bagh-e-Noor Ruby Wall Light",
    category: "Wall Light", images: ["/wl-red.jpg"], specs: { "Glass Colour": "Ruby Red" },
  };
  mockApi.getProductVariants.mockResolvedValue({
    family: { slug: "bagh-e-noor", name: "Bagh-e-Noor", axes: ["glass_colour", "use"] },
    items: [chandelier, wallRed, wallBlue],
  });

  render(<MemoryRouter><ProductVariants product={chandelier} /></MemoryRouter>);

  const matching = await screen.findByTestId("matching-piece-wall-light");
  expect(matching).toHaveTextContent("Wall Light");
  expect(matching).toHaveTextContent("SGE-WL-093");
  expect(matching).toHaveAttribute("href", expect.stringContaining("sge-wl-093"));
  expect(screen.queryByText("Form / use")).not.toBeInTheDocument();
});
