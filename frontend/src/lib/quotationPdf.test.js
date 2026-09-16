import fs from "fs";
import path from "path";
import { createQuotationPdf } from "./quotationPdf";

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
}));

test("renders the complete commercial quotation as a single A4 page", async () => {
  const logo = fs.readFileSync(path.join(process.cwd(), "public/logo.jpeg")).toString("base64");
  const { doc, filename } = await createQuotationPdf({
    quote_number: "SGE-Q-20260916-23EC13",
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
    tax_rate: 0,
    tax_amount: 0,
    total: 19700,
    terms: "",
    notes: "",
  }, { logoDataUrl: `data:image/jpeg;base64,${logo}` });

  expect(filename).toBe("SGE-Q-20260916-23EC13.pdf");
  expect(doc.getNumberOfPages()).toBe(1);
  const output = Buffer.from(doc.output("arraybuffer"));
  expect(output.length).toBeGreaterThan(20000);
  if (process.env.QUOTATION_PDF_OUTPUT) {
    fs.writeFileSync(process.env.QUOTATION_PDF_OUTPUT, output);
  }
});

