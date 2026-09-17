export const BRAND_ORIGIN = "Made in India · Handcrafted in Firozabad · Since 1981";

// Preserve bespoke CMS wording while folding the standard heritage fragments together.
export function heritageEyebrow(value = "") {
  const custom = String(value).split(/\s*[·|]\s*/).filter((part) =>
    part.trim() && !/^(made in india|(?:handcrafted in |crafted in )?firozabad|since 1981)$/i.test(part.trim())
  );
  return [BRAND_ORIGIN, ...custom].join(" · ");
}

// Only explicit origin specifications support a product-level origin claim.
export function productOriginLabel(product) {
  const entries = Object.entries(product?.specs || {}).filter(([key]) =>
    /^(country of origin|place of origin|origin|made in)$/i.test(key.trim())
  );
  const values = entries.map(([, value]) => String(value).trim());
  if (!values.length || values.some((value) =>
    !/^(india|made in india|firozabad(?:,?\s*(?:uttar pradesh|india))*|uttar pradesh,?\s*india)$/i.test(value)
  )) return null;
  return values.some((value) => /^firozabad/i.test(value))
    ? "Made in India · Crafted in Firozabad"
    : "Made in India";
}
