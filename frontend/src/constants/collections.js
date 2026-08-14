export const LEGACY_COLLECTIONS = {
  gulzar: {
    slug: "gulzar",
    name: "Gulzar",
    memberSkus: [
      "SGE-CH-054", "SGE-CH-055", "SGE-CH-056", "SGE-CH-057", "SGE-CH-058",
      "SGE-CH-059", "SGE-CH-060", "SGE-CH-067", "SGE-CH-070", "SGE-CH-071",
      "SGE-CH-072", "SGE-CH-074", "SGE-CH-075", "SGE-FL-015",
      "SGE-TL-017", "SGE-TL-018", "SGE-TL-019", "SGE-TL-020", "SGE-TL-021",
    ],
  },
};

const MEMBER_PREFIX = "collection:";
const LABEL_PREFIX = "collection-label:";
const DISPLAY_PREFIX = "collection-display:";
const FEATURED_PREFIX = "collection-featured:";

export const normalizeCollectionSlug = (value = "") => String(value)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

export const titleCaseCollectionSlug = (slug = "") => normalizeCollectionSlug(slug)
  .split("-")
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const tagsOf = (product) => Array.isArray(product?.tags) ? product.tags : [];
const decode = (value = "") => {
  try { return decodeURIComponent(value); } catch { return value; }
};
const encode = (value = "") => encodeURIComponent(String(value));

export function collectionMembershipTag(slug) {
  return `${MEMBER_PREFIX}${normalizeCollectionSlug(slug)}`;
}
export function collectionLabelTag(slug, label) {
  return `${LABEL_PREFIX}${normalizeCollectionSlug(slug)}:${encode(label)}`;
}
export function collectionFeaturedTag(slug) {
  return `${FEATURED_PREFIX}${normalizeCollectionSlug(slug)}`;
}
export function isCollectionControlTag(tag = "") {
  return [MEMBER_PREFIX, LABEL_PREFIX, DISPLAY_PREFIX, FEATURED_PREFIX].some((prefix) => String(tag).startsWith(prefix));
}

export function getExplicitCollectionSlugs(products = []) {
  const found = new Set();
  products.forEach((product) => {
    tagsOf(product).forEach((tag) => {
      if (tag.startsWith(MEMBER_PREFIX)) {
        const slug = normalizeCollectionSlug(tag.slice(MEMBER_PREFIX.length));
        if (slug) found.add(slug);
      }
    });
  });
  return Array.from(found).sort();
}

export function productCollectionSlugs(product) {
  return tagsOf(product)
    .filter((tag) => tag.startsWith(MEMBER_PREFIX))
    .map((tag) => normalizeCollectionSlug(tag.slice(MEMBER_PREFIX.length)))
    .filter(Boolean);
}

export function getCollectionFromProducts(products = [], slug) {
  const normalized = normalizeCollectionSlug(slug);
  if (!normalized) return null;
  const explicit = products.filter((product) => productCollectionSlugs(product).includes(normalized));
  const legacy = LEGACY_COLLECTIONS[normalized];
  const source = explicit.length > 0
    ? explicit
    : (legacy ? products.filter((product) => legacy.memberSkus.includes(product?.sku)) : []);
  if (source.length === 0) return null;

  let name = legacy?.name || titleCaseCollectionSlug(normalized);
  for (const product of source) {
    const label = tagsOf(product).find((tag) => tag.startsWith(`${LABEL_PREFIX}${normalized}:`));
    if (label) {
      name = decode(label.slice(`${LABEL_PREFIX}${normalized}:`.length)) || name;
      break;
    }
  }

  const featuredSkus = source
    .filter((product) => tagsOf(product).includes(collectionFeaturedTag(normalized)))
    .map((product) => product.sku);

  return {
    slug: normalized,
    name,
    title: `The ${name} Collection`,
    eyebrow: "A coordinated lighting family",
    description: `Explore the ${name} family across coordinated lighting forms, categories and variants designed to work together throughout an interior.`,
    memberSkus: source.map((product) => product.sku),
    featuredSkus,
    isLegacyFallback: explicit.length === 0 && Boolean(legacy),
  };
}

export function getCollectionForProduct(products = [], product) {
  if (!product) return null;
  const explicit = productCollectionSlugs(product);
  if (explicit.length) return getCollectionFromProducts(products, explicit[0]);
  for (const [slug, legacy] of Object.entries(LEGACY_COLLECTIONS)) {
    if (legacy.memberSkus.includes(product.sku)) return getCollectionFromProducts(products, slug);
  }
  return null;
}

export function filterCollectionProducts(items = [], collection) {
  if (!collection) return [];
  const allowed = new Set(collection.memberSkus || []);
  return items.filter((product) => allowed.has(product?.sku));
}

export function groupCollectionProducts(items = []) {
  return items.reduce((groups, product) => {
    const category = product?.category || "Other";
    if (!groups[category]) groups[category] = [];
    groups[category].push(product);
    return groups;
  }, {});
}

export function selectDiverseCollectionPreview(items = [], currentSku, limit = 5, featuredSkus = []) {
  const available = items.filter((product) => product?.sku);
  const featured = new Set(featuredSkus || []);
  const current = available.find((product) => product.sku === currentSku);
  const rest = available.filter((product) => product.sku !== currentSku)
    .sort((a, b) => Number(featured.has(b.sku)) - Number(featured.has(a.sku)));
  const ordered = current ? [current, ...rest] : rest;
  const selected = [];
  const selectedSkus = new Set();
  const categories = new Set();

  for (const product of ordered) {
    const category = product.category || "Other";
    if (categories.has(category)) continue;
    selected.push(product);
    selectedSkus.add(product.sku);
    categories.add(category);
    if (selected.length >= limit) return selected;
  }
  for (const product of ordered) {
    if (selectedSkus.has(product.sku)) continue;
    selected.push(product);
    selectedSkus.add(product.sku);
    if (selected.length >= limit) break;
  }
  return selected;
}
