import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProductDimensionPilot from "./ProductDimensionPilot";

jest.mock("../lib/api", () => ({
  api: {
    getProduct: jest.fn(),
  },
}));

const { api } = require("../lib/api");

function GalleryFixture() {
  return (
    <>
      <div>
        <div data-testid="gallery-frame">
          <img data-testid="product-main-image" src="/image-one.jpg" alt="Product" />
        </div>
        <div data-testid="thumbnail-grid">
          <button type="button" data-testid="thumb-0"><img src="/image-one.jpg" alt="One" /></button>
          <button type="button" data-testid="thumb-1"><img src="/image-two.jpg" alt="Two" /></button>
          <button type="button" data-testid="thumb-2"><img src="/image-three.jpg" alt="Three" /></button>
        </div>
      </div>
      <ProductDimensionPilot />
    </>
  );
}

describe("ProductDimensionPilot sitewide gallery", () => {
  beforeEach(() => {
    api.getProduct.mockResolvedValue({
      id: "product-1",
      sku: "SGE-CH-999",
      name: "Example Three-Light Chandelier",
      category: "Chandelier",
      specs: {
        Height: '56"',
        Width: '52"',
        "Number of Lights": "24",
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("inserts Dimensions as the third gallery item and restores real images", async () => {
    render(
      <MemoryRouter initialEntries={["/product/product-1"]}>
        <Routes>
          <Route path="/product/:id" element={<GalleryFixture />} />
        </Routes>
      </MemoryRouter>,
    );

    const dimensionThumb = await screen.findByTestId("thumb-dimensions");
    const grid = screen.getByTestId("thumbnail-grid");

    await waitFor(() => {
      const buttons = Array.from(grid.querySelectorAll("button"));
      expect(buttons[0]).toHaveAttribute("data-testid", "thumb-0");
      expect(buttons[1]).toHaveAttribute("data-testid", "thumb-1");
      expect(buttons[2]).toHaveAttribute("data-testid", "thumb-dimensions");
      expect(buttons[3]).toHaveAttribute("data-testid", "thumb-2");
    });

    fireEvent.click(dimensionThumb);
    const panel = await screen.findByTestId("dimension-gallery-panel");
    expect(within(panel).getByText('56" H × 52" W')).toBeInTheDocument();
    expect(within(panel).getByText("4 ft 4 in wide")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("thumb-0"));
    await waitFor(() => {
      expect(screen.queryByTestId("dimension-gallery-panel")).not.toBeInTheDocument();
    });
  });

  test("does not add a Dimensions thumbnail when verified size specs are absent", async () => {
    api.getProduct.mockResolvedValueOnce({
      id: "product-2",
      sku: "SGE-TL-999",
      name: "Example Table Lamp",
      category: "Table Lamp",
      specs: { Material: "Glass" },
    });

    render(
      <MemoryRouter initialEntries={["/product/product-2"]}>
        <Routes>
          <Route path="/product/:id" element={<GalleryFixture />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.getProduct).toHaveBeenCalledWith("product-2"));
    await waitFor(() => expect(screen.queryByTestId("thumb-dimensions")).not.toBeInTheDocument());
  });
});
