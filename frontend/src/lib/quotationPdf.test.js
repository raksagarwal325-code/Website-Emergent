import fs from "fs";
import path from "path";
import { CUSTOM_PRODUCT_NOTE, clientFacingItemCustomisationText, clientFacingQuotationText, createQuotationPdf, mergeDesignReferencesForPdf, quotationCustomisationScheduleText, quotationDefaultTerms, quotationItemCustomParts, quotationPdfText, quotationReferenceCodesForItem, quotationSummaryRows, quotationTermsForPdf, planQuotationRowPages } from "./quotationPdf";

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

test("uses freight wording that matches each commercial case", () => {
  expect(quotationDefaultTerms({ freight_mode: "included_in_price", shipping: 0, tax_mode: "gst", tax_rate: 18, tax_amount: 1800 }))
    .toContain("Freight is included in the quoted product prices; no separate freight amount is payable.");
  expect(quotationDefaultTerms({ freight_mode: "payable_by_client", shipping: 0, tax_mode: "gst", tax_rate: 18, tax_amount: 1800 }))
    .toContain("Freight is payable separately by the client directly to the transporter and is not included in the quotation total.");
  const billed = { freight_mode: "added_to_bill", shipping: 750, tax_mode: "gst", subtotal: 10000, discount: 0, tax_rate: 18, tax_amount: 1935 };
  expect(quotationDefaultTerms(billed)).toContain("Freight of INR 750.00 is added separately to this quotation and included in the taxable value for GST.");
  expect(quotationSummaryRows(billed).map((row) => row.label)).toEqual(["Products Subtotal", "Freight (Taxable)", "Taxable Amount", "Taxes (18.00%)"]);
});

test("without-tax quotations omit tax wording and use a neutral amount label", () => {
  const quote = { freight_mode: "payable_by_client", shipping: 0, tax_mode: "no_tax", subtotal: 10000, discount: 0, tax_rate: 0, tax_amount: 0 };
  expect(quotationDefaultTerms(quote).join(" ")).not.toMatch(/GST|tax rate|No GST/i);
  expect(quotationSummaryRows(quote).map((row) => row.label)).toEqual(["Quotation Amount"]);
});

test("always adds the unboxing-video breakage condition, including custom terms", () => {
  const required = /continuous unboxing video.*48 hours/i;
  expect(quotationDefaultTerms({}).join(" ")).toMatch(required);
  expect(quotationTermsForPdf({ terms: "50% advance.\nDispatch after balance payment." }).join(" ")).toMatch(required);
  expect(quotationTermsForPdf({ terms: "Replacement only with unboxing video." }).filter((term) => /unboxing video/i.test(term))).toHaveLength(1);
});

test("normalises PDF-incompatible dash characters without joining words", () => {
  expect(quotationPdfText("Six\u2011Light Star\u2011Etched globe\u2011to\u2011teardrop"))
    .toBe("Six-Light Star-Etched globe-to-teardrop");
  expect(quotationPdfText("Firozabad -283203")).toBe("Firozabad - 283203");
});

test("replaces internal line IDs with customer-facing item numbers", () => {
  const quote = { items: [{ line_id: "line-secret-one" }, { line_id: "line-secret-two" }] };
  expect(clientFacingQuotationText(quote, "Match line-secret-one; prepare line-secret-two."))
    .toBe("Match Item 1; prepare Item 2.");
});

test("repairs an older multi-unit customisation that says produce one", () => {
  const quote = { items: [{ line_id: "line-chandelier" }, { line_id: "line-wall", quantity: 2 }] };
  const item = { line_id: "line-wall", quantity: 2, customisation_notes: "Produce one wall light to match line-chandelier." };
  expect(clientFacingItemCustomisationText(quote, item))
    .toBe("Quantity: 2 identical units. Produce a wall light to match Item 1.");
});

test("keeps commercial particulars compact and reserves full specifications for the schedule", () => {
  const quote = { items: [{ line_id: "basket", quantity: 2 }] };
  const item = {
    line_id: "basket", quantity: 2, is_custom: true, body_basis: "drawing_pending",
    customisation_notes: "Quantity: 2 identical units. Each approximately 3 ft diameter x 2-2.5 ft high with single-step construction.",
  };
  expect(quotationItemCustomParts(quote, item, [])).toEqual(["Customised - see Customisation Schedule"]);
  expect(quotationCustomisationScheduleText(quote, item)).toBe(
    "Quantity: 2 identical units. Each approximately 3 ft diameter x 2-2.5 ft high with single-step construction.",
  );
  expect(quotationItemCustomParts(quote, { ...item, customisation_notes: "" }, [])).toEqual([
    "Customised - see Customisation Schedule",
  ]);
  expect(CUSTOM_PRODUCT_NOTE).toContain("Finished product photographs will be shared after completion and before dispatch.");
  expect(CUSTOM_PRODUCT_NOTE).not.toMatch(/approval.*before production|drawing pending/i);
});

