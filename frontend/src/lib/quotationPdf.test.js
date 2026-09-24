import fs from "fs";
import path from "path";
import { createQuotationPdf, quotationDefaultTerms, quotationPdfText, quotationReferenceCodesForItem, quotationSummaryRows } from "./quotationPdf";

const items = [
  ["Noorjharokha Chain-Suspended Diamond-Cut Glass Wall Lantern", "SGE-WL-089", 1, 6000],
  ["Rajwada Diamond-Cut Hurricane Candle Stand - Cobalt Blue", "SGE-CS-014", 1, 1700],
  ["Rajwada Diamond-Cut Hurricane Candle Stand - Clear", "SGE-CS-013", 2, 1700],
  ["Rajwada Diamond-Cut Hurricane Candle Stand - Emerald", "SGE-CS-012", 1, 1700],
  ["Rajwada Diamond-Cut Hurricane Candle Stand - Ruby Red", "SGE-CS-010", 1, 1700],
  ["Rajwada Diamond-Cut Hurricane Candle Stand - Amber", "SGE-CS-009", 1, 1700],
  ["Phoolwari Etched Floral Dome Ceiling Light", "SGE-CL-001", 1, 3500],
].map(([name, sku, quantity, unitPrice]) => ({
  name, sku, quantity, unit_price: unitPrice, line_total: quantity * unitPrice,
  image: `/products/${sku}.jpeg`,
}));

test("omits nil commercial rows while retaining non-zero taxes", () => {
  const rows = quotationSummaryRows({ subtotal: 10000, discount: 0, shipping: 0, tax_rate: 18, tax_amount: 1800 });
  expect(rows.map((row) => row.label)).toEqual(["Taxable Amount", "Taxes (18.00%)"]);
});

test("prints discount and freight only when they have a value", () => {
  const rows = quotationSummaryRows({ subtotal: 10000, discount: 500, shipping: 750, tax_rate: 0, tax_amount: 0 });
  expect(rows.map((row) => row.label)).toEqual([
    "Products Subtotal",
    "Discount",
    "Freight / Other Charges",
    "Taxable Amount",
  ]);
  expect(rows.map((row) => row.value)).toEqual([10000, -500, 750, 10250]);
});

test("explains freight included in a taxable quotation without double counting it", () => {
  const quote = { subtotal: 28000, discount: 0, shipping: 2000, tax_rate: 18, tax_amount: 5400, total: 35400 };
  expect(quotationSummaryRows(quote).map(({ label, value }) => [label, value])).toEqual([
    ["Products Subtotal", 28000],
    ["Freight / Other Charges", 2000],
    ["Taxable Amount", 30000],
    ["Taxes (18.00%)", 5400],
  ]);
  expect(quotationDefaultTerms(quote)).toContain("Freight / other charges of INR 2,000.00 are included in the quotation total.");
});

test("describes the actual GST treatment in default terms", () => {
  expect(quotationDefaultTerms({ tax_rate: 18, tax_amount: 1800 })[0])
    .toBe("GST is charged separately at 18.00% as shown above.");
  expect(quotationDefaultTerms({ tax_rate: 0, tax_amount: 0 })[0])
    .toBe("No GST has been added to this quotation.");
});

test("normalises PDF-incompatible dash characters without joining words", () => {
  expect(quotationPdfText("Six\u2011Light Star\u2011Etched globe\u2011to\u2011teardrop"))
    .toBe("Six-Light Star-Etched globe-to-teardrop");
});

