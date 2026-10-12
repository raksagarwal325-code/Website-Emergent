import { productMemberships } from "./productMemberships";

const products = [
  { id: "one", sku: "SGE-CH-054", tags: ["collection:approved", "collection:private"] },
  { id: "two", sku: "SGE-CH-055", tags: [] },
];

test("reads approved collections and ID-based variants independently", () => {
  const result = productMemberships(products, { homepage_content: {
    collections_registry_version: 2,
    collections: [{ slug: "approved", name: "Approved collection" }],
    variant_families: [{ slug: "exact", name: "Exact family", product_ids: ["one", "two"] }],
  } });
  expect(result.get("one")).toEqual({ collections: ["Approved collection"], families: ["Exact family"] });
  expect(result.get("two")).toEqual({ collections: [], families: ["Exact family"] });
});

test("uses legacy Gulzar membership only when the existing registry permits it", () => {
  expect(productMemberships(products, {}).get("two").collections).toEqual(["Gulzar"]);
  expect(productMemberships(products, { homepage_content: { collections: [], collections_registry_version: 2 } }).get("two").collections).toEqual([]);
});

test("does not call assignments missing when settings failed to load", () => {
  expect(productMemberships(products, null)).toBeNull();
});
