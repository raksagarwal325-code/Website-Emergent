export const COLLECTIONS = {
  gulzar: {
    slug: "gulzar",
    name: "Gulzar",
    title: "The Gulzar Collection",
    eyebrow: "A coordinated lighting family",
    description:
      "Explore the Gulzar family across coordinated lighting forms and glass colours, designed to bring a consistent decorative language through an interior.",
    memberSkus: [
      "SGE-CH-054",
      "SGE-CH-055",
      "SGE-CH-056",
      "SGE-CH-057",
      "SGE-CH-058",
      "SGE-CH-059",
      "SGE-CH-060",
      "SGE-CH-067",
      "SGE-CH-070",
      "SGE-CH-071",
      "SGE-CH-072",
      "SGE-CH-074",
      "SGE-CH-075",
      "SGE-FL-015",
      "SGE-TL-017",
      "SGE-TL-018",
      "SGE-TL-019",
      "SGE-TL-020",
      "SGE-TL-021",
    ],
    displayNameOverrides: {
      "SGE-TL-017": "Gulzar Ribbed Glass Table Lamp — Crystal Clear",
      "SGE-TL-018": "Gulzar Ribbed Glass Table Lamp — Ruby Red",
      "SGE-TL-019": "Gulzar Ribbed Glass Table Lamp — Cobalt Blue",
      "SGE-TL-020": "Gulzar Ribbed Glass Table Lamp — Amber Gold",
      "SGE-TL-021": "Gulzar Ribbed Glass Table Lamp — Emerald Green",
    },
  },
};

export function getCollection(slug) {
  return COLLECTIONS[String(slug || "").toLowerCase()] || null;
}

export function decorateCollectionProduct(product, collection) {
  if (!product || !collection) return product;
  const name = collection.displayNameOverrides?.[product.sku];
  return name ? { ...product, name } : product;
}

export function filterCollectionProducts(items = [], collection) {
  if (!collection) return [];
  const allowed = new Set(collection.memberSkus || []);
  return items
    .filter((product) => allowed.has(product?.sku))
    .map((product) => decorateCollectionProduct(product, collection));
}

export function groupCollectionProducts(items = []) {
  return items.reduce((groups, product) => {
    const category = product?.category || "Other";
    if (!groups[category]) groups[category] = [];
    groups[category].push(product);
    return groups;
  }, {});
}

export function selectDiverseCollectionPreview(items = [], currentSku, limit = 5) {
  const available = items.filter((product) => product?.sku);
  const selected = [];
  const selectedSkus = new Set();
  const categories = new Set();

  // First pass: maximise category diversity. If the current product is the only
  // confirmed member of its category, it is allowed to represent that category.
  const current = available.find((product) => product.sku === currentSku);
  const ordered = current ? [current, ...available.filter((p) => p.sku !== currentSku)] : available;

  for (const product of ordered) {
    const category = product.category || "Other";
    if (categories.has(category)) continue;
    selected.push(product);
    selectedSkus.add(product.sku);
    categories.add(category);
    if (selected.length >= limit) return selected;
  }

  // Second pass: use additional variants only after every available category
  // has been represented.
  for (const product of ordered) {
    if (selectedSkus.has(product.sku)) continue;
    selected.push(product);
    selectedSkus.add(product.sku);
    if (selected.length >= limit) break;
  }

  return selected;
}
