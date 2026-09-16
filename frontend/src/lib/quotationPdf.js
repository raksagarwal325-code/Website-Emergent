import jsPDF from "jspdf";
import COMPANY from "../constants/quotationBusiness.json";

const MAROON = [112, 18, 35];
const CREAM = [255, 250, 232];
const PALE_CREAM = [255, 246, 220];
const INK = [66, 35, 35];

const DEFAULT_TERMS = [
  "Prices are inclusive/exclusive of GST as mentioned above.",
  "Delivery timeline will be confirmed upon order confirmation.",
  "Freight will be payable at actuals, if applicable.",
  "Goods once sold will not be taken back.",
  "Subject to Firozabad jurisdiction only.",
];

export const quoteMoney = (value) => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let logoDataPromise;
const productImagePromises = new Map();
const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const loadLogoData = async () => {
  if (process.env.NODE_ENV === "test") return null;
  if (!logoDataPromise) {
    logoDataPromise = fetch("/logo.jpeg")
      .then((response) => {
        if (!response.ok) throw new Error("Quotation logo could not be loaded");
        return response.blob();
      })
      .then(blobToDataUrl)
      .catch(() => null);
  }
  return logoDataPromise;
};

const loadProductImageData = async (url) => {
  if (!url || process.env.NODE_ENV === "test") return null;
  if (!productImagePromises.has(url)) {
    productImagePromises.set(url, fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Quotation product image could not be loaded");
        return response.blob();
      })
      .then(blobToDataUrl)
      .catch(() => null));
  }
  return productImagePromises.get(url);
};

const imageFormat = (dataUrl) => {
  const match = String(dataUrl || "").match(/^data:image\/(png|jpe?g|webp)/i);
  if (!match) return "JPEG";
  return match[1].toLowerCase() === "png" ? "PNG"
    : match[1].toLowerCase() === "webp" ? "WEBP" : "JPEG";
};

const dateText = (value) => new Date(value).toLocaleDateString("en-IN");

export const quotationSummaryRows = (quote) => {
  const rows = [{ label: "Taxable Amount", value: quote.subtotal - quote.discount + quote.shipping, bold: true }];
  if (Number(quote.discount) > 0) rows.push({ label: "Discount", value: quote.discount });
  if (Number(quote.shipping) > 0) rows.push({ label: "Freight / Other Charges", value: quote.shipping });
  if (Number(quote.tax_rate) > 0 && Number(quote.tax_amount) > 0) {
    rows.push({ label: `Taxes (${quoteMoney(quote.tax_rate)}%)`, value: quote.tax_amount });
  }
  return rows;
};