test("renders written custom specifications without requiring a reference image", async () => {
  const logo = fs.readFileSync(path.join(process.cwd(), "public/logo.jpeg")).toString("base64");
  const customItems = [
    {
      line_id: "line-a7f1", name: "Crystal Basket Chandelier - Approx. 6 ft Diameter x 8 ft Height",
      quantity: 1, unit_price: 250000, line_total: 250000, image: "/api/files/large.webp",
    },
    {
      line_id: "line-b8e2", name: "Crystal Basket Chandelier - Two-Step, Approx. 3 ft Diameter x 3-3.5 ft Height",
      quantity: 1, unit_price: 54000, line_total: 54000, image: "/api/files/two-step.webp", is_custom: true,
      customisation_notes: "Custom size: approximately 3 ft diameter x 3-3.5 ft overall height. Retain the two-step basket profile, crystal arrangement, finish and overall design character shown in the product image.",
    },
    {
      line_id: "line-c9d3", name: "Single-Step Crystal Basket Chandelier - Approx. 3 ft Diameter x 2-2.5 ft Height",
      quantity: 2, unit_price: 42000, line_total: 84000, image: "/api/files/single-step.webp", is_custom: true,
      customisation_notes: "Quantity: 2 identical units. Each approximately 3 ft diameter x 2-2.5 ft overall height with single-step construction. Retain the basket profile, crystal arrangement, finish and overall design character shown in the product image.",
    },
  ];
  const { doc } = await createQuotationPdf({
    quote_number: "SGE-2026-TEST", created_at: "2026-09-25T10:10:00+05:30",
    customer_name: "Sample Client", customer_phone: "+919999999999",
    billing_address: "Kamptee, Maharashtra", shipping_address: "Same as Billing Address",
    items: customItems, design_references: [], subtotal: 388000, discount: 0, shipping: 0,
    tax_rate: 18, tax_amount: 69840, total: 457840, valid_until: "2026-10-10", terms: "", notes: "",
  }, {
    logoDataUrl: `data:image/jpeg;base64,${logo}`,
    productImageDataUrls: Object.fromEntries(customItems.map((item) => [item.image, `data:image/jpeg;base64,${logo}`])),
    signatureDataUrl: null,
    stampDataUrl: null,
  });
  expect(doc.getNumberOfPages()).toBe(2);
  const output = Buffer.from(doc.output("arraybuffer"));
  expect(output.length).toBeGreaterThan(20000);
  if (process.env.QUOTATION_CUSTOM_PDF_OUTPUT) fs.writeFileSync(process.env.QUOTATION_CUSTOM_PDF_OUTPUT, output);
});

test("keeps all commercial rows on the first page when their measured height fits", () => {
  expect(planQuotationRowPages({
    rowHeights: Array(8).fill(14),
    firstPageStart: 86.5,
    continuationStart: 40.5,
    closingHeight: 84,
    pageBottom: 286,
  })).toEqual([[0, 1, 2, 3, 4, 5, 6, 7]]);
});

test("moves only the smallest necessary commercial suffix to a continuation page", () => {
  expect(planQuotationRowPages({
    rowHeights: Array(8).fill(15),
    firstPageStart: 86.5,
    continuationStart: 40.5,
    closingHeight: 84,
    pageBottom: 286,
  })).toEqual([[0, 1, 2, 3, 4, 5, 6], [7]]);
});

test("balances eight custom items across two schedule pages without adding a reference-only page", async () => {
  const denseItems = Array.from({ length: 8 }, (_, index) => ({
    line_id: `custom-${index + 1}`,
    name: `Custom Product ${index + 1} with Confirmed Construction and Finish`,
    quantity: 1,
    unit_price: 10000,
    line_total: 10000,
    is_custom: true,
    customisation_notes: `Produce one unit of Item ${index + 1}. Retain the confirmed body construction, decorative details and finish shown in the selected product image. Apply only the explicitly requested custom change for this item.`,
  }));
  const { doc } = await createQuotationPdf({
    quote_number: "SGE-2026-DENSE", created_at: "2026-09-25T10:10:00+05:30",
    customer_name: "Sample Client", customer_phone: "+919999999999",
    billing_address: "Firozabad -283203", shipping_address: "Same as Billing Address",
    items: denseItems,
    design_references: [{
      id: "shade-reference", code: "SD-01", category: "shade_design",
      title: "Frosted star-cut shade", image: "/references/shade.jpeg",
      applies_to: ["custom-1", "custom-2"],
      use_details: "Use the confirmed frosted star-cut shade pattern.",
      exclude_details: "Do not copy the reference body or metalwork.",
    }],
    subtotal: 80000, discount: 0, shipping: 0,
    tax_rate: 18, tax_amount: 14400, total: 94400, valid_until: "2026-10-10", terms: "", notes: "",
  }, { signatureDataUrl: null, stampDataUrl: null });

  expect(doc.getNumberOfPages()).toBe(3);
  const output = Buffer.from(doc.output("arraybuffer"));
  expect(output.length).toBeGreaterThan(10000);
  if (process.env.QUOTATION_DENSE_PDF_OUTPUT) fs.writeFileSync(process.env.QUOTATION_DENSE_PDF_OUTPUT, output);
});

