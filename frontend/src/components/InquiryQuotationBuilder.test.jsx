import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockApi = {
  updateQuotation: jest.fn(),
  deleteQuotation: jest.fn(),
  upload: jest.fn(),
  resolveImage: value => value,
  listInquiryQuotations: jest.fn(),
  adminProductsExport: jest.fn().mockResolvedValue([]),
  listStandaloneQuotations: jest.fn().mockResolvedValue([]),
  createStandaloneQuotation: jest.fn(),
  createInquiryQuotation: jest.fn(),
  aiQuotationCustomisation: jest.fn(),
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
  sessionStorage.clear();
  jest.clearAllMocks();
  mockApi.adminProductsExport.mockResolvedValue([]);
  mockApi.listStandaloneQuotations.mockResolvedValue([]);
  MockJsPDF.mockImplementation(() => mockPdfDocument());
  mockApi.listInquiryQuotations.mockResolvedValue([]);
  mockApi.createInquiryQuotation.mockResolvedValue(savedQuote);
  mockApi.deleteQuotation.mockResolvedValue({ ok: true, deleted: 1, id: savedQuote.id });
  mockPdfSave.mockClear();
});

test("prefills the inquiry and saves edited quotation values", async () => {
  render(<InquiryQuotationBuilder inquiry={inquiry} onClose={jest.fn()} onSaved={jest.fn()} />);
  await screen.findByRole("button", { name: "Saved quotations (0)" });
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
  expect(await screen.findByRole("button", { name: "Saved quotations (1)" })).toBeInTheDocument();
});

test("downloads a branded PDF from the saved quotation snapshot", async () => {
  mockApi.listInquiryQuotations.mockResolvedValue([savedQuote]);
  render(<InquiryQuotationBuilder inquiry={inquiry} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Saved quotations (1)" }));
  const historyNumber = await screen.findByText("SGE-2026-0001");
  const historyCard = historyNumber.closest("article");
  fireEvent.click(historyCard.querySelector("button"));
  await waitFor(() => expect(mockPdfSave).toHaveBeenCalledWith("SGE-2026-0001.pdf"));
});


test("creates a standalone quotation with a custom item without creating an inquiry", async () => {
  mockApi.createStandaloneQuotation.mockResolvedValue(savedQuote);
  render(<InquiryQuotationBuilder onClose={jest.fn()} />);
  await screen.findByRole("button", { name: "Saved quotations (0)" });
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
  await screen.findByRole("button", { name: "Saved quotations (0)" });
  fireEvent.change(screen.getByLabelText("Search catalogue for quotation"), { target: { value: "SGE-HL-001" } });
  fireEvent.click(await screen.findByRole("button", { name: "SGE-HL-001 · Glass shade" }));
  expect(screen.getByLabelText("Product 1")).toHaveValue("Glass shade");
  expect(screen.getByLabelText("Unit price 1")).toHaveValue(900);
});


test("validation errors show readable text and preserve the form after refresh", async () => {
  const { toast } = require("sonner");
  mockApi.createInquiryQuotation.mockRejectedValueOnce({ response: { data: { detail: [
    { loc: ["body", "customer_email"], msg: "Invalid email" }
  ] } } });
  const view = render(<InquiryQuotationBuilder inquiry={inquiry} />);
  await screen.findByRole("button", { name: "Saved quotations (0)" });
  fireEvent.change(screen.getByLabelText("Customer name"), { target: { value: "Retained customer" } });
  fireEvent.click(screen.getByTestId("quotation-save"));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("customer_email: Invalid email"));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  view.unmount();
  render(<InquiryQuotationBuilder inquiry={inquiry} />);
  expect(screen.getByLabelText("Customer name")).toHaveValue("Retained customer");
});

test("reopens a saved quotation and updates the same ID without creating another", async () => {
  mockApi.listStandaloneQuotations.mockResolvedValue([savedQuote]);
  mockApi.updateQuotation.mockResolvedValue({ ...savedQuote, notes: "Revised" });
  const view = render(<InquiryQuotationBuilder />);
  fireEvent.click(await screen.findByRole("button", { name: "Saved quotations (1)" }));
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Unit price 1")).toHaveValue(6500);
  fireEvent.change(screen.getByLabelText("Quotation notes"), { target: { value: "Revised" } });
  fireEvent.click(screen.getByTestId("quotation-save"));
  await waitFor(() => expect(mockApi.updateQuotation).toHaveBeenCalledWith("quote-1", expect.objectContaining({ notes: "Revised" })));
  expect(mockApi.createStandaloneQuotation).not.toHaveBeenCalled();
  view.unmount();
  render(<InquiryQuotationBuilder />);
  expect(screen.getByLabelText("Quotation notes")).toHaveValue("Revised");
  expect(screen.getByTestId("quotation-save")).toHaveTextContent("Save changes");
});

test("uploads a custom item image and saves it in the quotation", async () => {
  mockApi.upload.mockResolvedValue({ url: "/api/files/custom.webp" });
  mockApi.createStandaloneQuotation.mockResolvedValue(savedQuote);
  render(<InquiryQuotationBuilder />);
  await screen.findByRole("button", { name: "Saved quotations (0)" });
  fireEvent.change(screen.getByLabelText("Customer name"), { target: { value: "Customer" } });
  fireEvent.click(screen.getByText("+ Add custom item"));
  fireEvent.change(screen.getByLabelText("Product 1"), { target: { value: "Custom chandelier" } });
  fireEvent.change(screen.getByLabelText("Image for product 1"), { target: { files: [new File(["image"], "custom.webp", { type: "image/webp" })] } });
  await screen.findByAltText("Custom chandelier");
  fireEvent.click(screen.getByTestId("quotation-save"));
  await waitFor(() => expect(mockApi.createStandaloneQuotation).toHaveBeenCalledWith(expect.objectContaining({ items: [expect.objectContaining({ image: "/api/files/custom.webp" })] })));
});