export const createQuotationPdf = async (quote, options = {}) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const inner = 10;
  const usable = pageWidth - inner * 2;
  const logoData = options.logoDataUrl === undefined ? await loadLogoData() : options.logoDataUrl;
  const productImageData = await Promise.all(quote.items.map(async (item) => {
    if (options.productImageDataUrls && Object.prototype.hasOwnProperty.call(options.productImageDataUrls, item.image)) {
      return options.productImageDataUrls[item.image];
    }
    return loadProductImageData(item.image);
  }));
  const [signatureData, stampData] = await Promise.all([
    options.signatureDataUrl === undefined ? loadProductImageData(quote.signature_url) : options.signatureDataUrl,
    options.stampDataUrl === undefined ? loadProductImageData(quote.stamp_url) : options.stampDataUrl,
  ]);

  const setText = (size = 8, style = "normal", colour = INK, family = "helvetica") => {
    doc.setFont(family, style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
  };
  const borderedBox = (x, y, width, height, fill = null, radius = 1.5) => {
    doc.setDrawColor(...MAROON);
    doc.setLineWidth(0.25);
    if (fill) {
      doc.setFillColor(...fill);
      doc.roundedRect(x, y, width, height, radius, radius, "FD");
    } else {
      doc.roundedRect(x, y, width, height, radius, radius, "S");
    }
  };
  const addPageFrame = () => {
    doc.setFillColor(...CREAM);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setDrawColor(...MAROON);
    doc.setLineWidth(0.8);
    doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
    doc.setLineWidth(0.2);
    doc.rect(margin + 2, margin + 2, pageWidth - (margin + 2) * 2, pageHeight - (margin + 2) * 2);
  };
  const sectionTitle = (text, x, y) => {
    setText(8.5, "bold", MAROON, "times");
    doc.text(text, x, y);
  };
  const labelledLine = (label, value, x, y, labelWidth = 24) => {
    setText(6.5, "bold");
    doc.text(label, x, y);
    setText(6.5);
    doc.text(String(value || ""), x + labelWidth, y);
  };

  addPageFrame();

  // Header
  if (logoData) {
    try { doc.addImage(logoData, "JPEG", inner + 3, 14, 27, 27); } catch (_) { /* text header remains */ }
  }
  const titleX = logoData ? inner + 34 : inner + 3;
  setText(15, "bold", MAROON, "times");
  doc.text(COMPANY.name, titleX, 21);
  setText(6.5);
  doc.text(COMPANY.address, titleX, 27);
  doc.text(`GSTIN: ${COMPANY.gstin}`, titleX, 32);
  doc.text(`WhatsApp: ${COMPANY.whatsapp}  |  ${COMPANY.email}`, titleX, 37);
  setText(5.8, "bold", MAROON);
  doc.text("HANDCRAFTED IN FIROZABAD  |  SINCE 1981", titleX, 41);

  setText(13, "bold", MAROON, "times");
  doc.text("QUOTATION", pageWidth - inner - 3, 20, { align: "right" });
  setText(7);
  doc.text(quote.quote_number, pageWidth - inner - 3, 27, { align: "right" });
  doc.text(dateText(quote.created_at), pageWidth - inner - 3, 33, { align: "right" });
  if (quote.valid_until) {
    setText(6.2);
    doc.text(`Valid until ${dateText(quote.valid_until)}`, pageWidth - inner - 3, 38, { align: "right" });
  }

  // Billing and shipping details
  const boxGap = 2;
  const detailWidth = (usable - boxGap) / 2;
  const detailTop = 45;
  const detailHeight = 36;
  borderedBox(inner, detailTop, detailWidth, detailHeight, PALE_CREAM);
  borderedBox(inner + detailWidth + boxGap, detailTop, detailWidth, detailHeight, PALE_CREAM);
  sectionTitle("BILLING DETAILS", inner + 3, detailTop + 6);
  sectionTitle("SHIPPING DETAILS", inner + detailWidth + boxGap + 3, detailTop + 6);

  const billingLines = [
    quote.customer_name,
    ...(doc.splitTextToSize(quote.billing_address || "Address not provided", detailWidth - 7)),
    quote.customer_phone ? `Phone: ${quote.customer_phone}` : "",
    quote.customer_email || "",
    quote.customer_gstin ? `GSTIN: ${quote.customer_gstin}` : "",
  ].filter(Boolean).slice(0, 7);
  setText(6.7);
  doc.text(billingLines, inner + 3, detailTop + 12, { lineHeightFactor: 1.25 });
  const shippingText = quote.shipping_address || "Same as Billing Address";
  doc.text(doc.splitTextToSize(shippingText, detailWidth - 7).slice(0, 6), inner + detailWidth + boxGap + 3, detailTop + 12, { lineHeightFactor: 1.25 });

  // Product table
  let y = detailTop + detailHeight + 4;
  const cols = { serial: inner + 5, image: inner + 12, item: inner + 27, qty: 132, rate: 165, amount: pageWidth - inner - 3 };
  const drawTableHeader = () => {
    doc.setFillColor(...MAROON);
    doc.rect(inner, y, usable, 10, "F");
    setText(7, "bold", [255, 255, 255]);
    doc.text("S. No.", cols.serial, y + 6, { align: "center" });
    doc.text("Product", cols.image, y + 6);
    doc.text("Particulars", cols.item, y + 6);
    doc.text("Qty", cols.qty, y + 6, { align: "right" });
    doc.text("Rate (INR)", cols.rate, y + 6, { align: "right" });
    doc.text("Amount (INR)", cols.amount, y + 6, { align: "right" });
    y += 10;
  };
  drawTableHeader();

  quote.items.forEach((item, index) => {
    const nameLines = doc.splitTextToSize(item.name, 68);
    const rowHeight = Math.max(14, nameLines.length * 3.2 + (item.sku ? 5 : 2));
    if (y + rowHeight > 196) {
      doc.addPage();
      addPageFrame();
      y = 18;
      drawTableHeader();
    }
    setText(7);
    doc.text(String(index + 1), cols.serial, y + 6, { align: "center" });
    if (productImageData[index]) {
      doc.setDrawColor(204, 173, 145);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cols.image, y + 1.5, 11, 11, 0.8, 0.8, "FD");
      try {
        doc.addImage(productImageData[index], imageFormat(productImageData[index]), cols.image + 0.5, y + 2, 10, 10, undefined, "FAST");
      } catch (_) { /* keep the quotation usable if one catalogue image is unsupported */ }
    }
    setText(7.2, "bold");
    doc.text(nameLines, cols.item, y + 5, { lineHeightFactor: 1.05 });
    if (item.sku) {
      setText(6, "normal", [116, 90, 84]);
      doc.text(`SKU ${item.sku}`, cols.item, y + 5 + nameLines.length * 3.2);
    }
    setText(7);
    doc.text(String(item.quantity), cols.qty, y + 6, { align: "right" });
    doc.text(quoteMoney(item.unit_price), cols.rate, y + 6, { align: "right" });
    setText(7, "bold");
    doc.text(quoteMoney(item.line_total), cols.amount, y + 6, { align: "right" });
    y += rowHeight;
    doc.setDrawColor(204, 173, 145);
    doc.setLineWidth(0.15);
    doc.line(inner, y, inner + usable, y);
  });

  // Totals
  y += 3;
  const totalsX = 111;
  const totalsWidth = pageWidth - inner - totalsX;
  const summaryRows = quotationSummaryRows(quote);
  const totalsHeight = summaryRows.length * 8 + 10;
  borderedBox(totalsX, y, totalsWidth, totalsHeight, PALE_CREAM, 0.5);
  const totalLine = (label, value, rowY, bold = false) => {
    setText(7.2, bold ? "bold" : "normal");
    doc.text(label, totalsX + 3, rowY);
    doc.text(value, totalsX + totalsWidth - 3, rowY, { align: "right" });
  };
  let totalY = y + 6;
  summaryRows.forEach((row) => {
    totalLine(row.label, quoteMoney(row.value), totalY, row.bold);
    totalY += 8;
  });
  const payableY = y + totalsHeight - 10;
  doc.setFillColor(...MAROON);
  doc.rect(totalsX, payableY, totalsWidth, 10, "F");
  setText(8, "bold", [255, 255, 255]);
  doc.text("Payable Amount", totalsX + 3, payableY + 6.5);
  doc.text(`INR ${quoteMoney(quote.total)}`, totalsX + totalsWidth - 3, payableY + 6.5, { align: "right" });

  // Bank, terms and signatory panels
  let footerTop = Math.max(y + totalsHeight + 5, 214);
  if (footerTop + 55 > pageHeight - 20) {
    doc.addPage();
    addPageFrame();
    footerTop = 20;
  }
  const footerGap = 2;
  const footerWidth = (usable - footerGap * 2) / 3;
  borderedBox(inner, footerTop, footerWidth, 52, PALE_CREAM);
  borderedBox(inner + footerWidth + footerGap, footerTop, footerWidth, 52, PALE_CREAM);
  borderedBox(inner + (footerWidth + footerGap) * 2, footerTop, footerWidth, 52, PALE_CREAM);

  sectionTitle("BANK DETAILS", inner + 3, footerTop + 7);
  labelledLine("Account Name", COMPANY.name, inner + 3, footerTop + 14, 24);
  labelledLine("Bank Name", COMPANY.bank, inner + 3, footerTop + 20, 24);
  labelledLine("Branch", COMPANY.branch, inner + 3, footerTop + 26, 24);
  labelledLine("Account Type", COMPANY.accountType, inner + 3, footerTop + 32, 24);
  labelledLine("Account Number", COMPANY.accountNumber, inner + 3, footerTop + 38, 24);
  labelledLine("IFSC Code", COMPANY.ifsc, inner + 3, footerTop + 44, 24);

  const termsX = inner + footerWidth + footerGap + 3;
  sectionTitle("TERMS & CONDITIONS", termsX, footerTop + 7);
  const terms = quote.terms ? quote.terms.split(/\n+/).filter(Boolean) : DEFAULT_TERMS;
  setText(5.7);
  let termsY = footerTop + 13;
  terms.slice(0, 5).forEach((term) => {
    const lines = doc.splitTextToSize(`- ${term}`, footerWidth - 6);
    doc.text(lines, termsX, termsY, { lineHeightFactor: 1.08 });
    termsY += lines.length * 2.8 + 1.5;
  });

  const signX = inner + (footerWidth + footerGap) * 2;
  sectionTitle("FOR - SAMRAT GLASS EMPORIUM", signX + 3, footerTop + 7);
  setText(6.5);
  doc.text("For Samrat Glass Emporium", signX + footerWidth / 2, footerTop + 13, { align: "center" });
  if (stampData) {
    try {
      doc.addImage(stampData, imageFormat(stampData), signX + 4, footerTop + 16, 18, 18, undefined, "FAST");
    } catch (_) { /* keep typed authorisation when an uploaded image is unsupported */ }
  }
  if (signatureData) {
    try {
      doc.addImage(signatureData, imageFormat(signatureData), signX + 25, footerTop + 22, 29, 10, undefined, "FAST");
    } catch (_) { /* keep typed authorisation when an uploaded image is unsupported */ }
  }
  doc.setDrawColor(...MAROON);
  doc.line(signX + 8, footerTop + 37, signX + footerWidth - 8, footerTop + 37);
  setText(7, "bold");
  doc.text(COMPANY.signatory, signX + footerWidth / 2, footerTop + 43, { align: "center" });
  setText(6);
  doc.text("Authorised Signatory", signX + footerWidth / 2, footerTop + 48, { align: "center" });

  setText(11, "bold", MAROON, "times");
  doc.text("THANK YOU FOR YOUR BUSINESS!", pageWidth / 2, footerTop + 62, { align: "center" });
  if (quote.notes) {
    setText(6.5);
    doc.text(doc.splitTextToSize(`Notes: ${quote.notes}`, usable - 10).slice(0, 2), pageWidth / 2, footerTop + 69, { align: "center" });
  }

  return { doc, filename: `${quote.quote_number}.pdf` };
};
