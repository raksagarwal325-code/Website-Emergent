import jsPDF from "jspdf";
import { api } from "./api";
import COMPANY from "../constants/quotationBusiness.json";

const NIGHT = [14, 5, 16];
const WINE = [58, 20, 28];
const MAROON = [112, 18, 35];
const GOLD = [212, 175, 55];
const IVORY = [250, 247, 239];
const CREAM = [245, 239, 231];
const INK = [34, 27, 27];
const MUTED = [109, 91, 86];
const LINE = [214, 197, 169];
const FONT_URLS = {
  outfitRegular: "https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4E.ttf",
  outfitBold: "https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4e6yC4E.ttf",
  playfairRegular: "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQ.ttf",
  playfairBold: "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKebukDQ.ttf",
};

export const quoteMoney = (value) => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let logoDataPromise;
let fontDataPromise;
const rawImagePromises = new Map();
const productImagePromises = new Map();
const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const loadFontData = async () => {
  if (process.env.NODE_ENV === "test") return null;
  if (!fontDataPromise) {
    fontDataPromise = Promise.all(Object.values(FONT_URLS).map((url) => fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Quotation font could not be loaded");
        return response.arrayBuffer();
      })
      .then(arrayBufferToBase64)))
      .then(([outfitRegular, outfitBold, playfairRegular, playfairBold]) => ({
        outfitRegular, outfitBold, playfairRegular, playfairBold,
      }))
      .catch(() => null);
  }
  return fontDataPromise;
};

const registerQuotationFonts = (doc, fontData) => {
  if (!fontData) return false;
  try {
    doc.addFileToVFS("Outfit-Regular.ttf", fontData.outfitRegular);
    doc.addFileToVFS("Outfit-SemiBold.ttf", fontData.outfitBold);
    doc.addFileToVFS("PlayfairDisplay-Regular.ttf", fontData.playfairRegular);
    doc.addFileToVFS("PlayfairDisplay-SemiBold.ttf", fontData.playfairBold);
    doc.addFont("Outfit-Regular.ttf", "outfit", "normal");
    doc.addFont("Outfit-SemiBold.ttf", "outfit", "bold");
    doc.addFont("PlayfairDisplay-Regular.ttf", "playfair", "normal");
    doc.addFont("PlayfairDisplay-Regular.ttf", "playfair", "italic");
    doc.addFont("PlayfairDisplay-SemiBold.ttf", "playfair", "bold");
    doc.addFont("PlayfairDisplay-SemiBold.ttf", "playfair", "bolditalic");
    return true;
  } catch (_) {
    return false;
  }
};

const compressProductImage = (dataUrl) => {
  if (!dataUrl || process.env.NODE_ENV === "test" || typeof document === "undefined") return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, 360 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        context.fillStyle = "#000000";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      } catch (_) { resolve(dataUrl); }
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
};

const fetchImageData = (url) => fetch(api.resolveImage(url))
  .then((response) => {
    if (!response.ok) throw new Error("Quotation image could not be loaded");
    return response.blob();
  })
  .then(blobToDataUrl)
  .catch(() => null);

const loadLogoData = async () => {
  if (process.env.NODE_ENV === "test") return null;
  if (!logoDataPromise) logoDataPromise = fetchImageData("/logo.jpeg");
  return logoDataPromise;
};

const loadRawImageData = async (url) => {
  if (!url || process.env.NODE_ENV === "test") return null;
  if (!rawImagePromises.has(url)) rawImagePromises.set(url, fetchImageData(url));
  return rawImagePromises.get(url);
};

