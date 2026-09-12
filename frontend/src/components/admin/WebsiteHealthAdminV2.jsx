import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Gauge,
  Image as ImageIcon,
  Layers3,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { API, api } from "../../lib/api";
import WebsiteHealthOpsPanels from "./WebsiteHealthOpsPanels";
import WebsiteHealthGrowthPanels from "./WebsiteHealthGrowthPanels";

const VALID_STATUS = new Set(["published", "draft"]);
const VALID_PRICE_DISPLAY = new Set(["starting_from", "fixed", "on_request"]);

const SHARED_18_FIELDS = [
  "Material", "Finish", "Height", "Width", "Glass Type", "Glass Colour", "Product Type",
  "Number of Lights", "Number of Arms", "Suspension Type", "Holder Type", "Bulb Type",
  "Package Contents", "Suitable For", "Style", "Care Instructions", "Customization", "Collection / Family",
];

export const SOP_RULES = {
  "candle stand": {
    category: "Candle Stand",
    schema: ["Material", "Finish", "Glass Type", "Product Type", "Number of Candle Holders", "Number of Arms", "Holder Type", "Suitable For", "Style", "Color", "Package Includes", "Care Instructions", "Customization Available", "Candle Type", "Height", "Width"],
    featureRange: [8, 8],
    imageCounts: [2],
    productType: "Candle Stand",
  },
  chandelier: {
    category: "Chandelier",
    sku: /^SGE-CH-\d{3}$/i,
    schema: SHARED_18_FIELDS,
    featureRange: [8, 8],
    imageCounts: [2],
    productType: "Chandelier",
  },
  "floor lamp": {
    category: "Floor Lamp",
    sku: /^SGE-FL-\d{3}$/i,
    schema: ["Material", "Finish", "Height", "Width", "Glass Type", "Glass Colour", "Product Type", "Number of Lights", "Number of Arms", "Base Type", "Holder Type", "Bulb Type", "Package Contents", "Suitable For", "Style", "Care Instructions", "Customization", "Collection / Family"],
    featureRange: [8, 8],
    imageCounts: [2],
    productType: "Floor Lamp",
  },
  "gate light": {
    category: "Gate Light",
    sku: /^SGE-GL-\d{3}$/i,
    schema: ["Material", "Finish", "Height", "Width", "Glass Type", "Glass Colour", "Product Type", "Number of Lights", "Number of Arms", "Shade Type", "Mounting Type", "Holder Type", "Bulb Type", "Weather Suitability", "Package Contents", "Suitable For", "Style", "Care Instructions", "Customization", "Collection / Family"],
    featureRange: [8, 8],
    imageCounts: [1, 2],
    productType: "Gate Light",
  },
  "hanging light": {
    category: "Hanging Light",
    sku: /^SGE-HL-\d{3}$/i,
    schema: SHARED_18_FIELDS,
    featureRange: [8, 8],
    imageCounts: [2],
    productType: "Hanging Light",
  },
  "table chandelier": {
    category: "Table Chandelier",
    sku: /^SGE-TA-\d{3}$/i,
    schema: SHARED_18_FIELDS.map((field) => field === "Suspension Type" ? "Base Type" : field),
    featureRange: [8, 8],
    imageCounts: [2],
    productType: "Table Chandelier",
  },
  "table lamp": {
    category: "Table Lamp",
    sku: /^SGE-TL-\d{3}$/i,
    schema: ["Material", "Finish", "Glass Type", "Product Type", "Number of Arms", "Number of Lights", "Holder Type", "Suitable For", "Style", "Color", "Package Includes", "Care Instructions", "Customization Available", "Shade Type", "Height", "Width"],
    featureRange: [8, 8],
    imageCounts: [2],
    imageCountExceptions: { "SGE-TL-047": [4] },
    productType: "Table Lamp",
  },
  "wall light": {
    category: "Wall Light",
    sku: /^SGE-WL-\d{3}$/i,
    schema: ["Material", "Finish", "Height", "Width", "Glass Type", "Glass Colour", "Product Type", "Number of Lights", "Number of Arms", "Holder Type", "Bulb Type", "Package Contents", "Suitable For", "Style", "Care Instructions", "Customization", "Collection / Family"],
    featureRange: [6, 8],
    imageCounts: [1, 2],
  },
};

const CATEGORY_ALIASES = {
  "candle stands": "candle stand",
  chandeliers: "chandelier",
  "floor lamps": "floor lamp",
  "gate lights": "gate light",
  "hanging lights": "hanging light",
  "table chandeliers": "table chandelier",
  "table lamps": "table lamp",
  "wall lights": "wall light",
};

