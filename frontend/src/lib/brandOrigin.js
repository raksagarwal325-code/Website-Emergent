export const BRAND_ORIGIN = "Made in India · Handcrafted in Firozabad · Since 1981";

// Preserve bespoke CMS wording while folding the standard heritage fragments together.
export function heritageEyebrow(value = "") {
  const custom = String(value).split(/\s*[·|]\s*/).filter((part) =>
    part.trim() && !/^(made in india|(?:handcrafted in |crafted in )?firozabad|since 1981)$/i.test(part.trim())
  );
  return [BRAND_ORIGIN, ...custom].join(" · ");
}

// Owner confirmed on 17 September 2026 that every catalogue product is made in India.
export const PRODUCT_ORIGIN = "Made in India";
