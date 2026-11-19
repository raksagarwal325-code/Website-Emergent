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

const dateText = (value) => new Date(value).toLocaleDateString("en-IN", {
  day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata",
});
export const PAYMENT_TERM = "50% payment at the time of booking and the remaining 50% before dispatch.";
const percentageText = value => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 4 });
export const quotationAmountInWords = value => {
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Invalid quotation amount");
  const units = ["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const words = n => {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " " + units[n%10] : "");
    for (const [size,label] of [[10000000,"Crore"],[100000,"Lakh"],[1000,"Thousand"],[100,"Hundred"]]) {
      if (n >= size) return words(Math.floor(n/size)) + " " + label + (n%size ? " " + words(n%size) : "");
    }
    return "";
  };
  const rupees = Math.floor(amount/100), paise = amount%100;
  return (words(rupees) + (rupees === 1 ? " Rupee" : " Rupees") +
    (paise ? " and " + words(paise) + (paise === 1 ? " Paisa" : " Paise") : "") + " Only").toUpperCase();
};
export const quotationPdfText = (value) => String(value || "")
  .replace(/[\u2010-\u2015\u2212\u00ad]/g, "-")
  .replace(/\u00a0/g, " ")
  .replace(/\s*-\s*(\d{6})\b/g, " - $1");
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const clientFacingQuotationText = (quote, value) => {
  let text = quotationPdfText(value);
  (quote.items || []).forEach((item, index) => {
    if (!item.line_id) return;
    text = text.replace(new RegExp(escapeRegExp(item.line_id), "gi"), `Item ${index + 1}`);
  });
  return text;
};

export const clientFacingItemCustomisationText = (quote, item) => {
  let text = clientFacingQuotationText(quote, item.customisation_notes);
  const quantity = Number(item.quantity) || 1;
  if (quantity > 1 && /\bproduce one\b/i.test(text)) {
    text = text.replace(/\bproduce one\b/i, "Produce a");
    text = `Quantity: ${quantity} identical units. ${text}`;
  }
  return text;
};

export const CUSTOM_PRODUCT_NOTE = "Customer approval of this quotation confirms the written custom specifications. Product and reference images are visual guides. As each piece is handcrafted, minor variations may occur. Finished product photographs will be shared after completion and before dispatch.";

export const quotationItemCustomParts = (quote, item, designReferences = []) => {
  const referenceCodes = quotationReferenceCodesForItem({ design_references: designReferences }, item);
  const linkedIndex = (quote.items || []).findIndex((candidate) => candidate.line_id === item.body_reference_line_id);
  if (!item.is_custom) return [];
  const parts = ["Customised - see Customisation Schedule"];
  if (item.body_basis === "match_item" && linkedIndex >= 0) parts.push(`Matches Item ${linkedIndex + 1}`);
  if (referenceCodes.length) parts.push(`Reference: ${referenceCodes.join(", ")}`);
  return parts;
};

export const quotationCustomisationScheduleText = (quote, item) => {
  if (item.customisation_notes) return clientFacingItemCustomisationText(quote, item);
  const linkedIndex = (quote.items || []).findIndex((candidate) => candidate.line_id === item.body_reference_line_id);
  const parts = [];
  if (item.body_basis === "match_item" && linkedIndex >= 0) {
    parts.push(`Prepare this product to coordinate with Item ${linkedIndex + 1}.`);
  } else if (item.body_basis === "drawing") {
    parts.push("Prepare this product according to the confirmed drawing and written specifications.");
  } else {
    parts.push("Retain the overall design shown in the product image, subject to the confirmed custom requirements for this item.");
  }
  if ((item.matching_components || []).length) {
    parts.push(`Coordinate ${item.matching_components.map((value) => COMPONENT_LABELS[value] || value).join(", ")}.`);
  }
  return parts.join(" ");
};

const moreDetailedText = (current, candidate) => (
  quotationPdfText(candidate).trim().length > quotationPdfText(current).trim().length ? candidate : current
);

