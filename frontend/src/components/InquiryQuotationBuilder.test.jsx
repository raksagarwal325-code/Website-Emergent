import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockApi = {
  listInquiryQuotations: jest.fn(),
  createInquiryQuotation: jest.fn(),
};
const mockPdfSave = jest.fn();
const mockPdfDocument = () => ({
  internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
  setFillColor: jest.fn(), rect: jest.fn(), setTextColor: jest.fn(),
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
  quote_number: "SGE-Q-20260916-ABCDEF",
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
  fireEvent.click(screen.getByTestId("quotation-save"));

  await waitFor(() => expect(mockApi.createInquiryQuotation).toHaveBeenCalledTimes(1));
  expect(mockApi.createInquiryQuotation).toHaveBeenCalledWith("inq-kishor", expect.objectContaining({
    discount: 500,
    shipping: 1000,
    items: [expect.objectContaining({ quantity: 2, unit_price: 6500, sku: "SGE-WL-089" })],
  }));
  expect(await screen.findByText("SGE-Q-20260916-ABCDEF")).toBeInTheDocument();
});

test("downloads a branded PDF from the saved quotation snapshot", async () => {
  mockApi.listInquiryQuotations.mockResolvedValue([savedQuote]);
  render(<InquiryQuotationBuilder inquiry={inquiry} onClose={jest.fn()} />);
  const historyNumber = await screen.findByText("SGE-Q-20260916-ABCDEF");
  const historyCard = historyNumber.closest("div.border");
  fireEvent.click(historyCard.querySelector("button"));
  expect(mockPdfSave).toHaveBeenCalledWith("SGE-Q-20260916-ABCDEF.pdf");
});