const text = (value) => String(value || "").trim();
const imagesOf = (product) => (Array.isArray(product?.images) ? product.images.map(text).filter(Boolean) : []);
const specsOf = (product) => (
  product?.specs && typeof product.specs === "object" && !Array.isArray(product.specs)
    ? Object.entries(product.specs).filter(([, value]) => text(value))
    : []
);
const tagsOf = (product) => (Array.isArray(product?.tags) ? product.tags.map(text).filter(Boolean) : []);
const isPublished = (product) => product?.status === "published";
const normalizeCategory = (value) => {
  const key = text(value).toLowerCase();
  return CATEGORY_ALIASES[key] || key;
};
const normalizeField = (value) => text(value).toLowerCase().replace(/\s+/g, " ");
const wordCount = (value) => text(value).split(/\s+/).filter(Boolean).length;
const stripHtml = (value) => text(value)
  .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/[ \t]+/g, " ");

const descriptionShape = (value) => {
  const raw = text(value);
  const plain = stripHtml(raw);
  const keyIndex = plain.toLowerCase().indexOf("key features");
  const narrative = keyIndex >= 0 ? plain.slice(0, keyIndex) : plain;
  const features = keyIndex >= 0 ? plain.slice(keyIndex + "key features".length) : "";
  const htmlParagraphs = (raw.slice(0, Math.max(0, raw.toLowerCase().indexOf("key features"))).match(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/gi) || []).length;
  const plainParagraphs = narrative.split(/\n\s*\n+/).map(text).filter(Boolean).length;
  const htmlBullets = (raw.slice(Math.max(0, raw.toLowerCase().indexOf("key features"))).match(/<li(?:\s[^>]*)?>[\s\S]*?<\/li>/gi) || []).length;
  const plainBullets = features.split("\n").map(text).filter((line) => /^(?:[•*-]|\d+[.)])\s+/.test(line)).length;
  return {
    hasHeading: keyIndex >= 0,
    paragraphs: htmlParagraphs || plainParagraphs,
    features: htmlBullets || plainBullets,
  };
};

const verificationOf = (product) => product?.sop_verification || product?.catalogue_verification || {};
const isManuallyVerified = (product) => {
  const verification = verificationOf(product);
  return verification?.status === "verified"
    && Boolean(text(verification?.verified_at))
    && Boolean(text(verification?.verified_by))
    && Boolean(text(verification?.source));
};

