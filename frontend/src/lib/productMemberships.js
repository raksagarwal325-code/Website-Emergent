import { LEGACY_COLLECTIONS, getCollectionFromProducts } from "../constants/collections";
import { getRegisteredCollections } from "../constants/collectionsRegistry";
import { getVariantFamilies } from "../constants/variantFamilies";

// Read the same approved records as the public relationships. Historical tags
// and name-based suggestions are not approved assignments.
export function productMemberships(products = [], settings) {
  if (!settings) return null;
  const memberships = new Map(products.map((product) => [product.id, { collections: [], families: [] }]));
  const registry = getRegisteredCollections(settings) ?? Object.values(LEGACY_COLLECTIONS);
  registry.forEach((row) => {
    const collection = getCollectionFromProducts(products, row.slug, registry);
    if (!collection) return;
    const skus = new Set(collection.memberSkus);
    products.forEach((product) => {
      if (skus.has(product.sku)) memberships.get(product.id).collections.push(collection.name);
    });
  });
  getVariantFamilies(settings).forEach((family) => {
    family.product_ids.forEach((id) => memberships.get(id)?.families.push(family.name));
  });
  return memberships;
}
