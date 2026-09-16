import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockApi = {
  listInquiryQuotations: jest.fn(),
  adminProductsExport: jest.fn().mockResolvedValue([]),
  listStandaloneQuotations: jest.fn().mockResolvedValue([]),
  createStandaloneQuotation: jest.fn(),
  createInquiryQuotation: jest.fn(),
};
const mockPdfSave = jest.fn();
const mockPdfDocument = () => ({
  internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
  setFillColor: jest.fn(), rect: jest.fn(), setTextColor: jest.fn(),
  roundedRect: jest.fn(), addImage: jest.fn(), setLineWidth: jest.fn(),
  setFont: jest.fn(), setFontSize: jest.fn(), text: jest.fn(),
  splitTextToSize: (value) => [value], addPage: jest.fn(),
  setDrawColor: jest.fn(), line: jest.fn(), save: mockPdfSave,
  output: jest.fn(() => new Blob(["pdf"], { type: "application/pdf" })),
});

jest.mock("../lib/api", () => ({ api: mockApi }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("jspdf", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const InquiryQuotationBuilder = require("./InquiryQuotationBuilder").default;
const MockJsPDF = require("jspdf").default;

const inquiry = {
  id: "inq-kishor",
  customer_name: "Kishor A Lalwani",
  customer_email: "kishor@example.com",
  customer_phone: "+919820700130",
  items: [{
    product_id: "wall",
    name: "Noorjharokha Chain-Suspended Diamond-Cut Glass Wall Lantern",
    sku: "SGE-WL-089",
    quantity: 1,
    price: 6000,
  }],
};

const savedQuote = {
  id: "quote-1",
  quote_number: "SGE-2026-0001",
  inquiry_id: inquiry.id,
  customer_name: inquiry.customer_name,
  customer_email: inquiry.customer_email,
  customer_phone: inquiry.customer_phone,
  items: [{
    product_id: "wall", name: inquiry.items[0].name, sku: "SGE-WL-089",
    quantity: 2, unit_price: 6500, line_total: 13000,
  }],
  subtotal: 13000,
  discount: 500,
  shipping: 1000,
  tax_rate: 0,
  tax_amount: 0,
  total: 13500,
  valid_until: "2026-10-01",
  validity_days: 15,
  terms: "",
  notes: "",
  created_at: "2026-09-16T08:30:00+00:00",
};

beforeEach(() => {
  mockApi.adminProductsExport.mockResolvedValue([]);
  mockApi.listStandaloneQuotations.mockResolvedValue([]);
  MockJsPDF.mockImplementation(() => mockPdfDocument());
  mockApi.listInquiryQuotations.mockResolvedValue([]);
  mockApi.createInquiryQuotation.mockResolvedValue(savedQuote);
  mockPdfSave.mockClear();
});

test("prefills the inquiry and saves edited quotation values", async () => {
  render(<InquiryQuotationBuilder inquiry={inquiry} onClose={jest.fn()} onSaved={jest.fn()} />);
  await screen.findByText("No saved quotations yet.");
  expect(screen.getByLabelText("Customer name")).toHaveValue("Kishor A Lalwani");
  expect(screen.getByLabelText("Product 1")).toHaveValue(inquiry.items[0].name);
  expect(screen.getByTestId("quotation-grand-total")).toHaveTextContent("₹6,000");

  fireEvent.change(screen.getByLabelText("Quantity 1"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Unit price 1"), { target: { value: "6500" } });
  fireEvent.change(screen.getByLabelText("Discount"), { target: { value: "500" } });
  fireEvent.change(screen.getByLabelText("Freight or other charges"), { target: { value: "1000" } });
  fireEvent.change(screen.getByLabelText("Billing address"), { target: { value: "Raniwala Market, Firozabad" } });
  fireEvent.change(screen.getByLabelText("Customer GSTIN"), { target: { value: "09adcfS9258d1zs" } });
  fireEvent.click(screen.getByTestId("quotation-save"));

  await waitFor(() => expect(mockApi.createInquiryQuotation).toHaveBeenCalledTimes(1));
  expect(mockApi.createInquiryQuotation).toHaveBeenCalledWith("inq-kishor", expect.objectContaining({
    discount: 500,
    shipping: 1000,
    billing_address: "Raniwala Market, Firozabad",
    customer_gstin: "09ADCFS9258D1ZS",
    items: [expect.objectContaining({ quantity: 2, unit_price: 6500, sku: "SGE-WL-089" })],
  }));
  expect(await screen.findByText("SGE-2026-0001")).toBeInTheDocument();
});

test("downloads a branded PDF from the saved quotation snapshot", async () => {
  mockApi.listInquiryQuotations.mockResolvedValue([savedQuote]);
  render(<InquiryQuotationBuilder inquiry={inquiry} onClose={jest.fn()} />);
  const historyNumber = await screen.findByText("SGE-2026-0001");
  const historyCard = historyNumber.closest("div.border");
  fireEvent.click(historyCard.querySelector("button"));
  await waitFor(() => expect(mockPdfSave).toHaveBeenCalledWith("SGE-2026-0001.pdf"));
});


test("creates a standalone quotation with a custom item without creating an inquiry", async () => {
  mockApi.createStandaloneQuotation.mockResolvedValue(savedQuote);
  render(<InquiryQuotationBuilder onClose={jest.fn()} />);
  await screen.findByText("No saved quotations yet.");
  fireEvent.change(screen.getByLabelText("Customer name"), { target: { value: "Walk-in customer" } });
  fireEvent.click(screen.getByText("+ Add custom item"));
  fireEvent.change(screen.getByLabelText("Product 1"), { target: { value: "Custom glass shade" } });
  fireEvent.change(screen.getByLabelText("Unit price 1"), { target: { value: "200" } });
  fireEvent.click(screen.getByTestId("quotation-save"));
  await waitFor(() => expect(mockApi.createStandaloneQuotation).toHaveBeenCalledWith(expect.objectContaining({
    customer_name: "Walk-in customer", items: [expect.objectContaining({ name: "Custom glass shade", unit_price: 200 })],
  })));
});

test("adds a catalogue SKU to a standalone quote", async () => {
  mockApi.adminProductsExport.mockResolvedValue([{ id: "shade", sku: "SGE-HL-001", name: "Glass shade", price: 900 }]);
  render(<InquiryQuotationBuilder onClose={jest.fn()} />);
  await screen.findByText("No saved quotations yet.");
  fireEvent.change(screen.getByLabelText("Search catalogue for quotation"), { target: { value: "SGE-HL-001" } });
  fireEvent.click(await screen.findByRole("button", { name: "SGE-HL-001 · Glass shade" }));
  expect(screen.getByLabelText("Product 1")).toHaveValue("Glass shade");
  expect(screen.getByLabelText("Unit price 1")).toHaveValue(900);
});
