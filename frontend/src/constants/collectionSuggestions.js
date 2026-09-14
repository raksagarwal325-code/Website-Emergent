import {
  normalizeCollectionSlug,
  productCollectionSlugs,
  titleCaseCollectionSlug,
} from "./collections";

const COLLECTION_SPEC_KEYS = [
  "Collection / Family",
  "Collection",
  "Collection Name",
  "Design Collection",
  "Family",
];

const GENERIC_LEADING_WORDS = new Set([
  "amber", "antique", "artisan", "bell", "black", "blue", "bowl", "brass",
  "bronze", "classic", "clear", "cobalt", "contemporary", "crystal", "cut",
  "decorative", "diamond", "designer", "dome", "emerald", "etched", "floral",
  "fluted", "glass", "gold", "golden", "green", "handcrafted", "heritage",
  "ivory", "lattice", "luxury", "modern", "multicolour", "ornate", "pendant",
  "pink", "premium", "red", "rose", "ruby", "silver", "smoky", "traditional",
  "tulip", "urn", "vintage", "white",
]);

const meaningful = (value) => {
  const text = String(value || "").trim();
  return /^(?:|n\/?a|none|unknown|null|-|—)$/i.test(text) ? "" : text;
};

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function collectionSuggestionName(product = {}) {
  for (const key of COLLECTION_SPEC_KEYS) {
    const explicit = meaningful(product?.specs?.[key]);
    if (explicit) return explicit;
  }

  const firstWord = meaningful(product?.name).match(/^[A-Za-z][A-Za-z'-]{3,}/)?.[0] || "";
  if (!firstWord || GENERIC_LEADING_WORDS.has(firstWord.toLowerCase())) return "";
  return titleCase(firstWord);
}

export function suggestCollections(products = [], registeredCollections = []) {
  const registered = new Set(registeredCollections.map((item) => normalizeCollectionSlug(item?.slug || item?.name)));
  const groups = new Map();

  products.forEach((product) => {
    if (!product?.id || !product?.sku || product.status !== "published" || !product.images?.[0]) return;
    const taggedSlugs = productCollectionSlugs(product).filter((slug) => !registered.has(slug));
    const candidates = taggedSlugs.length
      ? taggedSlugs.map((slug) => {
        const prefix = `collection-label:${slug}:`;
        const encoded = (product.tags || []).find((tag) => String(tag).startsWith(prefix))?.slice(prefix.length);
        let name = titleCaseCollectionSlug(slug);
        if (encoded) {
          try { name = decodeURIComponent(encoded) || name; } catch { /* keep the slug label */ }
        }
        return { slug, name, source: "saved tag" };
      })
      : [{ name: collectionSuggestionName(product), source: "name" }];

    candidates.forEach((candidate) => {
      const slug = normalizeCollectionSlug(candidate.slug || candidate.name);
      if (!slug || registered.has(slug)) return;
      const rows = groups.get(slug) || { slug, name: candidate.name, source: candidate.source, products: [] };
      if (!rows.products.some((item) => item.id === product.id)) rows.products.push(product);
      groups.set(slug, rows);
    });
  });

  return Array.from(groups.values())
    .filter((group) => group.source === "saved tag" || group.products.length >= 2)
    .map((group) => ({
      ...group,
      products: group.products.sort((a, b) => String(a.sku).localeCompare(String(b.sku))),
    }))
    .sort((a, b) => b.products.length - a.products.length || a.name.localeCompare(b.name));
}