test("fits the detailed eight-item quotation into one commercial page and two measured schedule pages", async () => {
  const names = [
    "Shahi Six-Light Crystal Chandelier with Frosted Starburst Globe Glass Shades",
    "Single Wall Light Matching Shahi Chandelier - Custom Frosted Starburst Globe Shade",
    "Single Wall Light - Fabric Shade - Existing Metal Finish Retained",
    "Crystal Basket Chandelier with Glass Shades - Approx. 6 ft Dia x 8 ft H",
    "Himkamal Crystal Basket Chandelier with Frosted Tulip Glass Shades - 2-Step - Gold Finish - Approx. 3 ft Dia x 3-3.5 ft H",
    "Himkamal Crystal Basket Chandelier with Frosted Tulip Glass Shades - 1-Step - Gold Finish - Approx. 3 ft Dia x 2-2.5 ft H",
    "Ring Globe Pendant - 3-Light Cluster",
    "Crystal Pedestal Side Table with Fringe - Gold Finish",
  ];
  const detailedItems = names.map((name, index) => ({
    line_id: `item-${index + 1}`, name, quantity: index === 1 ? 2 : index === 2 ? 4 : 1,
    sku: index === 0 ? "SGE-CH-015" : [4, 5].includes(index) ? "SGE-CH-046" : "",
    unit_price: [36000, 6500, 2000, 250000, 54000, 42000, 9000, 75000][index],
    line_total: [36000, 13000, 8000, 250000, 54000, 42000, 9000, 75000][index],
    is_custom: true,
    body_basis: index === 1 ? "match_item" : "product",
    body_reference_line_id: index === 1 ? "item-1" : null,
    customisation_notes: `Retain the selected product image as the complete base design for Item ${index + 1}. Apply only the confirmed custom change written for this item, while preserving every unspecified visible construction, finish and decorative detail without inventing measurements or materials.`,
  }));
  const { doc } = await createQuotationPdf({
    quote_number: "SGE-2026-COMPACT", created_at: "2026-09-25T15:30:00+05:30",
    customer_name: "Sample Client", customer_phone: "+919999999999",
    billing_address: "Firozabad", shipping_address: "Raniwala Market\nFirozabad -283203",
    items: detailedItems,
    design_references: [{
      id: "shade-reference", code: "SD-01", category: "shade_design",
      title: "Frosted globe shade with etched starbursts and bottom fan cut",
      image: "/references/shade.jpeg", applies_to: ["item-1", "item-2"],
      use_details: "Use the frosted globe and confirmed etched starburst and bottom fan/leaf cut pattern.",
      exclude_details: "Do not copy the reference body, wall plate, arm, hanging hardware, holder or finish.",
    }],
    subtotal: 487000, discount: 0, shipping: 0, tax_rate: 18, tax_amount: 87660,
    total: 574660, valid_until: "2026-10-10", terms: "", notes: "",
  }, { signatureDataUrl: null, stampDataUrl: null });

  expect(doc.getNumberOfPages()).toBe(3);
  const output = Buffer.from(doc.output("arraybuffer"));
  expect(output.length).toBeGreaterThan(10000);
  if (process.env.QUOTATION_COMPACT_PDF_OUTPUT) fs.writeFileSync(process.env.QUOTATION_COMPACT_PDF_OUTPUT, output);
});

test("merges repeated copies of the same design-reference image", () => {
  const result = mergeDesignReferencesForPdf([
    { code: "SD-01", category: "shade_design", image: "/a.jpeg", applies_to: ["one"], title: "Shade", use_details: "Use stars." },
    { code: "SD-02", category: "shade_design", image: "/b.jpeg", applies_to: ["two"], title: "Detailed star-cut shade", use_details: "Use frosted glass with scattered star cuts." },
  ], ["data:image/jpeg;base64,SAME", "data:image/jpeg;base64,SAME"]);

  expect(result.references).toHaveLength(1);
  expect(result.references[0]).toEqual(expect.objectContaining({
    code: "SD-01", title: "Detailed star-cut shade",
    applies_to: ["one", "two"], use_details: "Use frosted glass with scattered star cuts.",
  }));
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
