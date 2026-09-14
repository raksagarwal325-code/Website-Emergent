import { normalizeCollectionSlug } from "./collections";

const COLLECTION_SPEC_KEYS = [
  "Collection / Family",
  "Collection",
  "Collection Name",
  "Design Collection",
  "Family",
];

const GENERIC_LEADING_WORDS = new Set([
  "antique", "artisan", "classic", "contemporary", "crystal", "decorative",
  "designer", "glass", "handcrafted", "heritage", "luxury", "modern",
  "premium", "traditional", "vintage",
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
    const name = collectionSuggestionName(product);
    const slug = normalizeCollectionSlug(name);
    if (!slug || registered.has(slug)) return;
    const rows = groups.get(slug) || { slug, name, products: [] };
    rows.products.push(product);
    groups.set(slug, rows);
  });

  return Array.from(groups.values())
    .filter((group) => group.products.length >= 2)
    .map((group) => ({
      ...group,
      products: group.products.sort((a, b) => String(a.sku).localeCompare(String(b.sku))),
    }))
    .sort((a, b) => b.products.length - a.products.length || a.name.localeCompare(b.name));
}