test("renders the complete commercial quotation as a single A4 page", async () => {
  const logo = fs.readFileSync(path.join(process.cwd(), "public/logo.jpeg")).toString("base64");
  const { doc, filename } = await createQuotationPdf({
    quote_number: "SGE-2026-0041",
    created_at: "2026-09-16T10:10:00+05:30",
    customer_name: "Kiishor A Lalwani",
    customer_phone: "+919820700130",
    customer_email: "kiishoralalwani09@gmail.com",
    billing_address: "Ushakiran Furniture Studio\nIX/165-1, Mission Quarters\nTrichur",
    shipping_address: "Same as Billing Address",
    customer_gstin: "32AJKPP5035F1ZD",
    items,
    subtotal: 19700,
    discount: 0,
    shipping: 0,
    tax_rate: 18,
    tax_amount: 3546,
    total: 23246,
    valid_until: "2026-10-01",
    terms: "",
    notes: "",
    signature_url: "/api/files/signature.png",
    stamp_url: "/api/files/stamp.png",
  }, {
    logoDataUrl: `data:image/jpeg;base64,${logo}`,
    productImageDataUrls: Object.fromEntries(items.map((item) => [item.image, `data:image/jpeg;base64,${logo}`])),
    signatureDataUrl: `data:image/jpeg;base64,${logo}`,
    stampDataUrl: `data:image/jpeg;base64,${logo}`,
  });

  expect(filename).toBe("SGE-2026-0041.pdf");
  expect(doc.getNumberOfPages()).toBe(1);
  const output = Buffer.from(doc.output("arraybuffer"));
  expect(output.length).toBeGreaterThan(20000);
  if (process.env.QUOTATION_PDF_OUTPUT) {
    fs.writeFileSync(process.env.QUOTATION_PDF_OUTPUT, output);
  }
});

test("adds a deterministic design-reference schedule for linked custom products", async () => {
  const logo = fs.readFileSync(path.join(process.cwd(), "public/logo.jpeg")).toString("base64");
  const linkedItems = [
    {
      line_id: "chandelier", name: "Six-Light Crystal Chandelier", quantity: 1,
      unit_price: 28000, line_total: 28000, image: "/products/chandelier.jpeg",
      is_custom: true, body_basis: "product", matching_components: [],
    },
    {
      line_id: "wall-light", name: "Matching Crystal Glass Wall Light", quantity: 2,
      unit_price: 9000, line_total: 18000, image: null, is_custom: true,
      body_basis: "match_item", body_reference_line_id: "chandelier",
      matching_components: ["glass_arms", "crystal_bobeche", "crystal_drops", "metal_finish"],
      approval_required: true,
    },
  ];
  const designReferences = [{
    id: "shade-reference", code: "SD-01", category: "shade_design",
    title: "Hand-cut starburst glass-shade design", image: "/references/shade.jpeg",
    applies_to: ["chandelier", "wall-light"],
    use_details: "Use the starburst motifs and lower radiating cuts.",
    exclude_details: "Do not copy the swan body, wall plate or metalwork.",
  }];

  expect(quotationReferenceCodesForItem({ design_references: designReferences }, linkedItems[1])).toEqual(["SD-01"]);
  const { doc } = await createQuotationPdf({
    quote_number: "SGE-2026-0042", created_at: "2026-09-24T10:10:00+05:30",
    customer_name: "Sample Client", customer_phone: "+919999999999",
    billing_address: "Firozabad", shipping_address: "Same as Billing Address",
    items: linkedItems, design_references: designReferences,
    subtotal: 46000, discount: 0, shipping: 0, tax_rate: 0, tax_amount: 0,
    total: 46000, valid_until: "2026-10-09", terms: "", notes: "",
  }, {
    logoDataUrl: `data:image/jpeg;base64,${logo}`,
    productImageDataUrls: {
      "/products/chandelier.jpeg": `data:image/jpeg;base64,${logo}`,
      "/references/shade.jpeg": `data:image/jpeg;base64,${logo}`,
    },
    signatureDataUrl: null,
    stampDataUrl: null,
  });

  expect(doc.getNumberOfPages()).toBe(2);
  const output = Buffer.from(doc.output("arraybuffer"));
  expect(output.length).toBeGreaterThan(20000);
  if (process.env.QUOTATION_REFERENCE_PDF_OUTPUT) {
    fs.writeFileSync(process.env.QUOTATION_REFERENCE_PDF_OUTPUT, output);
  }
});
