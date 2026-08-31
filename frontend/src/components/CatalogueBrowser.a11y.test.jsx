import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("../lib/api", () => ({
  api: {
    listProducts: jest.fn(() => Promise.resolve({ items: [], total: 0, total_pages: 1 })),
  },
}));

jest.mock("./ProductCard", () => ({
  __esModule: true,
  default: () => <div data-testid="product-card-stub" />,
}));

const CatalogueBrowser = require("./CatalogueBrowser").default;

function renderBrowser() {
  return render(
    <MemoryRouter initialEntries={["/catalog"]}>
      <CatalogueBrowser initialProducts={[]} initialTotal={0} />
    </MemoryRouter>,
  );
}

describe("CatalogueBrowser accessibility", () => {
  test("search input has a persistent programmatic label", () => {
    renderBrowser();
    const input = screen.getByRole("searchbox", { name: "Search catalogue" });
    expect(input).toHaveAttribute("id", "catalog-search");
    expect(input).toHaveAttribute("name", "catalog-search");
  });

  test("sort trigger exposes an accessible name", () => {
    renderBrowser();
    expect(screen.getByTestId("sort-select")).toHaveAttribute("aria-label", "Sort catalogue");
  });

  test("filter toggle identifies and controls the filter panel", () => {
    renderBrowser();
    const toggle = screen.getByTestId("filters-toggle");
    expect(toggle).toHaveAttribute("aria-controls", "catalog-filters-panel");
    fireEvent.click(toggle);
    expect(screen.getByTestId("filters-panel")).toHaveAttribute("id", "catalog-filters-panel");
    expect(screen.getByTestId("filters-panel")).toHaveAttribute("aria-label", "Catalogue filters");
  });

  test("price slider thumb is labelled from the visible Price heading", () => {
    renderBrowser();
    fireEvent.click(screen.getByTestId("filters-toggle"));
    const slider = screen.getByRole("slider", { name: "Price" });
    expect(slider).toHaveAttribute("aria-labelledby", "catalog-price-label");
  });
});
