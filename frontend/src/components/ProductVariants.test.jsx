import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const mockApi = { getProductVariants: jest.fn(), resolveImage: jest.fn((value) => value) };
jest.mock("../lib/api", () => ({ api: mockApi }));

const ProductVariants = require("./ProductVariants").default;

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

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

  render(<MemoryRouter><ProductVariants product={amber} /><LocationProbe /></MemoryRouter>);

  const glassColour = await screen.findByLabelText("Glass colour");
  expect(glassColour).toHaveValue("Amber");
  expect(screen.queryByText("Metal finish")).not.toBeInTheDocument();
  fireEvent.change(glassColour, { target: { value: "Clear" } });
  expect(screen.getByTestId("location")).toHaveTextContent("sge-ch-102");
});

test("separates same-category choices from matching pieces in other categories", async () => {
  const chandelier = {
    id: "ch-blue", sku: "SGE-CH-094", name: "Bagh-e-Noor Cobalt Chandelier",
    category: "Chandelier", images: ["/ch-blue.jpg"], specs: { "Glass Colour": "Cobalt Blue" },
  };
  const wallBlue = {
    id: "wl-blue", sku: "SGE-WL-093", name: "Bagh-e-Noor Cobalt Wall Light",
    category: "Wall Light", images: ["/wl-blue.jpg"],
    specs: { "Glass Colour": "Cobalt Blue", "Number of Lights": "2", Dimensions: "24 × 12 in", "Metal Finish": "Antique Brass" },
  };
  const wallRed = {
    id: "wl-red", sku: "SGE-WL-094", name: "Bagh-e-Noor Ruby Wall Light",
    category: "Wall Light", images: ["/wl-red.jpg"], specs: { "Glass Colour": "Ruby Red" },
  };
  mockApi.getProductVariants.mockResolvedValue({
    family: { slug: "bagh-e-noor", name: "Bagh-e-Noor", axes: ["glass_colour", "use"] },
    items: [chandelier, wallRed, wallBlue],
  });

  render(<MemoryRouter><ProductVariants product={chandelier} /><LocationProbe /></MemoryRouter>);

  const productType = await screen.findByLabelText("Product type");
  expect(productType).toHaveValue("Chandelier");
  expect(screen.getByRole("option", { name: "Wall Light" })).toBeInTheDocument();
  expect(screen.getByTestId("selected-configuration")).toHaveTextContent("SGE-CH-094");
  fireEvent.change(productType, { target: { value: "Wall Light" } });
  expect(screen.getByTestId("location")).toHaveTextContent("sge-wl-093");
  expect(screen.queryByText("Form / use")).not.toBeInTheDocument();
});

test("prefers a matching piece with the same glass colour even when saved colour labels differ", async () => {
  const chandelier = {
    id: "ch-green", sku: "SGE-CH-129", name: "Meher Emerald Green Chandelier",
    category: "Chandelier", specs: { "Glass Colour": "Emerald Green and Gold" },
  };
  const wallBlue = {
    id: "wl-blue", sku: "SGE-WL-065", name: "Meher Cobalt Blue Wall Light",
    category: "Wall Light", images: ["/wl-blue.jpg"], specs: {},
  };
  const wallGreen = {
    id: "wl-green", sku: "SGE-WL-068", name: "Meher Emerald Green Wall Light",
    category: "Wall Light", images: ["/wl-green.jpg"], specs: {},
  };
  mockApi.getProductVariants.mockResolvedValue({
    family: { slug: "meher", name: "Meher Diamond Cut Tulip", axes: ["glass_colour", "product_type"] },
    items: [chandelier, wallBlue, wallGreen],
  });

  render(<MemoryRouter><ProductVariants product={chandelier} /><LocationProbe /></MemoryRouter>);

  const productType = await screen.findByLabelText("Product type");
  fireEvent.change(productType, { target: { value: "Wall Light" } });
  expect(screen.getByTestId("location")).toHaveTextContent("sge-wl-068");
});

test("shows administrator-approved lights and size as linked choices within a product type", async () => {
  const fourLight = {
    id: "four", sku: "SGE-CH-129", name: "Meher Four-Light Chandelier",
    category: "Chandelier", specs: { "Glass Colour": "Emerald Green", "Number of Lights": "4", Dimensions: "30 × 24 in" },
  };
  const sixLight = {
    id: "six", sku: "SGE-CH-130", name: "Meher Six-Light Chandelier",
    category: "Chandelier", specs: { "Glass Colour": "Emerald Green", "Number of Lights": "6", Dimensions: "36 × 30 in" },
  };
  mockApi.getProductVariants.mockResolvedValue({
    family: { slug: "meher", name: "Meher", axes: ["glass_colour", "lights", "size"] },
    items: [fourLight, sixLight],
  });

  render(<MemoryRouter><ProductVariants product={fourLight} /><LocationProbe /></MemoryRouter>);

  const lights = await screen.findByLabelText("Lights");
  expect(lights).toHaveValue("4");
  fireEvent.change(lights, { target: { value: "6" } });
  expect(screen.getByTestId("location")).toHaveTextContent("sge-ch-130");

  const size = screen.getByLabelText("Size");
  expect(size).toHaveValue("30 × 24 in");
  fireEvent.change(size, { target: { value: "36 × 30 in" } });
  expect(screen.getByTestId("location")).toHaveTextContent("sge-ch-130");
});
