import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SpacePage from "./SpacePage";
import { api } from "../lib/api";

jest.mock("../lib/api", () => ({
  api: {
    listAllProducts: jest.fn(),
  },
}));

jest.mock("../components/ProductCard", () => ({ product }) => <div data-testid="space-product">{product.name}</div>);

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/space/:slug" element={<SpacePage />} />
        <Route path="/spaces" element={<div>Spaces index</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SpacePage", () => {
  beforeEach(() => jest.clearAllMocks());

  test("requests only products explicitly tagged for the selected space", async () => {
    api.listAllProducts.mockResolvedValue([
      { id: "1", name: "Tagged Chandelier", tags: [] },
    ]);

    const { container } = renderAt("/space/double-height-staircase");

    expect(screen.getByRole("heading", { level: 1, name: /Double-Height & Staircase/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Tagged Chandelier")).toBeInTheDocument());
    expect(api.listAllProducts).toHaveBeenCalledWith({
      tag: "space:double-height-staircase",
      limit: 48,
    });
    expect(container.textContent).toMatch(/1\s+verified\s+piece/i);
  });

  test("shows the curated empty state when the selected tag has no published products", async () => {
    api.listAllProducts.mockResolvedValue([]);

    renderAt("/space/double-height-staircase");

    await waitFor(() => expect(screen.getByText(/No pieces have been assigned to this space yet/i)).toBeInTheDocument());
    expect(screen.queryByTestId("space-product")).not.toBeInTheDocument();
  });
});