export function evaluateSopCompliance(product) {
  const categoryKey = normalizeCategory(product?.category);
  const rule = SOP_RULES[categoryKey];
  const unresolved = categoryKey === "floor chandelier";
  const issues = [];
  const add = (issue, severity = "review", detail = "") => issues.push({ issue, severity, detail });

  if (!text(product?.name)) add("Missing product name", "critical");
  if (!text(product?.sku)) add("Missing SKU", "critical");
  if (!text(product?.category)) add("Missing category", "critical");
  if (!Object.prototype.hasOwnProperty.call(product || {}, "status") || !VALID_STATUS.has(product?.status)) add("Publication status is missing or invalid", "critical");
  if (!Object.prototype.hasOwnProperty.call(product || {}, "price_display") || !VALID_PRICE_DISPLAY.has(product?.price_display)) add("Price display mode is missing or invalid", "critical");

  if (unresolved) {
    add("Floor Chandelier SOP mapping unresolved", "review", "The supplied document contains Floor Lamp / SGE-FL rules, so it is not applied automatically.");
  } else if (!rule) {
    add("No approved SOP mapped to category", "review", text(product?.category) || "Uncategorised");
  } else {
    if (text(product?.category) !== rule.category) add("Category does not use the SOP's exact value", "critical", `Expected ${rule.category}`);
    if (rule.sku && !rule.sku.test(text(product?.sku))) add("SKU does not match category SOP", "critical", `Found ${text(product?.sku) || "blank"}`);

    const actualSpecs = specsOf(product);
    const actualFields = actualSpecs.map(([field]) => normalizeField(field));
    const expectedFields = rule.schema.map(normalizeField);
    const missingFields = rule.schema.filter((field) => !actualFields.includes(normalizeField(field)));
    const unexpectedFields = actualSpecs.map(([field]) => field).filter((field) => !expectedFields.includes(normalizeField(field)));
    if (missingFields.length) add(`Missing SOP specifications (${missingFields.length})`, "critical", missingFields.join(", "));
    if (unexpectedFields.length) add(`Unexpected SOP specifications (${unexpectedFields.length})`, "review", unexpectedFields.join(", "));
    if (!missingFields.length && !unexpectedFields.length && actualFields.some((field, index) => field !== expectedFields[index])) {
      add("Specification order does not match SOP", "review", `Expected ${rule.schema.length} fields in the approved order`);
    }
    if (actualSpecs.some(([, value]) => /\[[^\]]+\]/.test(text(value)))) add("Specification contains an unresolved template placeholder", "critical");
    if (actualSpecs.some(([field, value]) => /^(height|width)$/i.test(text(field)) && /^made to order$/i.test(text(value)))) add("Invalid dimension fallback", "critical", "Use To be confirmed before order, not Made to Order");
    if (rule.productType) {
      const productType = actualSpecs.find(([field]) => normalizeField(field) === "product type");
      if (productType && text(productType[1]) !== rule.productType) add("Product Type does not match category SOP", "critical", `Expected ${rule.productType}`);
    }

    const shortWords = wordCount(product?.short_description);
    if (shortWords < 20 || shortWords > 35) add("Short description is outside the SOP range", "review", `${shortWords} words; expected 20–35`);
    const shape = descriptionShape(product?.description);
    if (shape.paragraphs !== 2) add("Full description does not contain exactly two narrative paragraphs", "review", `${shape.paragraphs} detected`);
    if (!shape.hasHeading) add("Key Features heading is missing", "review");
    if (shape.features < rule.featureRange[0] || shape.features > rule.featureRange[1]) {
      const expected = rule.featureRange[0] === rule.featureRange[1] ? `${rule.featureRange[0]}` : `${rule.featureRange[0]}–${rule.featureRange[1]}`;
      add("Key Features count does not match SOP", "review", `${shape.features} detected; expected ${expected}`);
    }

    const sku = text(product?.sku).toUpperCase();
    const acceptedCounts = rule.imageCountExceptions?.[sku] || rule.imageCounts;
    const imageCount = imagesOf(product).length;
    if (!acceptedCounts.includes(imageCount)) add("Image count requires SOP review", imageCount === 0 ? "critical" : "review", `${imageCount} images; accepted ${acceptedCounts.join(" or ")}`);
  }

  const fallbackFields = specsOf(product)
    .filter(([, value]) => text(value).toLowerCase() === "to be confirmed before order")
    .map(([field]) => field);

  return {
    product,
    rule,
    coverage: unresolved ? "unresolved" : rule ? "covered" : "missing",
    issues,
    structuralPass: Boolean(rule) && issues.length === 0,
    manualVerified: Boolean(rule) && isManuallyVerified(product),
    fallbackFields,
    approvedImageException: Boolean(rule?.imageCountExceptions?.[text(product?.sku).toUpperCase()]),
  };
}

export function productCompleteness(product) {
  const result = evaluateSopCompliance(product);
  return {
    structuralPass: result.structuralPass,
    missing: result.issues.map((item) => item.issue),
    coverage: result.coverage,
    fallbackFields: result.fallbackFields,
  };
}

const duplicateMap = (products, selector) => {
  const map = new Map();
  products.forEach((product) => {
    const key = text(selector(product)).toLowerCase();
    if (!key) return;
    const existing = map.get(key) || [];
    existing.push(product);
    map.set(key, existing);
  });
  return new Map(Array.from(map.entries()).filter(([, items]) => items.length > 1));
};

const validImageUrl = (url) => /^\/api\/files\//i.test(url) || /^https?:\/\//i.test(url);
const productKey = (product) => product?.id || product?.sku || product?.name || "unknown-product";

export function groupFindings(items = []) {
  const grouped = new Map();
  items.forEach((item) => {
    const key = productKey(item.product);
    const existing = grouped.get(key) || { product: item.product, findings: [] };
    existing.findings.push(item);
    grouped.set(key, existing);
  });
  return Array.from(grouped.values()).sort((a, b) => {
    const rank = { critical: 0, review: 1, info: 2 };
    const aRank = Math.min(...a.findings.map((item) => rank[item.severity] ?? 3));
    const bRank = Math.min(...b.findings.map((item) => rank[item.severity] ?? 3));
    if (aRank !== bRank) return aRank - bRank;
    return text(a.product?.sku).localeCompare(text(b.product?.sku));
  });
}

const uniqueProductCount = (items) => new Set(items.map((item) => productKey(item.product))).size;

