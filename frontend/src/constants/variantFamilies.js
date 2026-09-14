const VARIANT_SPEC_AXES = [
  { key: "glass_colour", label: "Glass colour", specs: ["Glass Colour", "Glass Color", "Colour", "Color"] },
  { key: "metal_finish", label: "Metal finish", specs: ["Metal Finish", "Finish"] },
  { key: "lights", label: "Lights", specs: ["Number of Lights", "Lights", "Light Count"] },
  { key: "size", label: "Size", specs: ["Dimensions", "Size"] },
  { key: "mechanism", label: "Mechanism", specs: ["Mechanism", "Mounting Type", "Suspension Type", "Base Type"] },
  { key: "product_type", label: "Product type", specs: ["Product Type"] },
];

const REMOVABLE_VARIANT_WORDS = new Set([
  "amber", "blue", "cobalt", "clear", "crystal", "emerald", "green", "multicolour",
  "multicolor", "pink", "red", "ruby", "smoke", "smoky", "white", "yellow",
  "antique", "black", "brass", "bronze", "chrome", "copper", "gold", "golden",
  "nickel", "silver", "finish", "finished", "glass",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "twelve", "fourteen", "sixteen", "eighteen", "twenty", "thirty", "single", "double",
  "triple", "light", "lights", "arm", "arms",
  "chandelier", "chandeliers", "lamp", "lamps", "stand", "stands", "hanging", "wall",
  "floor", "table", "ceiling", "gate", "pendant", "sconce",
]);

export function normalizeVariantSlug(value = "") {
  return String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getVariantFamilies(settings) {
  const rows = settings?.homepage_content?.variant_families;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      slug: normalizeVariantSlug(row?.slug || row?.name),
      name: String(row?.name || "").trim(),
      product_ids: Array.from(new Set((row?.product_ids || []).map(String).filter(Boolean))),
      axes: Array.from(new Set((row?.axes || []).map(String).filter((key) =>
        [...VARIANT_SPEC_AXES.map((axis) => axis.key), "use"].includes(key)
      ))),
    }))
    .filter((row) => row.slug && row.name && row.product_ids.length >= 2);
}

export function withVariantFamilies(settings, families) {
  return {
    ...(settings || {}),
    homepage_content: {
      ...(settings?.homepage_content || {}),
      variant_families: families,
    },
  };
}

export function variantBaseName(name = "") {
  const words = String(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !REMOVABLE_VARIANT_WORDS.has(word) && !/^\d+$/.test(word));
  return words.join(" ");
}

export function suggestVariantFamilies(products = [], existing = []) {
  const assigned = new Set(existing.flatMap((family) => family.product_ids || []));
  const groups = new Map();
  products.forEach((product) => {
    if (!product?.id || assigned.has(product.id)) return;
    const base = variantBaseName(product.name);
    // A distinctive family name is required. Short/generic stems are unsafe.
    if (!base || base.length < 5) return;
    const rows = groups.get(base) || [];
    rows.push(product);
    groups.set(base, rows);
  });
  return Array.from(groups.entries())
    .filter(([, rows]) => rows.length >= 2)
    .map(([base, rows]) => ({
      slug: normalizeVariantSlug(base),
      name: base.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      base,
      products: rows.sort((a, b) => String(a.sku || "").localeCompare(String(b.sku || ""))),
    }))
    .sort((a, b) => b.products.length - a.products.length || a.base.localeCompare(b.base));
}

function meaningful(value) {
  if (value == null) return "";
  const text = String(value).trim();
  return /^(?:|n\/?a|unknown|none|null|-|—)$/i.test(text) ? "" : text;
}

function firstSpec(product, keys) {
  for (const key of keys) {
    const value = meaningful(product?.specs?.[key]);
    if (value) return value;
  }
  return "";
}

function sizeValue(product) {
  const direct = firstSpec(product, ["Dimensions", "Size"]);
  if (direct) return direct;
  const height = firstSpec(product, ["Height"]);
  const width = firstSpec(product, ["Width", "Diameter"]);
  if (height && width) return `${height} × ${width}`;
  return height || width;
}

export function variantAxes(products = []) {
  const candidates = VARIANT_SPEC_AXES.map((axis) => ({
    ...axis,
    values: products.map((product) => axis.key === "size" ? sizeValue(product) : firstSpec(product, axis.specs)),
  }));
  if (new Set(products.map((product) => meaningful(product?.category))).size > 1) {
    candidates.push({ key: "use", label: "Form / use", values: products.map((product) => meaningful(product?.category)) });
  }
  return candidates.filter((axis) => new Set(axis.values.filter(Boolean).map((value) => value.toLowerCase())).size > 1);
}

export { VARIANT_SPEC_AXES };