export const mergeDesignReferencesForPdf = (references, imageData) => {
  const merged = [];
  references.forEach((reference, index) => {
    const image = imageData[index] || null;
    const imageKey = image || reference.image || `reference-${index}`;
    const key = `${reference.category || "other"}|${imageKey}`;
    const existing = merged.find((entry) => entry.key === key);
    if (!existing) {
      merged.push({ key, reference: { ...reference, applies_to: [...(reference.applies_to || [])] }, image });
      return;
    }
    existing.reference.applies_to = [...new Set([
      ...(existing.reference.applies_to || []),
      ...(reference.applies_to || []),
    ])];
    existing.reference.title = moreDetailedText(existing.reference.title, reference.title);
    existing.reference.use_details = moreDetailedText(existing.reference.use_details, reference.use_details);
    existing.reference.exclude_details = moreDetailedText(existing.reference.exclude_details, reference.exclude_details);
  });
  return {
    references: merged.map(({ reference }) => reference),
    imageData: merged.map(({ image }) => image),
  };
};
const COMPONENT_LABELS = {
  glass_arms: "glass arm(s)",
  crystal_bobeche: "crystal bobeche",
  crystal_drops: "crystal drops",
  metal_finish: "coordinated metal finish",
};
const CATEGORY_LABELS = {
  shade_design: "Shade design",
  metal_finish: "Metal finish",
  crystal_arrangement: "Crystal arrangement",
  body_design: "Body design",
  dimensions: "Dimensions",
  other: "Design reference",
};

export const quotationReferenceCodesForItem = (quote, item) => (quote.design_references || [])
  .filter((reference) => (reference.applies_to || []).includes(item.line_id))
  .map((reference) => reference.code);

export const quotationDefaultTerms = (quote) => {
  const hasTax = Number(quote.tax_rate) > 0 && Number(quote.tax_amount) > 0;
  const taxTerms = quote.tax_mode === "no_tax"
    ? []
    : [hasTax
      ? `GST is charged separately at ${percentageText(quote.tax_rate)}% as shown above.`
      : "No GST has been added to this quotation."];
  const freightMode = quote.freight_mode || "legacy";
  const freightTerm = freightMode === "included_in_price"
    ? "Freight is included in the quoted product prices; no separate freight amount is payable."
    : freightMode === "payable_by_client"
      ? "Freight is payable separately by the client directly to the transporter and is not included in the quotation total."
      : freightMode === "added_to_bill"
        ? `Freight of INR ${quoteMoney(quote.shipping)} is added separately to this quotation and included in the taxable value for GST.`
        : Number(quote.shipping) > 0
          ? `Freight / other charges of INR ${quoteMoney(quote.shipping)} are included in the quotation total.`
          : "Freight, if applicable, will be confirmed before order confirmation.";
  return [
    PAYMENT_TERM,
    ...taxTerms,
    "Delivery timeline will be confirmed upon order confirmation.",
    freightTerm,
    "Replacement for transit breakage is accepted only when a continuous unboxing video is provided within 48 hours of delivery.",
    "Goods once sold will not be taken back.",
    "Subject to Firozabad jurisdiction only.",
  ];
};

export const quotationTermsForPdf = (quote) => {
  if (!quote.terms) return quotationDefaultTerms(quote);
  const customTerms = quote.terms.split(/\n+/).map((term) => term.trim()).filter(Boolean);
  const hasUnboxingRule = customTerms.some((term) => /unboxing\s+video/i.test(term));
  // Preserve deliberately supplied payment terms instead of creating contradictory conditions.
  const hasPaymentTerms = customTerms.some(term => /\b(advance|booking|payment|balance|deposit)\b/i.test(term));
  return [
    ...(!hasPaymentTerms ? [PAYMENT_TERM] : []),
    ...(!hasUnboxingRule ? ["Replacement for transit breakage is accepted only when a continuous unboxing video is provided within 48 hours of delivery."] : []),
    ...customTerms,
  ];
};

export const quotationSummaryRows = (quote) => {
  const discount = Number(quote.discount) || 0;
  const shipping = Number(quote.shipping) || 0;
  const rows = [];
  if (discount > 0 || shipping > 0) rows.push({ label: "Products Subtotal", value: quote.subtotal });
  if (discount > 0) rows.push({ label: "Discount", value: -discount });
  if (shipping > 0) rows.push({ label: quote.freight_mode === "added_to_bill" ? "Freight (Taxable)" : "Freight / Other Charges", value: shipping });
  rows.push({ label: quote.tax_mode === "no_tax" ? "Quotation Amount" : "Taxable Amount", value: quote.subtotal - discount + shipping, bold: true });
  if (Number(quote.tax_rate) > 0 && Number(quote.tax_amount) > 0) {
    rows.push({ label: `GST (${percentageText(quote.tax_rate)}%)`, value: quote.tax_amount });
  }
  return rows;
};

