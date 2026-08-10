/**
 * Regression: /cart route must render without a ReferenceError.
 *
 * Bug: A stale JSX guard `{waNumber && (…)}` in Cart.jsx referenced a
 * variable removed during the WhatsApp CTA standardisation, throwing
 * `Uncaught ReferenceError: waNumber is not defined` at Cart.jsx:134 and
 * blanking the page for every visitor with items in the cart.
 *
 * Fix: guard the WhatsApp CTA on the already-computed `waLink` (which
 * resolves to "#" when no phone number is configured in Settings).
 */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---- Mocks ---------------------------------------------------------------
jest.mock("../lib/api", () => ({
  __esModule: true,
  api: {
    getSettings: () => Promise.resolve({ whatsapp_number: "+919999999999" }),
    createInquiry: () => Promise.resolve({}),
    resolveImage: (u) => u || "",
  },
  formatPrice: (n) => `₹${n || 0}`,
  formatProductPrice: (p) => ({
    onRequest: false,
    primary: `₹${p?.price || 0}`,
    label: "",
  }),
}));
jest.mock("../components/SEO", () => ({ __esModule: true, default: () => null }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../context/SettingsContext", () => ({
  __esModule: true,
  useSettings: () => ({
    settings: { whatsapp_number: "+919999999999" },
    hp: {},
    refresh: jest.fn(),
  }),
}));

// A minimal CatalogContext stub with one cart item so the "Send Inquiry"
// panel + WhatsApp CTA are both rendered.
const cartFixture = [
  { product_id: "u-1", sku: "SGE-CH-101", name: "Wine Chandelier", quantity: 2, price: 15000 },
];
jest.mock("../context/CatalogContext", () => ({
  __esModule: true,
  useCatalog: () => ({
    cart: cartFixture,
    removeFromCart: jest.fn(),
    updateQty: jest.fn(),
    clearCart: jest.fn(),
    cartTotal: 30000,
    hasOnRequestItems: false,
    hasPricedItems: true,
    isItemOnRequest: () => false,
  }),
}));

// Silence framer-motion / router side effects — not under test here.
jest.mock("../lib/analytics", () => ({
  trackGenerateLead: jest.fn(),
  trackWhatsAppClick: jest.fn(),
}));

const Cart = require("./Cart").default;

describe("/cart page — waNumber regression", () => {
  const errorSpy = jest
    .spyOn(console, "error")
    .mockImplementation((...args) => {
      // Re-throw ReferenceErrors so the test fails loudly if they recur.
      const first = args[0];
      if (
        first &&
        String(first).includes("ReferenceError") &&
        String(first).includes("waNumber")
      ) {
        throw new Error(`Regression: ${first}`);
      }
    });

  afterAll(() => errorSpy.mockRestore());

  test("renders the inquiry form and the WhatsApp CTA without ReferenceError", async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/cart"]}>
          <Cart />
        </MemoryRouter>,
      );
    });
    // Inquiry form still present.
    expect(screen.getByTestId("inq-name")).toBeInTheDocument();
    expect(screen.getByTestId("inq-email")).toBeInTheDocument();
    expect(screen.getByTestId("inq-phone")).toBeInTheDocument();
    // Phone remains REQUIRED (previous fix preserved).
    expect(screen.getByTestId("inq-phone").hasAttribute("required")).toBe(true);
    // The WhatsApp CTA renders because settings.whatsapp_number is set.
    const wa = screen.getByTestId("wa-basket-btn");
    expect(wa).toBeInTheDocument();
    // …and its href is a real wa.me URL, not "#" (routed through the
    // centralised helper).
    const href = wa.getAttribute("href");
    expect(href.startsWith("https://wa.me/")).toBe(true);
    expect(href).toContain("text=");
    // Ensure no ReferenceError bubbled up. jsdom console.error was spied
    // to fail the test on the specific regression string.
    for (const call of errorSpy.mock.calls) {
      const msg = String(call[0] || "");
      expect(msg.includes("waNumber is not defined")).toBe(false);
    }
  });
});
