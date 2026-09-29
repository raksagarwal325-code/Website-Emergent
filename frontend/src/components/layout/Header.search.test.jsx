import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Header from "./Header";
import { api } from "../../lib/api";

jest.mock("../../context/CatalogContext", () => ({
  useCatalog: () => ({ cart: [], favorites: [] }),
}));

jest.mock("../../context/SettingsContext", () => ({
  useSettings: () => ({ settings: { whatsapp_number: "+91 98765 43210" } }),
}));

jest.mock("../../lib/api", () => ({
  api: {
    getSettings: jest.fn(),
  },
}));

beforeEach(() => {
  api.getSettings.mockResolvedValue({ brand_name: "Samrat Glass Emporium" });
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

test("opens one clear search menu with text and photo choices", () => {
  render(
    <MemoryRouter>
      <Header />
      <LocationProbe />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: "Find a light by text or photo" }));

  expect(screen.getByRole("dialog", { name: "Find a light" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload a photo to find exact or similar products" })).toHaveTextContent("Search with a photo");
  expect(screen.getByText(/same design first, followed by close alternatives/i)).toBeInTheDocument();
});

test("submits a header text search to the catalogue query", () => {
  render(
    <MemoryRouter>
      <Header />
      <LocationProbe />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: "Find a light by text or photo" }));
  fireEvent.change(screen.getByLabelText("Search by product name, SKU or type"), {
    target: { value: "SGE-WL-085" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search catalogue" }));

  expect(screen.getByTestId("location")).toHaveTextContent("/catalog?q=SGE-WL-085");
  expect(screen.queryByRole("dialog", { name: "Find a light" })).not.toBeInTheDocument();
});