export function buildWebsiteHealth(products = []) {
  const safeProducts = Array.isArray(products) ? products : [];
  const duplicateSkus = duplicateMap(safeProducts, (product) => product.sku);
  const duplicateNames = duplicateMap(safeProducts, (product) => product.name);
  const duplicatePrimary = duplicateMap(safeProducts, (product) => imagesOf(product)[0]);

  const attention = [];
  const imageIssues = [];
  const seoIssues = [];
  const compliance = safeProducts.map(evaluateSopCompliance);

  const push = (bucket, product, severity, issue, detail = "") => {
    bucket.push({
      id: `${productKey(product)}-${issue}-${bucket.length}`,
      product,
      severity,
      issue,
      detail,
    });
  };

  safeProducts.forEach((product, index) => {
    const name = text(product.name);
    const images = imagesOf(product);
    const primary = images[0] || "";
    const shortDescription = text(product.short_description);
    const description = text(product.description);

    compliance[index].issues.forEach((item) => push(attention, product, item.severity, item.issue, item.detail));
    if (!primary) {
      push(attention, product, "critical", "Missing primary image");
      push(imageIssues, product, "critical", "Missing primary image");
    } else if (!validImageUrl(primary)) {
      push(attention, product, "critical", "Unsupported primary image URL", primary);
      push(imageIssues, product, "critical", "Unsupported primary image URL", primary);
    }

    if (images.length === 1) {
      push(imageIssues, product, "review", "Only one product image", "Consider a second angle or lit/unlit pair where available.");
    }
    if (new Set(images).size !== images.length) {
      push(imageIssues, product, "review", "Duplicate image URL inside product");
    }

    if (shortDescription.length < 60) {
      push(seoIssues, product, "review", "Short description is thin", `${shortDescription.length} characters`);
    }
    if (description.length < 160) {
      push(seoIssues, product, "review", "Description is thin", `${description.length} characters`);
    }
    if (name && (name.length < 24 || name.length > 100)) {
      push(seoIssues, product, "review", "Product title length needs review", `${name.length} characters`);
    }
    if (tagsOf(product).length === 0) {
      push(seoIssues, product, "review", "No catalogue/search tags");
    }
    if (!text(product.seo_slug)) {
      push(seoIssues, product, "info", "No stored SEO slug", "Readable name + SKU fallback is available, so this is informational only.");
    }
  });

  duplicateSkus.forEach((items, key) => items.forEach((product) => {
    push(attention, product, "critical", "Duplicate SKU", key);
    push(seoIssues, product, "critical", "Duplicate SKU", key);
  }));
  duplicateNames.forEach((items, key) => items.forEach((product) => {
    push(seoIssues, product, "review", "Duplicate product name", key);
  }));
  duplicatePrimary.forEach((items, key) => items.forEach((product) => {
    push(imageIssues, product, "review", "Primary image reused by multiple products", key);
  }));

  const categoryMap = new Map();
  safeProducts.forEach((product, index) => {
    const category = text(product.category) || "Uncategorised";
    const current = categoryMap.get(category) || {
      products: 0,
      published: 0,
      drafts: 0,
      noImage: 0,
      sopCovered: 0,
      structuralPass: 0,
      confirmationBacklog: 0,
      verificationPending: 0,
    };
    current.products += 1;
    if (isPublished(product)) current.published += 1;
    else current.drafts += 1;
    if (imagesOf(product).length === 0) current.noImage += 1;
    const result = compliance[index];
    if (result?.coverage === "covered") current.sopCovered += 1;
    if (result?.structuralPass) current.structuralPass += 1;
    if (result?.fallbackFields.length) current.confirmationBacklog += 1;
    if (result?.coverage === "covered" && !result.manualVerified) current.verificationPending += 1;
    categoryMap.set(category, current);
  });

  const categories = Array.from(categoryMap.entries())
    .map(([category, value]) => ({
      category,
      ...value,
      sopStatus: SOP_RULES[normalizeCategory(category)] ? "Mapped" : normalizeCategory(category) === "floor chandelier" ? "Unresolved" : "Not supplied",
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const publishedCompliance = compliance.filter(({ product }) => isPublished(product));
  const draftCompliance = compliance.filter(({ product }) => !isPublished(product));
  const publishedAttention = attention.filter((item) => isPublished(item.product));
  const draftAttention = attention.filter((item) => !isPublished(item.product));
  const publishedImageIssues = imageIssues.filter((item) => isPublished(item.product));
  const publishedSeoIssues = seoIssues.filter((item) => isPublished(item.product));
  const publishedSeoActionable = publishedSeoIssues.filter((item) => item.severity !== "info");

  const coveredPublished = publishedCompliance.filter((item) => item.coverage === "covered");
  const structurallyCompliantPublished = coveredPublished.filter((item) => item.structuralPass);
  const sopVerifiedPublished = structurallyCompliantPublished.filter((item) => item.manualVerified && item.fallbackFields.length === 0);

  return {
    attention,
    imageIssues,
    seoIssues,
    compliance,
    publishedCompliance,
    draftCompliance,
    publishedAttention,
    draftAttention,
    publishedImageIssues,
    publishedSeoIssues,
    publishedSeoActionable,
    categories,
    publishedCount: publishedCompliance.length,
    draftCount: draftCompliance.length,
    sopCoveragePublished: coveredPublished.length,
    sopUnmappedPublished: publishedCompliance.length - coveredPublished.length,
    structurallyCompliantPublished: structurallyCompliantPublished.length,
    sopVerifiedPublished: sopVerifiedPublished.length,
    manualVerificationPending: coveredPublished.filter((item) => !item.manualVerified).length,
    confirmationBacklog: coveredPublished.filter((item) => item.fallbackFields.length > 0).length,
    approvedExceptionCount: publishedCompliance.filter((item) => item.approvedImageException).length,
    productsNeedingAttention: uniqueProductCount(publishedAttention.filter((item) => item.severity !== "info")),
    productsWithImageIssues: uniqueProductCount(publishedImageIssues),
    productsWithSeoIssues: uniqueProductCount(publishedSeoActionable),
    criticalPublishedProducts: uniqueProductCount(publishedAttention.filter((item) => item.severity === "critical")),
    seoInformationalCount: publishedSeoIssues.filter((item) => item.severity === "info").length,
  };
}

const severityClasses = {
  critical: "border-red-400/40 bg-red-500/5 text-red-200",
  review: "border-amber-300/30 bg-amber-400/5 text-amber-100",
  info: "border-white/10 bg-white/[0.02] text-white/60",
};

const actionClass = "inline-flex items-center gap-1.5 border border-[#D4AF37]/45 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#D4AF37] hover:bg-[#D4AF37]/10";
const shortSha = (sha) => (sha ? String(sha).slice(0, 12) : "Unavailable");

function Metric({ label, value, hint }) {
  return (
    <div className="border border-white/10 p-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">{label}</div>
      <div className="mt-2 font-serif text-3xl">{value}</div>
      {hint && <div className="mt-2 text-xs text-white/45">{hint}</div>}
    </div>
  );
}

function ProductActions({ product }) {
  if (!product?.id) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/admin?tab=products&product=${encodeURIComponent(product.id)}`} className={actionClass}><Wrench size={12} /> Edit product</a>
      <a href={`/product/${encodeURIComponent(product.id)}`} className={actionClass}><ExternalLink size={12} /> View product</a>
    </div>
  );
}

function ProductFindingGroups({ groups, emptyMessage }) {
  if (!groups.length) {
    return <div className="border border-emerald-300/20 bg-emerald-400/5 p-6 text-sm text-emerald-100">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {groups.slice(0, 250).map(({ product, findings }) => {
        const hasCritical = findings.some((item) => item.severity === "critical");
        const hasReview = findings.some((item) => item.severity === "review");
        const style = hasCritical ? severityClasses.critical : hasReview ? severityClasses.review : severityClasses.info;
        return (
          <div key={productKey(product)} className={`border p-4 ${style}`}>
            <div className="grid gap-3 md:grid-cols-[130px_1fr_auto] md:items-start">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-60">{hasCritical ? "Critical" : hasReview ? "Review" : "Info"}</div>
                <div className="mt-1 text-xs font-medium">{product?.sku || "No SKU"}</div>
              </div>
              <div>
                <div className="text-sm text-white">{product?.name || "Unnamed product"}</div>
                <div className="mt-1 text-[11px] opacity-60">{product?.category || "No category"}</div>
              </div>
              <div className="text-[11px] opacity-60">{findings.length} finding{findings.length === 1 ? "" : "s"}</div>
            </div>
            <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
              {findings.map((item) => (
                <div key={item.id} className="grid gap-1 md:grid-cols-[1fr_1.4fr]">
                  <div className="text-sm">{item.issue}</div>
                  {item.detail ? <div className="break-all text-[11px] opacity-60">{item.detail}</div> : <div />}
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-white/10 pt-3"><ProductActions product={product} /></div>
          </div>
        );
      })}
      {groups.length > 250 && <div className="text-xs text-white/45">Showing first 250 of {groups.length} affected products.</div>}
    </div>
  );
}

function ComplianceRows({ items, emptyMessage = "No SOP compliance gaps found." }) {
  if (!items.length) {
    return <div className="border border-emerald-300/20 bg-emerald-400/5 p-6 text-sm text-emerald-100">{emptyMessage}</div>;
  }
  return (
    <div className="space-y-2">
      {items.slice(0, 300).map(({ product, coverage, structuralPass, manualVerified, fallbackFields, issues }) => (
        <div key={productKey(product)} className="grid gap-3 border border-white/10 p-4 xl:grid-cols-[110px_1fr_150px_1.4fr_auto] xl:items-center">
          <div className="text-xs text-white/60">{product.sku || "No SKU"}</div>
          <div><div className="text-sm">{product.name || "Unnamed product"}</div><div className="text-[11px] text-white/40">{product.category || "No category"}</div></div>
          <div className={`text-xs uppercase tracking-[0.12em] ${structuralPass ? "text-emerald-300" : coverage === "covered" ? "text-amber-200" : "text-[#D4AF37]"}`}>
            {coverage !== "covered" ? `SOP ${coverage}` : structuralPass ? "Structure passes" : "Structure needs work"}
          </div>
          <div className="text-xs leading-5 text-white/45">
            {issues.length > 0 ? issues.map((item) => item.issue).join(", ") : manualVerified ? "Recorded evidence verification complete" : "Structure passes; evidence verification is not recorded"}
            {fallbackFields.length > 0 ? ` · Confirmation needed: ${fallbackFields.join(", ")}` : ""}
          </div>
          <ProductActions product={product} />
        </div>
      ))}
    </div>
  );
}

export default function WebsiteHealthAdminV2() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [release, setRelease] = useState(null);
  const [releaseError, setReleaseError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("attention");
  const [query, setQuery] = useState("");
  const [refreshedAt, setRefreshedAt] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setReleaseError("");
    const [catalogue, siteStats, releaseResult] = await Promise.all([
      api.listAllProducts({ include_drafts: 1, limit: 5000, raw: true }).catch(() => []),
      api.stats().catch(() => null),
      fetch(`${API}/admin/health/release`, {
        credentials: "include",
        headers: { "X-Requested-With": "fetch" },
      }).then(async (response) => {
        if (!response.ok) throw new Error(`Deployment check failed (${response.status})`);
        return response.json();
      }).catch((error) => {
        setReleaseError(error?.message || "Deployment check unavailable");
        return null;
      }),
    ]);
    setProducts(catalogue);
    setStats(siteStats);
    setRelease(releaseResult);
    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const health = useMemo(() => buildWebsiteHealth(products), [products]);
  const normalizedQuery = query.trim().toLowerCase();

  const filterIssues = (items) => {
    if (!normalizedQuery) return items;
    return items.filter((item) => [
      item.product?.sku,
      item.product?.name,
      item.product?.category,
      item.issue,
      item.detail,
    ].some((value) => text(value).toLowerCase().includes(normalizedQuery)));
  };

  const filterCompliance = (items, predicate = () => true) => items.filter((item) => (
    predicate(item) && (
      !normalizedQuery || [item.product?.sku, item.product?.name, item.product?.category, ...item.issues.map((issue) => issue.issue), ...item.fallbackFields]
        .some((value) => text(value).toLowerCase().includes(normalizedQuery))
    )
  ));

  const tabs = [
    ["attention", "Needs Attention", AlertTriangle],
    ["completeness", "SOP Compliance", Gauge],
    ["images", "Image Audit", ImageIcon],
    ["seo", "SEO Health", FileSearch],
    ["overview", "Catalogue Overview", BarChart3],
    ["operations", "Live Site Operations", Activity],
    ["growth", "Catalogue Growth Controls", Layers3],
    ["deployment", "Deployment Info", ShieldCheck],
  ];

  const publishedAttentionGroups = groupFindings(filterIssues(health.publishedAttention));
  const imageGroups = groupFindings(filterIssues(health.publishedImageIssues));
  const seoActionableGroups = groupFindings(filterIssues(health.publishedSeoActionable));
  const seoInfoGroups = groupFindings(filterIssues(health.publishedSeoIssues.filter((item) => item.severity === "info")));
  const publishedStructuralGaps = filterCompliance(health.publishedCompliance, (item) => !item.structuralPass);
  const draftStructuralGaps = filterCompliance(health.draftCompliance, (item) => !item.structuralPass);
  const publishedVerificationQueue = filterCompliance(health.publishedCompliance, (item) => item.coverage === "covered" && (!item.manualVerified || item.fallbackFields.length > 0));
  const searchEnabled = ["attention", "completeness", "images", "seo"].includes(tab);

  return (
    <div data-testid="admin-website-health" className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="eyebrow mb-3">Backoffice · Website Health</div>
          <h1 className="font-serif text-4xl">Website Health</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
            Focused checks for catalogue quality, live-site health, search readiness and growth structure. Each area has its own tab so only the information you choose is shown.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/admin" className="border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70 hover:text-white">Back to Admin</a>
          <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 border border-[#D4AF37]/50 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#D4AF37] disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <Metric label="Products audited" value={products.length} hint={`${health.publishedCount} published · ${health.draftCount} drafts${stats?.products != null ? ` · public stats ${stats.products}` : ""}`} />
        <Metric label="SOP coverage" value={`${health.sopCoveragePublished}/${health.publishedCount}`} hint={`${health.sopUnmappedPublished} published products have no usable SOP mapping`} />
        <Metric label="Structural SOP pass" value={`${health.structurallyCompliantPublished}/${health.sopCoveragePublished}`} hint="Exact category schema and machine-checkable rules" />
        <Metric label="SOP-verified records" value={`${health.sopVerifiedPublished}/${health.sopCoveragePublished}`} hint="Requires recorded source/image verification and no confirmation fallback" />
        <Metric label="Verification pending" value={health.manualVerificationPending} hint="Product facts or image match not evidenced in the record" />
        <Metric label="Confirmation backlog" value={health.confirmationBacklog} hint={`Products using the approved confirmation fallback · ${health.approvedExceptionCount} recorded SOP exceptions`} />
        <Metric label="Products needing attention" value={health.productsNeedingAttention} hint={`${health.criticalPublishedProducts} published products have critical findings`} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10">
        {tabs.map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} data-testid={`website-health-tab-${key}`} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-[11px] uppercase tracking-[0.18em] ${tab === key ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-white/50 hover:text-white"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {searchEnabled && (
        <div className="mt-6 relative max-w-xl">
          <Search size={15} className="absolute left-3 top-3 text-white/35" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU, product, category or issue" className="w-full border border-white/15 bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#D4AF37]/70" />
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="border border-white/10 p-8 text-sm text-white/50">Running health checks…</div>
        ) : tab === "attention" ? (
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div><div className="eyebrow mb-2">Published catalogue</div><h2 className="font-serif text-2xl">Needs Attention</h2><p className="mt-2 text-xs text-white/45">Only published products with actionable catalogue findings are shown here.</p></div>
              <div className="text-xs text-white/45">{publishedAttentionGroups.length} affected products · {filterIssues(health.publishedAttention).length} findings</div>
            </div>
            <ProductFindingGroups groups={publishedAttentionGroups} emptyMessage="No published catalogue findings require attention." />
          </section>
        ) : tab === "completeness" ? (
          <div className="space-y-10">
            <div className="border border-[#D4AF37]/25 bg-[#D4AF37]/5 p-5 text-xs leading-5 text-white/60">
              This audit does not use a rounded completeness percentage. Structural pass means the record matches the mapped category SOP; it does not prove that images, dimensions, materials, light counts or arm counts are factually correct. Those require recorded source verification.
            </div>
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div><div className="eyebrow mb-2">Published catalogue</div><h2 className="font-serif text-2xl">Structural SOP gaps</h2><p className="mt-2 text-xs text-white/45">Exact schema, category, SKU, description structure, image count and explicit commercial-state checks.</p></div>
                <div className="text-xs text-white/45">{publishedStructuralGaps.length} published products need structural review</div>
              </div>
              <ComplianceRows items={publishedStructuralGaps} />
            </section>
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div><div className="eyebrow mb-2">Evidence layer</div><h2 className="font-serif text-2xl">Verification and confirmation queue</h2><p className="mt-2 text-xs text-white/45">Records remain here until product-specific facts and image identity have documented verification.</p></div>
                <div className="text-xs text-white/45">{publishedVerificationQueue.length} published products pending evidence and/or confirmation</div>
              </div>
              <ComplianceRows items={publishedVerificationQueue} emptyMessage="Every mapped published product has recorded evidence verification and no confirmation fallback." />
            </section>
            {draftStructuralGaps.length > 0 && (
              <section>
                <div className="mb-4"><div className="eyebrow mb-2">Drafts</div><h2 className="font-serif text-2xl">Draft structural SOP gaps</h2></div>
                <ComplianceRows items={draftStructuralGaps} />
              </section>
            )}
          </div>
        ) : tab === "images" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-serif text-2xl">Image Audit</h2><p className="mt-2 text-xs text-white/45">Each finding links directly to the affected product editor.</p></div><div className="text-xs text-white/45">{imageGroups.length} published products affected · {filterIssues(health.publishedImageIssues).length} findings</div></div>
            <ProductFindingGroups groups={imageGroups} emptyMessage="No structural product-image issues found in published products." />
          </div>
        ) : tab === "seo" ? (
          <div className="space-y-8">
            <div className="border border-white/10 p-4 text-xs leading-5 text-white/50">
              This is a catalogue-content readiness audit, not Search Console. Missing stored SEO slugs are informational because readable name + SKU fallback URLs already work and therefore do not inflate the main SEO-content warning count.
            </div>
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><h2 className="font-serif text-2xl">Actionable SEO-content checks</h2><div className="text-xs text-white/45">{seoActionableGroups.length} affected products · {filterIssues(health.publishedSeoActionable).length} findings</div></div>
              <ProductFindingGroups groups={seoActionableGroups} emptyMessage="No actionable SEO-content findings found in published products." />
            </section>
            {seoInfoGroups.length > 0 && <section><div className="mb-4"><h2 className="font-serif text-2xl">Informational</h2><p className="mt-2 text-xs text-white/45">Useful context that does not count as a published-site SEO warning.</p></div><ProductFindingGroups groups={seoInfoGroups} emptyMessage="No informational SEO notes." /></section>}
          </div>
        ) : tab === "overview" ? (
          <section>
            <div className="mb-4"><div className="eyebrow mb-2">Catalogue overview</div><h2 className="font-serif text-2xl">Category snapshot</h2><p className="mt-2 text-xs text-white/45">Reference data only — it is intentionally kept out of Needs Attention.</p></div>
            <div className="overflow-x-auto border border-white/10">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/5 text-[10px] uppercase tracking-[0.18em] text-white/50"><tr><th className="p-3">Category</th><th className="p-3">SOP status</th><th className="p-3">Products</th><th className="p-3">Published</th><th className="p-3">Drafts</th><th className="p-3">Structural pass</th><th className="p-3">Confirmations</th><th className="p-3">Verification pending</th></tr></thead>
                <tbody>{health.categories.map((row) => <tr key={row.category} className="border-t border-white/10"><td className="p-3">{row.category}</td><td className="p-3">{row.sopStatus}</td><td className="p-3">{row.products}</td><td className="p-3">{row.published}</td><td className="p-3">{row.drafts}</td><td className="p-3">{row.structuralPass}/{row.sopCovered}</td><td className="p-3">{row.confirmationBacklog}</td><td className="p-3">{row.verificationPending}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        ) : tab === "operations" ? (
          <WebsiteHealthOpsPanels />
        ) : tab === "growth" ? (
          <WebsiteHealthGrowthPanels />
        ) : (
          <div className="space-y-6">
            <div className="border border-white/10 p-5 text-sm leading-6 text-white/55">
              <div className="mb-2 font-serif text-xl text-white">What Deployment Info means</div>
              This is a read-only technical check showing whether the running site exposes Git/deployment identifiers. It does not publish, sync or change anything. Because the Emergent production runtime does not currently expose enough Git metadata, this page may show “Unavailable”; your approved SHA-pinned GitHub → Emergent sync process remains the authoritative release check.
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Metric label="API health" value={releaseError ? "Check failed" : "Connected"} hint={releaseError || API} />
              <Metric label="Runtime source" value={release?.runtime || "Unavailable"} hint="Git metadata is only shown when the runtime exposes it." />
              <Metric label="Git branch" value={release?.git_branch || "Unavailable"} hint={release?.git_dirty === true ? "Workspace has local changes" : release?.git_dirty === false ? "Workspace clean" : "Dirty-state unavailable"} />
              <Metric label="Git HEAD" value={shortSha(release?.git_head)} hint={release?.git_head || "No Git repository visible in this runtime"} />
              <Metric label="Deployment SHA" value={shortSha(release?.deployment_sha)} hint={release?.deployment_sha || "Hosting platform did not expose a deployment SHA"} />
              <Metric label="SHA alignment" value={release?.aligned === true ? "Match" : release?.aligned === false ? "Mismatch" : "Not comparable"} hint="Only compared when both runtime and deployment SHAs are available." />
            </div>
            <div className={`border p-5 ${release?.aligned === false || release?.git_dirty === true ? "border-amber-300/30 bg-amber-400/5" : "border-white/10"}`}>
              <div className="flex items-start gap-3">
                {release?.aligned === true && release?.git_dirty === false ? <CheckCircle2 className="mt-0.5 text-emerald-300" size={18} /> : <AlertTriangle className="mt-0.5 text-[#D4AF37]" size={18} />}
                <div><div className="text-sm">Deployment interpretation</div><div className="mt-1 text-xs leading-5 text-white/50">{release?.aligned === false ? "The deployment SHA and visible Git HEAD differ. Verify the GitHub → Emergent → production handoff before publishing another release." : release?.git_dirty === true ? "The runtime Git workspace contains local changes. This is normal during SHA-pinned Emergent sync, but verify the exact approved files before publishing." : release?.aligned === true ? "The available runtime/deployment SHA signals agree." : "Exact SHA alignment cannot be inferred from this runtime. Continue using the existing SHA-pinned sync SOP rather than assuming alignment."}</div></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && !["operations", "growth"].includes(tab) && <div className="mt-8 text-[11px] text-white/35">Last refreshed: {refreshedAt ? refreshedAt.toLocaleString() : "—"}</div>}
    </div>
  );
}
