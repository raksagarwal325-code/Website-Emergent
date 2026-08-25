/**
 * Accessibility regression: Atelier carousel dots must have a 44×44 CSS
 * px tap target while keeping the visual pill clearly visible.
 *
 * Framer Motion is intentionally mocked here because this test verifies the
 * rendered accessibility contract, not animation lifecycles. That keeps the
 * regression deterministic under jsdom/React act semantics.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("framer-motion", () => {
  const React = require("react");
  const ignored = new Set([
    "initial",
    "animate",
    "exit",
    "transition",
    "whileInView",
    "viewport",
    "whileHover",
    "whileTap",
    "variants",
    "layout",
    "layoutId",
  ]);

  const makeMotionComponent = (tag) =>
    React.forwardRef(({ children, ...props }, ref) => {
      const domProps = Object.fromEntries(
        Object.entries(props).filter(([key]) => !ignored.has(key)),
      );
      return React.createElement(tag, { ...domProps, ref }, children);
    });

  const motion = new Proxy(
    {},
    {
      get: (_target, tag) => makeMotionComponent(tag),
    },
  );

  return {
    __esModule: true,
    motion,
    AnimatePresence: ({ children }) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

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
  test("each carousel dot exposes a 44×44 hit target and a visible pill", async () => {
    render(
      <MemoryRouter>
        <AtelierShowcase />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("atelier-dot-0")).toBeInTheDocument(),
    );

    const dots = [];
    for (let i = 0; i < 2; i++) {
      const btn = screen.getByTestId(`atelier-dot-${i}`);
      dots.push(btn);
      expect(btn.className).toMatch(/min-w-\[44px\]/);
      expect(btn.className).toMatch(/min-h-\[44px\]/);
      const pill = btn.querySelector("span");
      expect(pill).toBeTruthy();
      expect(pill.className).toMatch(/h-2/);
      expect(pill.getAttribute("aria-hidden")).toBe("true");
      expect(btn.getAttribute("aria-label")).toMatch(/^View slide \d+$/);
    }

    expect(
      dots.filter((btn) => btn.getAttribute("aria-current") === "true"),
    ).toHaveLength(1);
  });
});