const loadProductImageData = async (url) => {
  if (!url || process.env.NODE_ENV === "test") return null;
  if (!productImagePromises.has(url)) {
    productImagePromises.set(url, fetchImageData(url).then(compressProductImage));
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

export const quotationDefaultTerms = (quote) => {
  const hasTax = Number(quote.tax_rate) > 0 && Number(quote.tax_amount) > 0;
  const taxTerm = hasTax
    ? `GST is charged separately at ${quoteMoney(quote.tax_rate)}% as shown above.`
    : "No GST has been added to this quotation.";
  return [
    taxTerm,
    "Delivery timeline will be confirmed upon order confirmation.",
    "Freight will be payable at actuals, if applicable.",
    "Goods once sold will not be taken back.",
    "Subject to Firozabad jurisdiction only.",
  ];
};

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
  const company = { ...COMPANY, ...(quote.business || {}) };
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 9;
  const inner = 11;
  const usable = pageWidth - inner * 2;
  const fontData = options.fontData || await loadFontData();
  const fontsRegistered = registerQuotationFonts(doc, fontData);
  const bodyFamily = fontsRegistered ? "outfit" : "helvetica";
  const displayFamily = fontsRegistered ? "playfair" : "times";
  const logoData = options.logoDataUrl === undefined ? await loadLogoData() : options.logoDataUrl;
  const productImageData = await Promise.all(quote.items.map((item) => {
    if (options.productImageDataUrls && Object.prototype.hasOwnProperty.call(options.productImageDataUrls, item.image)) {
      return options.productImageDataUrls[item.image];
    }
    return loadProductImageData(item.image);
  }));
  const [signatureData, stampData] = await Promise.all([
    options.signatureDataUrl === undefined ? loadRawImageData(quote.signature_url) : options.signatureDataUrl,
    options.stampDataUrl === undefined ? loadRawImageData(quote.stamp_url) : options.stampDataUrl,
  ]);

  const setText = (size = 8, style = "normal", colour = INK, family = bodyFamily) => {
    const resolvedFamily = family === "times" ? displayFamily : family === "helvetica" ? bodyFamily : family;
    doc.setFont(resolvedFamily, style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
  };
  const line = (x1, y1, x2, y2, colour = LINE, width = 0.2) => {
    doc.setDrawColor(...colour);
    doc.setLineWidth(width);
    doc.line(x1, y1, x2, y2);
  };
  const fillRect = (x, y, width, height, colour, radius = 0) => {
    doc.setFillColor(...colour);
    if (radius) doc.roundedRect(x, y, width, height, radius, radius, "F");
    else doc.rect(x, y, width, height, "F");
  };
  const drawPageBase = () => {
    fillRect(0, 0, pageWidth, pageHeight, IVORY);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.35);
    doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
  };
  const addContainedImage = (data, x, y, width, height) => {
    fillRect(x, y, width, height, NIGHT, 0.8);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.18);
    doc.roundedRect(x, y, width, height, 0.8, 0.8, "S");
    if (!data) return;
    try {
      const properties = doc.getImageProperties(data);
      const scale = Math.min((width - 1) / properties.width, (height - 1) / properties.height);
      const imageWidth = properties.width * scale;
      const imageHeight = properties.height * scale;
      doc.addImage(data, imageFormat(data), x + (width - imageWidth) / 2, y + (height - imageHeight) / 2, imageWidth, imageHeight, undefined, "FAST");
    } catch (_) { /* retain the framed placeholder */ }
  };
  const addFreeContainedImage = (data, x, y, width, height) => {
    if (!data) return;
    try {
      const properties = doc.getImageProperties(data);
      const scale = Math.min(width / properties.width, height / properties.height);
      const imageWidth = properties.width * scale;
      const imageHeight = properties.height * scale;
      doc.addImage(data, imageFormat(data), x + (width - imageWidth) / 2, y + (height - imageHeight) / 2, imageWidth, imageHeight, undefined, "FAST");
    } catch (_) { /* typed authorisation remains */ }
  };
  const drawFullHeader = () => {
    fillRect(margin, margin, pageWidth - margin * 2, 34, NIGHT);
    if (logoData) {
      try { doc.addImage(logoData, imageFormat(logoData), inner + 2, 14, 20, 20, undefined, "FAST"); } catch (_) { /* text brand remains */ }
    }
    const titleX = logoData ? inner + 26 : inner + 3;
    setText(15, "bold", [255, 255, 255], "times");
    doc.text(company.name, titleX, 20.5);
    setText(6.2, "normal", [226, 216, 207]);
    doc.text(company.address, titleX, 26);
    doc.text(`GSTIN ${company.gstin}   |   WhatsApp ${company.whatsapp}`, titleX, 30.5);
    setText(6.1, "bold", GOLD);
    doc.text("HANDCRAFTED IN FIROZABAD  |  SINCE 1981", titleX, 35);

    const right = pageWidth - inner - 2;
    setText(14, "bold", [255, 255, 255], "times");
    doc.text("Quotation", right, 19.5, { align: "right" });
    setText(7.2, "bold", GOLD);
    doc.text(quote.quote_number, right, 25, { align: "right" });
    setText(6.2, "normal", [226, 216, 207]);
    doc.text(`Issued ${dateText(quote.created_at)}`, right, 30, { align: "right" });
    if (quote.valid_until) doc.text(`Valid until ${dateText(quote.valid_until)}`, right, 34.5, { align: "right" });
  };
  const drawContinuationHeader = () => {
    fillRect(margin, margin, pageWidth - margin * 2, 18, NIGHT);
    setText(10.5, "bold", [255, 255, 255], "times");
    doc.text(company.name, inner + 2, 20);
    setText(7, "bold", GOLD);
    doc.text(`${quote.quote_number}  |  Continued`, pageWidth - inner - 2, 20, { align: "right" });
  };
  const pageFooter = () => {
    setText(5.5, "normal", MUTED);
    doc.text(`${company.email}  |  ${company.whatsapp}  |  samratglass.com`, pageWidth / 2, pageHeight - 5, { align: "center" });
  };

  drawPageBase();
  drawFullHeader();

  const detailTop = 47;
  const detailHeight = 27;
  fillRect(inner, detailTop, usable, detailHeight, CREAM, 1.5);
  const splitX = inner + usable * 0.56;
  line(splitX, detailTop + 4, splitX, detailTop + detailHeight - 4, LINE, 0.25);
  setText(6.2, "bold", MAROON);
  doc.text("PREPARED FOR", inner + 4, detailTop + 5.5);
  doc.text("DELIVERY DETAILS", splitX + 4, detailTop + 5.5);
  setText(9.5, "bold", INK, "times");
  doc.text(quote.customer_name, inner + 4, detailTop + 11);
  const customerMeta = [quote.customer_phone, quote.customer_email, quote.customer_gstin ? `GSTIN ${quote.customer_gstin}` : ""].filter(Boolean).join("  |  ");
  setText(5.8, "normal", MUTED);
  doc.text(doc.splitTextToSize(customerMeta, usable * 0.53).slice(0, 2), inner + 4, detailTop + 15, { lineHeightFactor: 1.1 });
  setText(6, "normal", INK);
  doc.text(doc.splitTextToSize(quote.billing_address || "Address not provided", usable * 0.53).slice(0, 3), inner + 4, detailTop + 19.5, { lineHeightFactor: 1.08 });
  doc.text(doc.splitTextToSize(quote.shipping_address || "Same as billing address", usable * 0.39).slice(0, 5), splitX + 4, detailTop + 11, { lineHeightFactor: 1.15 });

  let y = detailTop + detailHeight + 4;
  const cols = { serial: inner + 5, image: inner + 12, item: inner + 28, qty: 137, rate: 166, amount: pageWidth - inner - 3 };
  const drawTableHeader = () => {
    fillRect(inner, y, usable, 8.5, WINE);
    setText(6.6, "bold", [255, 255, 255]);
    doc.text("No.", cols.serial, y + 5.5, { align: "center" });
    doc.text("Product", cols.image, y + 5.5);
    doc.text("Particulars", cols.item, y + 5.5);
    doc.text("Qty", cols.qty, y + 5.5, { align: "right" });
    doc.text("Rate (INR)", cols.rate, y + 5.5, { align: "right" });
    doc.text("Amount (INR)", cols.amount, y + 5.5, { align: "right" });
    y += 8.5;
  };
  const startContinuationPage = (withTableHeader = true) => {
    pageFooter();
    doc.addPage();
    drawPageBase();
    drawContinuationHeader();
    y = 32;
    if (withTableHeader) drawTableHeader();
  };
  drawTableHeader();

  quote.items.forEach((item, index) => {
    const nameLines = doc.splitTextToSize(item.name, 68).slice(0, 3);
    const rowHeight = Math.max(13.5, nameLines.length * 3.1 + (item.sku ? 5 : 2));
    if (y + rowHeight > 225) startContinuationPage();
    setText(6.8, "normal", MUTED);
    doc.text(String(index + 1), cols.serial, y + 6.8, { align: "center" });
    addContainedImage(productImageData[index], cols.image, y + 1.3, 10.5, 10.5);
    setText(7.1, "bold", INK, "times");
    doc.text(nameLines, cols.item, y + 4.8, { lineHeightFactor: 1.03 });
    if (item.sku) {
      setText(5.5, "normal", MUTED);
      doc.text(`SKU ${item.sku}`, cols.item, y + 5 + nameLines.length * 3.1);
    }
    setText(7, "normal", INK);
    doc.text(String(item.quantity), cols.qty, y + 6.8, { align: "right" });
    doc.text(quoteMoney(item.unit_price), cols.rate, y + 6.8, { align: "right" });
    setText(7, "bold", INK);
    doc.text(quoteMoney(item.line_total), cols.amount, y + 6.8, { align: "right" });
    y += rowHeight;
    line(inner, y, inner + usable, y, LINE, 0.16);
  });

  const summaryRows = quotationSummaryRows(quote);
  const totalsHeight = summaryRows.length * 6.2 + 9;
  const footerHeight = 45;
  const closingHeight = quote.notes ? 17 : 11;
  if (y + 4 + totalsHeight + 4 + footerHeight + closingHeight > pageHeight - 11) startContinuationPage(false);

  y += 4;
  const totalsX = 112;
  const totalsWidth = pageWidth - inner - totalsX;
  fillRect(totalsX, y, totalsWidth, totalsHeight, CREAM, 1);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.roundedRect(totalsX, y, totalsWidth, totalsHeight, 1, 1, "S");
  let totalY = y + 5.2;
  summaryRows.forEach((row) => {
    setText(6.7, row.bold ? "bold" : "normal", row.bold ? INK : MUTED);
    doc.text(row.label, totalsX + 4, totalY);
    doc.text(quoteMoney(row.value), totalsX + totalsWidth - 4, totalY, { align: "right" });
    totalY += 6.2;
  });
  const payableY = y + totalsHeight - 9;
  fillRect(totalsX, payableY, totalsWidth, 9, WINE);
  setText(7.2, "bold", [255, 255, 255]);
  doc.text("Quotation Total", totalsX + 4, payableY + 5.8);
  setText(8.2, "bold", GOLD, "times");
  doc.text(`INR ${quoteMoney(quote.total)}`, totalsX + totalsWidth - 4, payableY + 5.8, { align: "right" });

  const footerTop = y + totalsHeight + 4;
  fillRect(inner, footerTop, usable, footerHeight, CREAM, 1.5);
  const footerGap = 3;
  const bankWidth = 57;
  const termsWidth = 68;
  const signWidth = usable - bankWidth - termsWidth - footerGap * 2;
  const bankX = inner + 4;
  const termsX = inner + bankWidth + footerGap + 4;
  const signX = inner + bankWidth + termsWidth + footerGap * 2;
  line(inner + bankWidth + footerGap / 2, footerTop + 5, inner + bankWidth + footerGap / 2, footerTop + footerHeight - 5, LINE, 0.25);
  line(signX - footerGap / 2, footerTop + 5, signX - footerGap / 2, footerTop + footerHeight - 5, LINE, 0.25);

  setText(6.4, "bold", MAROON);
  doc.text("BANK DETAILS", bankX, footerTop + 6);
  const bankRows = [
    ["Account", company.name],
    ["Bank", `${company.bank}, ${company.branch} - ${company.accountType}`],
    ["A/C No.", company.accountNumber],
    ["IFSC", company.ifsc],
  ];
  let bankY = footerTop + 12;
  bankRows.forEach(([label, value]) => {
    setText(5.4, "bold", MUTED);
    doc.text(label, bankX, bankY);
    setText(5.7, "normal", INK);
    doc.text(doc.splitTextToSize(value, bankWidth - 19).slice(0, 2), bankX + 14, bankY, { lineHeightFactor: 1.05 });
    bankY += 6.5;
  });

  setText(6.4, "bold", MAROON);
  doc.text("TERMS & CONDITIONS", termsX, footerTop + 6);
  const terms = quote.terms ? quote.terms.split(/\n+/).filter(Boolean) : quotationDefaultTerms(quote);
  setText(5.15, "normal", INK);
  let termsY = footerTop + 11.5;
  terms.slice(0, 5).forEach((term) => {
    const lines = doc.splitTextToSize(`- ${term}`, termsWidth - 8);
    doc.text(lines, termsX, termsY, { lineHeightFactor: 1.02 });
    termsY += lines.length * 2.5 + 1.2;
  });

  const signCenter = signX + signWidth / 2;
  setText(6.4, "bold", MAROON);
  doc.text("AUTHORISED BY", signX + 3, footerTop + 6);
  addFreeContainedImage(stampData, signX + 3, footerTop + 11, 16, 16);
  addFreeContainedImage(signatureData, signX + 19, footerTop + 13, signWidth - 22, 12);
  line(signX + 5, footerTop + 29, signX + signWidth - 5, footerTop + 29, MAROON, 0.25);
  setText(7, "bold", INK, "times");
  doc.text(company.signatory, signCenter, footerTop + 35, { align: "center" });
  setText(5.6, "normal", MUTED);
  doc.text("Authorised Signatory", signCenter, footerTop + 39.5, { align: "center" });

  const closingY = footerTop + footerHeight + 6;
  setText(9.5, "italic", MAROON, "times");
  doc.text("Crafted in Firozabad. Made for your space.", pageWidth / 2, closingY, { align: "center" });
  if (quote.notes) {
    setText(5.8, "normal", MUTED);
    doc.text(doc.splitTextToSize(`Notes: ${quote.notes}`, usable - 15).slice(0, 2), pageWidth / 2, closingY + 5, { align: "center" });
  }
  pageFooter();

  return { doc, filename: `${quote.quote_number}.pdf` };
};
