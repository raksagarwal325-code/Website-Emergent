import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockApi = { getProductVariants: jest.fn() };
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