test("lets AI prepare each customised product from one instruction and an optional image", async () => {
  mockApi.upload.mockResolvedValue({ url: "/api/files/ai-shade.webp" });
  mockApi.aiQuotationCustomisation.mockImplementation(async ({ target_line_id }) => ({ draft: target_line_id === "line-one" ? {
    summary: "Chandelier body retained with the requested star-cut shades.",
    reference: { category: "shade_design", title: "Frosted star-cut glass shade", applies_to: ["line-one"], use_details: "Use the frosted star-cut shade pattern.", exclude_details: "Do not copy the swan body or wall plate." },
    item_updates: [{ line_id: "line-one", suggested_name: "Six-Light Chandelier with Custom Star-Cut Shades", body_basis: "product", body_reference_line_id: null, matching_components: [], customisation_notes: "Retain chandelier construction and apply the reference shade pattern.", approval_required: true }],
    warnings: [],
  } : {
    summary: "Wall light construction matched to Item 1.",
    reference: { category: "other", title: "Written matching instruction", applies_to: ["line-two"], use_details: "Match the chandelier construction.", exclude_details: "" },
    item_updates: [{ line_id: "line-two", suggested_name: "Matching Crystal Glass Wall Light", body_basis: "match_item", body_reference_line_id: "line-one", matching_components: ["glass_arms", "crystal_bobeche", "crystal_drops", "metal_finish"], customisation_notes: "Match Item 1 with glass arms, crystal bobeches, crystal drops and coordinated metal finish.", approval_required: true }],
    warnings: [],
  } }));
  mockApi.createStandaloneQuotation.mockImplementation(async (data) => ({ ...savedQuote, ...data, id: "custom-reference-quote" }));
  render(<InquiryQuotationBuilder inquiry={{ customer_name: "Client", items: [
    { line_id: "line-one", name: "Chandelier", price: 28000 },
    { line_id: "line-two", name: "Wall Light", price: 9000 },
  ] }} />);
  await screen.findByRole("button", { name: "Saved quotations (0)" });
  fireEvent.click(screen.getByLabelText("Customise product 1"));
  fireEvent.change(screen.getByLabelText("Reference image for product 1"), { target: { files: [new File(["image"], "shade.webp", { type: "image/webp" })] } });
  await screen.findByAltText("Customisation reference for product 1");
  fireEvent.change(screen.getByLabelText("Customisation instruction for product 1"), { target: { value: "Keep this chandelier body and use the reference shade on every light." } });
  fireEvent.click(screen.getByRole("button", { name: "Prepare with AI" }));
  expect(await screen.findByText("Chandelier body retained with the requested star-cut shades.")).toBeInTheDocument();
  expect(mockApi.aiQuotationCustomisation).toHaveBeenCalledWith(expect.objectContaining({
    image_url: "/api/files/ai-shade.webp",
    target_line_id: "line-one",
    items: [expect.objectContaining({ line_id: "line-one" }), expect.objectContaining({ line_id: "line-two" })],
  }));

  fireEvent.click(screen.getByLabelText("Customise product 2"));
  fireEvent.change(screen.getByLabelText("Customisation instruction for product 2"), { target: { value: "Make this wall light match Item 1 with glass arms, bobeches, drops and finish." } });
  fireEvent.click(screen.getAllByRole("button", { name: "Prepare with AI" })[0]);
  expect(await screen.findByText("Wall light construction matched to Item 1.")).toBeInTheDocument();
  expect(mockApi.aiQuotationCustomisation).toHaveBeenLastCalledWith(expect.objectContaining({ image_url: null, target_line_id: "line-two" }));

  expect(screen.getByLabelText("Product 1")).toHaveValue("Six-Light Chandelier with Custom Star-Cut Shades");
  fireEvent.click(screen.getByTestId("quotation-save"));
  await waitFor(() => expect(mockApi.createStandaloneQuotation).toHaveBeenCalledTimes(1));
  const saved = mockApi.createStandaloneQuotation.mock.calls[0][0];
  expect(saved.items[1]).toEqual(expect.objectContaining({ body_basis: "match_item", body_reference_line_id: "line-one", customisation_ai_prepared: true }));
  expect(saved.design_references).toEqual([expect.objectContaining({ image: "/api/files/ai-shade.webp", applies_to: ["line-one"] })]);
});

test("opens quotation history from the sticky header and deletes a saved quotation", async () => {
  mockApi.listStandaloneQuotations.mockResolvedValue([savedQuote]);
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  render(<InquiryQuotationBuilder />);

  fireEvent.click(await screen.findByRole("button", { name: "Saved quotations (1)" }));
  expect(screen.getByRole("heading", { name: "Saved quotations" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete quotation SGE-2026-0001" }));

  await waitFor(() => expect(mockApi.deleteQuotation).toHaveBeenCalledWith("quote-1"));
  expect(await screen.findByText("No saved quotations yet.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Saved quotations (0)" })).toBeInTheDocument();
  confirm.mockRestore();
});