export const planQuotationRowPages = ({ rowHeights, firstPageStart, continuationStart, closingHeight, pageBottom }) => {
  if (!rowHeights.length) return [[]];
  const pages = [];
  let rowIndex = 0;
  let pageStart = firstPageStart;

  while (rowIndex < rowHeights.length) {
    const remainingHeight = rowHeights.slice(rowIndex).reduce((total, height) => total + height, 0);
    if (pageStart + remainingHeight + closingHeight <= pageBottom) {
      pages.push(rowHeights.map((_, index) => index).slice(rowIndex));
      break;
    }

    const pageRows = [];
    let pageY = pageStart;
    while (rowIndex < rowHeights.length && pageY + rowHeights[rowIndex] <= pageBottom) {
      pageRows.push(rowIndex);
      pageY += rowHeights[rowIndex];
      rowIndex += 1;
    }

    if (closingHeight > 0 && rowIndex === rowHeights.length && pageRows.length > 1) {
      rowIndex -= 1;
      pageRows.pop();
    }
    if (!pageRows.length) {
      pageRows.push(rowIndex);
      rowIndex += 1;
    }
    pages.push(pageRows);
    pageStart = continuationStart;
  }

  return pages;
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
  const rawDesignReferences = Array.isArray(quote.design_references) ? quote.design_references : [];
  const rawReferenceImageData = await Promise.all(rawDesignReferences.map((reference) => {
    if (options.productImageDataUrls && Object.prototype.hasOwnProperty.call(options.productImageDataUrls, reference.image)) {
      return options.productImageDataUrls[reference.image];
    }
    return loadProductImageData(reference.image);
  }));
  const mergedReferences = mergeDesignReferencesForPdf(rawDesignReferences, rawReferenceImageData);
  const designReferences = mergedReferences.references;
  const referenceImageData = mergedReferences.imageData;
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
  const addContainedImage = (data, x, y, width, height, placeholder = []) => {
    fillRect(x, y, width, height, NIGHT, 0.8);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.18);
    doc.roundedRect(x, y, width, height, 0.8, 0.8, "S");
    if (!data) {
      if (placeholder.length) {
        setText(4.1, "bold", GOLD);
        doc.text(placeholder, x + width / 2, y + height / 2 - (placeholder.length - 1) * 1.2, { align: "center", lineHeightFactor: 1.05 });
      }
      return;
    }
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
    line(right - 38, 27, right, 27, GOLD, 0.15);
    setText(6.2, "normal", [226, 216, 207]);
    doc.text("Issued on", right - 38, 31);
    doc.text(dateText(quote.created_at), right, 31, { align: "right" });
    if (quote.valid_until) {
      doc.text("Valid until", right - 38, 35.5);
      doc.text(dateText(quote.valid_until), right, 35.5, { align: "right" });
    }
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
  doc.text(doc.splitTextToSize(quotationPdfText(quote.billing_address || "Address not provided"), usable * 0.53).slice(0, 3), inner + 4, detailTop + 19.5, { lineHeightFactor: 1.08 });
  doc.text(doc.splitTextToSize(quotationPdfText(quote.shipping_address || "Same as billing address"), usable * 0.39).slice(0, 5), splitX + 4, detailTop + 11, { lineHeightFactor: 1.15 });

  let y = detailTop + detailHeight + 4;
  const cols = { serial: inner + 5, image: inner + 12, item: inner + 28, qty: 137, rate: 166, amount: pageWidth - inner - 3 };
  const drawTableHeader = () => {
    fillRect(inner, y, usable, 8.5, WINE);
    setText(6.6, "bold", [255, 255, 255]);
    doc.text("No.", cols.serial, y + 5.5, { align: "center" });
    doc.text("Product", cols.image + 5.25, y + 5.5, { align: "center" });
    doc.text("Particulars", cols.item, y + 5.5);
    doc.text("Qty", cols.qty, y + 5.5, { align: "center" });
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

  const summaryRows = quotationSummaryRows(quote);
  const customItems = quote.items.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => item.is_custom);
  const pageBottom = pageHeight - 11;
  const rowData = quote.items.map(item => {
    setText(7.1, "bold", INK, "times");
    const nameLines = doc.splitTextToSize(clientFacingQuotationText(quote, item.name), 82);
    const customParts = quotationItemCustomParts(quote, item, designReferences);
    setText(6.1, "bold", MAROON);
    const customLines = customParts.length ? doc.splitTextToSize(customParts.join(" | "), 82) : [];
    const textHeight = nameLines.length * 3.1 + (item.sku ? 3.1 : 0) + customLines.length * 3.1;
    const rowHeight = Math.max(13.5, textHeight + 3);
    return { item, nameLines, customLines, rowHeight, textHeight };
  });
  const commercialPages = planQuotationRowPages({
    rowHeights: rowData.map(({ rowHeight }) => rowHeight), firstPageStart: y,
    continuationStart: 40.5, closingHeight: 0, pageBottom,
  });
  const commercialPageStarts = new Set(commercialPages.slice(1).map(([firstRow]) => firstRow));
  rowData.forEach(({ item, nameLines, customLines, rowHeight, textHeight }, index) => {
    if (commercialPageStarts.has(index)) startContinuationPage();
    const mid = y + rowHeight / 2;
    const linkedIndex = quote.items.findIndex(candidate => candidate.line_id === item.body_reference_line_id);
    setText(6.8, "normal", MUTED);
    doc.text(String(index + 1), cols.serial, mid + 0.85, { align: "center" });
    const placeholder = item.is_custom && linkedIndex >= 0 ? ["MATCHING", `ITEM ${linkedIndex + 1}`] : item.is_custom ? ["CUSTOM","DESIGN"] : ["IMAGE","PENDING"];
    addContainedImage(productImageData[index], cols.image, mid - 5.25, 10.5, 10.5, placeholder);
    let textY = mid - textHeight / 2 + 2.35;
    setText(7.1, "bold", INK, "times");
    nameLines.forEach(name => { doc.text(name, cols.item, textY); textY += 3.1; });
    if (item.sku) {
      setText(5.5, "normal", MUTED);
      doc.text(`SKU ${item.sku}`, cols.item, textY); textY += 3.1;
    }
    if (customLines.length) {
      setText(6.1, "bold", MAROON);
      customLines.forEach(part => { doc.text(part, cols.item, textY); textY += 3.1; });
    }
    setText(7, "normal", INK);
    doc.text(String(item.quantity), cols.qty, mid + 0.85, { align: "center" });
    doc.text(quoteMoney(item.unit_price), cols.rate, mid + 0.85, { align: "right" });
    setText(7, "bold", INK);
    doc.text(quoteMoney(item.line_total), cols.amount, mid + 0.85, { align: "right" });
    y += rowHeight;
    line(inner, y, inner + usable, y, LINE, 0.16);
  });
  const ensureRoom = height => {
    if (y + height > pageBottom) startContinuationPage(false);
  };

  // Extra financial rows retain their existing values and appear above the approved three-column bar.
  const extras = summaryRows.filter(row => !row.bold && !row.label.startsWith("GST ("));
  const taxable = summaryRows.find(row => row.bold);
  const gst = summaryRows.find(row => row.label.startsWith("GST ("));
  setText(7, "bold", INK);
  const words = doc.splitTextToSize("AMOUNT IN WORDS: " + quotationAmountInWords(quote.total), usable - 4);
  const totalsHeight = 3 + extras.length * 5 + 17 + 3 + words.length * 3.2;
  ensureRoom(totalsHeight + 2);
  y += 3;
  extras.forEach(row => {
    setText(6.7, "normal", MUTED);
    doc.text(row.label, inner + 3, y + 3.5);
    doc.text(quoteMoney(row.value), inner + usable - 3, y + 3.5, { align: "right" });
    y += 5;
  });
  const cells = [taxable, ...(gst ? [gst] : []), { label: "Payable Amount", value: quote.total }];
  const cellWidth = usable / cells.length;
  cells.forEach((cell,index) => {
    const last = index === cells.length - 1, x = inner + index * cellWidth;
    fillRect(x,y,cellWidth,17,last ? WINE : CREAM);
    setText(7,"bold",last ? GOLD : MAROON);
    doc.text(cell.label,x+cellWidth/2,y+5.5,{align:"center"});
    setText(12,"bold",last ? [255,255,255] : INK,"times");
    doc.text(quoteMoney(cell.value),x+cellWidth/2,y+12.5,{align:"center"});
    if (index && !last) line(x,y+3,x,y+14,LINE,0.2);
  });
  y += 20;
  setText(7,"bold",INK);
  words.forEach(wordLine => { doc.text(wordLine,inner+2,y+2.5); y += 3.2; });
  y += 4;

  // The bank and signature panel remains together; terms flow independently at readable size.
  const bankRows = [
    ["Account",company.name],["Bank",`${company.bank}, ${company.branch} - ${company.accountType}`],
    ["A/C No.",company.accountNumber],["IFSC",company.ifsc],
  ];
  const half = usable / 2, bankX = inner + 4, signX = inner + half, signCenter = signX + half/2;
  setText(7,"normal",INK);
  const measuredBank = bankRows.map(([label,value]) => ({label,lines:doc.splitTextToSize(String(value || ""),half-27)}));
  const bankHeight = Math.max(37, 12 + measuredBank.reduce((sum,row)=>sum+row.lines.length*3.5+1.5,0)+3);
  const terms = quotationTermsForPdf(quote);
  setText(7,"normal",INK);
  const termLines = terms.map(term=>doc.splitTextToSize(quotationPdfText(term).replace(/^[-•]\s*/,""),usable-12));
  // Fit the bank/signature panel wherever it fits, independently of the terms.
  // The complete terms block stays together when a fresh page can hold it.
  const termsHeight = 9 + termLines.reduce((sum,lines)=>sum+lines.length*3.5+2,0);
  ensureRoom(bankHeight + 5);
  const footerTop = y;
  fillRect(inner,footerTop,usable,bankHeight,CREAM,1.5);
  line(signX,footerTop+4,signX,footerTop+bankHeight-4,LINE,0.2);
  setText(7.2,"bold",MAROON);
  doc.text("BANK DETAILS",bankX,footerTop+6);
  doc.text("AUTHORISED BY",signCenter,footerTop+6,{align:"center"});
  let bankY = footerTop+12;
  measuredBank.forEach(({label,lines})=>{
    setText(6.5,"bold",MUTED); doc.text(label,bankX,bankY);
    setText(7,"normal",INK);
    lines.forEach((value,i)=>doc.text(value,bankX+19,bankY+i*3.5));
    bankY += lines.length*3.5+1.5;
  });
  if (stampData) addFreeContainedImage(stampData,signCenter-30,footerTop+9,15,13);
  addFreeContainedImage(signatureData,signCenter-18,footerTop+9,36,13);
  setText(7,"bold",INK,"times");
  doc.text(company.signatory,signCenter,footerTop+27,{align:"center"});
  setText(6.5,"normal",MUTED);
  doc.text("Authorised Signatory",signCenter,footerTop+31.5,{align:"center"});
  y += bankHeight+5;
  const termsHeader = (continued=false)=>{
    ensureRoom(12);
    setText(7.2,"bold",MAROON); doc.text(continued ? "TERMS & CONDITIONS - CONTINUED" : "TERMS & CONDITIONS",inner+2,y+4);
    y+=9;
  };
  const termsAndTaglineHeight = termsHeight + 12;
  if (termsAndTaglineHeight <= pageBottom - 32) ensureRoom(termsAndTaglineHeight);
  termsHeader();
  termLines.forEach((lines, termIndex)=>{
    lines.forEach((value,i)=>{
      const finalLine = termIndex === termLines.length - 1 && i === lines.length - 1;
      if(y+(finalLine ? 17.5 : 4)>pageBottom){startContinuationPage(false);termsHeader(true);}
      setText(7,"normal",INK);
      if(i===0){doc.setFillColor(...MAROON);doc.circle(inner+3,y+1.6,0.55,"F");}
      doc.text(value,inner+6,y+2.5);y+=3.5;
    });
    y+=2;
  });
  ensureRoom(12);
  setText(9.5,"italic",MAROON,"times");
  doc.text("Made in India. Handcrafted in Firozabad.",pageWidth/2,y+6,{align:"center"});
  y+=11;
  if(quote.notes){
    setText(6.5,"normal",MUTED);
    const notes=doc.splitTextToSize(`Notes: ${quotationPdfText(quote.notes)}`,usable-10);
    notes.forEach(note=>{ensureRoom(4);setText(6.5,"normal",MUTED);doc.text(note,inner+5,y+2.5);y+=3.5;});
  }
  pageFooter();

  let scheduleY = null;
  if (customItems.length) {
    const drawCustomisationScheduleHeader = (continued = false) => {
      drawPageBase();
      drawContinuationHeader();
      setText(14, "bold", INK, "times");
      doc.text(continued ? "Customisation Schedule - Continued" : "Customisation Schedule", inner + 4, 39);
      setText(6.2, "normal", MUTED);
      doc.text("The specifications below form part of this quotation and are listed separately from the commercial particulars.", inner + 4, 45);
      fillRect(inner, 50, usable, 8.5, WINE);
      setText(6.2, "bold", [255, 255, 255]);
      doc.text("Item", inner + 5, 55.7);
      doc.text("Product and agreed customisation", inner + 22, 55.7);
      doc.text("Qty", pageWidth - inner - 6, 55.7, { align: "right" });
    };
    const startCustomisationSchedulePage = (continued = false) => {
      if (continued) pageFooter();
      doc.addPage();
      drawCustomisationScheduleHeader(continued);
      return 58.5;
    };

    scheduleY = startCustomisationSchedulePage(false);
    customItems.forEach(({ item, itemIndex }) => {
      const nameLines = doc.splitTextToSize(clientFacingQuotationText(quote, item.name), 145);
      const specificationLines = doc.splitTextToSize(quotationCustomisationScheduleText(quote, item), 145);
      const referenceCodes = quotationReferenceCodesForItem({ design_references: designReferences }, item);
      const referenceLines = referenceCodes.length
        ? doc.splitTextToSize(`Design reference: ${referenceCodes.join(", ")}`, 145)
        : [];
      const rowHeight = Math.max(22, 7 + nameLines.length * 3.5 + specificationLines.length * 3.45 + referenceLines.length * 3.2 + 4);
      if (scheduleY + rowHeight > 270) scheduleY = startCustomisationSchedulePage(true);
      fillRect(inner, scheduleY, usable, rowHeight, (itemIndex % 2 === 0) ? [248, 243, 235] : IVORY);
      setText(7, "bold", MAROON);
      doc.text(String(itemIndex + 1), inner + 6, scheduleY + 7);
      setText(7.6, "bold", INK, "times");
      doc.text(nameLines, inner + 22, scheduleY + 6, { lineHeightFactor: 1.03 });
      setText(6.8, "normal", INK);
      const specificationY = scheduleY + 7 + nameLines.length * 3.5;
      doc.text(specificationLines, inner + 22, specificationY, { lineHeightFactor: 1.08 });
      if (referenceLines.length) {
        setText(6.2, "bold", MAROON);
        doc.text(referenceLines, inner + 22, specificationY + specificationLines.length * 3.45 + 1.5, { lineHeightFactor: 1.05 });
      }
      setText(7, "normal", INK);
      doc.text(String(item.quantity), pageWidth - inner - 6, scheduleY + 7, { align: "right" });
      scheduleY += rowHeight;
      line(inner, scheduleY, inner + usable, scheduleY, LINE, 0.15);
    });

    const noteLines = doc.splitTextToSize(CUSTOM_PRODUCT_NOTE, usable - 10);
    const noteHeight = 12 + noteLines.length * 3;
    if (scheduleY + noteHeight + 7 > 270) {
      scheduleY = startCustomisationSchedulePage(true);
    }
    scheduleY += 7;
    fillRect(inner, scheduleY, usable, noteHeight, CREAM, 1.2);
    setText(6.3, "bold", MAROON);
    doc.text("CUSTOM PRODUCT NOTE", inner + 5, scheduleY + 6);
    setText(5.8, "normal", INK);
    doc.text(noteLines, inner + 5, scheduleY + 11, { lineHeightFactor: 1.08 });
    scheduleY += noteHeight;
    if (!designReferences.length) pageFooter();
  }

  if (designReferences.length) {
    const startReferencePage = () => {
      if (scheduleY !== null) pageFooter();
      doc.addPage();
      drawPageBase();
      drawContinuationHeader();
      setText(14, "bold", INK, "times");
      doc.text("Design References", inner + 4, 39);
      setText(6.2, "normal", MUTED);
      doc.text("The references below record the agreed design details for the listed products.", inner + 4, 45);
      scheduleY = 50;
    };
    if (scheduleY === null) startReferencePage();

    designReferences.forEach((reference, referenceIndex) => {
    const applicableItems = quote.items
      .map((item, itemIndex) => ({ item, itemIndex }))
      .filter(({ item }) => (reference.applies_to || []).includes(item.line_id));
    const useLines = doc.splitTextToSize(clientFacingQuotationText(quote, reference.use_details || "Use the confirmed design details shown in this reference image."), 120).slice(0, 4);
    const excludeLines = reference.exclude_details
      ? doc.splitTextToSize(clientFacingQuotationText(quote, reference.exclude_details), 120).slice(0, 4)
      : [];
    const bodyHeight = Math.max(42, 18 + useLines.length * 3 + (excludeLines.length ? 6 + excludeLines.length * 3 : 0));
    const cardHeight = 10 + bodyHeight;
    const sectionGap = referenceIndex === 0 && scheduleY > 50 ? 12 : 4;
    if (scheduleY + sectionGap + cardHeight > pageHeight - 12) startReferencePage();
    if (referenceIndex === 0 && scheduleY > 50) {
      setText(10.5, "bold", INK, "times");
      doc.text("Design Reference", inner + 4, scheduleY + 7);
      scheduleY += 12;
    } else {
      scheduleY += sectionGap;
    }

    fillRect(inner, scheduleY, usable, 10, WINE, 1.2);
    setText(8.2, "bold", GOLD);
    doc.text(reference.code, inner + 5, scheduleY + 6.7);
    setText(7.2, "bold", [255, 255, 255]);
    doc.text(doc.splitTextToSize(clientFacingQuotationText(quote, reference.title), 110).slice(0, 1), inner + 27, scheduleY + 6.7);
    setText(5.5, "bold", [226, 216, 207]);
    doc.text(`${CATEGORY_LABELS[reference.category] || CATEGORY_LABELS.other} | Items ${applicableItems.map(({ itemIndex }) => itemIndex + 1).join(", ")}`, pageWidth - inner - 5, scheduleY + 6.7, { align: "right" });

    const panelTop = scheduleY + 10;
    fillRect(inner, panelTop, usable, bodyHeight, CREAM, 1.5);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.roundedRect(inner, panelTop, usable, bodyHeight, 1.5, 1.5, "S");
    addContainedImage(referenceImageData[referenceIndex], inner + 5, panelTop + 4, 32, bodyHeight - 8);

    const scopeX = inner + 42;
    setText(5.6, "bold", MAROON);
    doc.text("USE", scopeX, panelTop + 7);
    setText(5.7, "normal", INK);
    doc.text(useLines, scopeX, panelTop + 11, { lineHeightFactor: 1.08 });
    let scopeY = panelTop + 13 + useLines.length * 3;
    if (excludeLines.length) {
      setText(5.6, "bold", MAROON);
      doc.text("EXCLUDE", scopeX, scopeY);
      setText(5.7, "normal", INK);
      doc.text(excludeLines, scopeX, scopeY + 4, { lineHeightFactor: 1.08 });
      scopeY += 6 + excludeLines.length * 3;
    }
    setText(5.4, "bold", MUTED);
    doc.text(`Applies to Item${applicableItems.length === 1 ? "" : "s"} ${applicableItems.map(({ itemIndex }) => itemIndex + 1).join(", ")}.`, scopeX, Math.min(scopeY + 2, panelTop + bodyHeight - 4));
    scheduleY += cardHeight;
    });
    pageFooter();
  }

  const pageCount = doc.getNumberOfPages();
  for (let page=1; page<=pageCount; page++) {
    doc.setPage(page);
    setText(5.5,"normal",MUTED);
    doc.text(`Page ${page} of ${pageCount}`,pageWidth-inner,pageHeight-5,{align:"right"});
  }
  return { doc, filename: `${quote.quote_number}.pdf` };
};
