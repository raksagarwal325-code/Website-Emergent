/**
 * Accessibility regression: Atelier carousel dots must have a 44×44 CSS
 * px tap target while preserving the small visual pill.
 */
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("../lib/api", () => ({
  __esModule: true,
  api: {
    listProducts: () =>
      Promise.resolve({
        items: [
          { id: "p1", name: "Piece One", sku: "SGE-01", price: 10000, images: ["/a.jpg"], featured: true, status: "published" },
          { id: "p2", name: "Piece Two", sku: "SGE-02", price: 20000, images: ["/b.jpg"], featured: true, status: "published" },
        ],
        total: 2,
      }),
    listAllProducts: () =>
      Promise.resolve([
        { id: "p1", name: "Piece One", sku: "SGE-01", price: 10000, images: ["/a.jpg"], featured: true, status: "published" },
        { id: "p2", name: "Piece Two", sku: "SGE-02", price: 20000, images: ["/b.jpg"], featured: true, status: "published" },
      ]),
    resolveImage: (u) => u || "",
  },
  formatProductPrice: (p) => ({
    onRequest: false,
    primary: `₹${p?.price || 0}`,
    label: "",
    priceValue: p?.price || 0,
  }),
}));

jest.mock("../context/SettingsContext", () => ({
  __esModule: true,
  useSettings: () => ({
    settings: { whatsapp_number: "+919999999999" },
    hp: {
      atelier: {
        title: "Atelier",
        intro: "",
        images: [
          { src: "/img1.jpg", caption: "One", product_id: "p1" },
          { src: "/img2.jpg", caption: "Two", product_id: "p2" },
        ],
      },
    },
    refresh: jest.fn(),
  }),
}));

const AtelierShowcase = require("./AtelierShowcase").default;

describe("AtelierShowcase — dot tap-target accessibility", () => {
  test("each carousel dot exposes a 44×44 hit target and a visually small pill", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AtelierShowcase />
        </MemoryRouter>,
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId("atelier-dot-0")).toBeInTheDocument(),
    );
    for (let i = 0; i < 2; i++) {
      const btn = screen.getByTestId(`atelier-dot-${i}`);
      expect(btn.className).toMatch(/min-w-\[44px\]/);
      expect(btn.className).toMatch(/min-h-\[44px\]/);
      const pill = btn.querySelector("span");
      expect(pill).toBeTruthy();
      // Visual pill remains the same small size (h-1.5).
      expect(pill.className).toMatch(/h-1\.5/);
      // Pill hidden from AT — button aria-label announces "View slide N".
      expect(pill.getAttribute("aria-hidden")).toBe("true");
      expect(btn.getAttribute("aria-label")).toMatch(/^View slide \d+$/);
    }
    expect(
      screen.getByTestId("atelier-dot-0").getAttribute("aria-current"),
    ).toBe("true");
  });
});
