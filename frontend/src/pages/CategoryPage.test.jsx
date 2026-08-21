import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CategoryPage from "./CategoryPage";
import { api } from "../lib/api";

jest.mock("../components/CatalogueBrowser", () => function MockCatalogueBrowser({ lockedCategory, onListingChange }) {
  React.useEffect(() => {
    onListingChange?.({ products: [], page: 1, total: 0 });
  }, [onListingChange]);
  return <div data-testid="catalogue-browser">{lockedCategory}</div>;
});

jest.mock("../lib/api", () => ({
  api: {
    categories: jest.fn(),
    resolveImage: jest.fn((v) => v),
  },
}));

function renderCategory(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/category/:slug" element={<CategoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CategoryPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders curated chandeliers category with SEO metadata and manufacturer authority link", async () => {
    renderCategory("/category/chandeliers");

    expect(screen.getByTestId("category-h1-chandeliers")).toBeInTheDocument();
    expect(screen.getByTestId("catalogue-browser")).toHaveTextContent("Chandelier");

    const authorityLink = screen.getByTestId("chandelier-manufacturer-authority-link");
    expect(authorityLink).toBeInTheDocument();
    expect(authorityLink.querySelector('a[href="/chandelier-manufacturer-india"]')).toBeTruthy();

    await waitFor(() => {
      expect(document.querySelector('link[rel="canonical"]'))
        .toHaveAttribute("href", "https://samratglass.com/category/chandeliers");
    });
  });

  test("does not show manufacturer authority link on non-chandelier categories", () => {
    renderCategory("/category/hanging-lights");
    expect(screen.queryByTestId("chandelier-manufacturer-authority-link")).not.toBeInTheDocument();
  });

  test("resolves a dynamic category slug through the public categories endpoint", async () => {
    api.categories.mockResolvedValue(["Pendant Light"]);
    renderCategory("/category/pendant-light");

    await waitFor(() => {
      expect(screen.getByTestId("catalogue-browser")).toHaveTextContent("Pendant Light");
    });
  });
});
