import React from "react";
import { fireEvent, render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockUpdateQty = jest.fn();
const mockRemoveFromCart = jest.fn();

jest.mock("../lib/api", () => ({
  __esModule: true,
  api: {
    getSettings: () => Promise.resolve({ whatsapp_number: "+919999999999" }),
    createInquiry: () => Promise.resolve({}),
    resolveImage: (u) => u || "",
  },
  formatPrice: (n) => `₹${n || 0}`,
}));

jest.mock("../components/SEO", () => ({ __esModule: true, default: () => null }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../lib/analytics", () => ({ trackGenerateLead: jest.fn() }));
jest.mock("../lib/phone", () => ({
  normalizePhone: (value) => value ? { ok: true, value } : { ok: false, error: "Enter a valid mobile number" },
}));

const cartFixture = [
  { product_id: "u-1", sku: "SGE-CH-101", name: "Wine Chandelier", quantity: 2, price: 15000 },
];

jest.mock("../context/CatalogContext", () => ({
  __esModule: true,
  useCatalog: () => ({
    cart: cartFixture,
    removeFromCart: mockRemoveFromCart,
    updateQty: mockUpdateQty,
    clearCart: jest.fn(),
    cartTotal: 30000,
    hasOnRequestItems: false,
    hasPricedItems: true,
    isItemOnRequest: () => false,
  }),
}));

const Cart = require("./Cart").default;

async function renderCart() {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Cart />
      </MemoryRouter>,
    );
  });
}

describe("Inquiry Basket accessibility", () => {
  beforeEach(() => {
    mockUpdateQty.mockClear();
    mockRemoveFromCart.mockClear();
  });

  test("quantity and remove controls expose product-specific accessible names", async () => {
    await renderCart();

    const decrease = screen.getByRole("button", { name: "Decrease quantity of Wine Chandelier" });
    const increase = screen.getByRole("button", { name: "Increase quantity of Wine Chandelier" });
    const remove = screen.getByRole("button", { name: "Remove Wine Chandelier from inquiry basket" });

    fireEvent.click(decrease);
    expect(mockUpdateQty).toHaveBeenCalledWith("u-1", 1);

    fireEvent.click(increase);
    expect(mockUpdateQty).toHaveBeenCalledWith("u-1", 3);

    fireEvent.click(remove);
    expect(mockRemoveFromCart).toHaveBeenCalledWith("u-1");
  });

  test("inquiry fields have persistent programmatic labels and autocomplete metadata", async () => {
    await renderCart();

    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveAttribute("autocomplete", "name");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("autocomplete", "email");
    expect(screen.getByRole("textbox", { name: "Mobile or WhatsApp number" })).toHaveAttribute("autocomplete", "tel");
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveAttribute("name", "message");
  });

  test("phone validation error is announced and associated with the phone field", async () => {
    await renderCart();

    fireEvent.change(screen.getByRole("textbox", { name: "Full name" }), { target: { value: "Test User" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "test@example.com" } });
    fireEvent.submit(screen.getByRole("button", { name: "Send inquiry" }).closest("form"));

    const phone = screen.getByRole("textbox", { name: "Mobile or WhatsApp number" });
    const error = await screen.findByRole("alert");

    expect(error).toHaveAttribute("id", "inq-phone-error");
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveAttribute("aria-describedby", "inq-phone-error");
  });
});
