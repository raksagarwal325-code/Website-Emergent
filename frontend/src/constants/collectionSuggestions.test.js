import { collectionSuggestionName, suggestCollections } from "./collectionSuggestions";

const product = (id, name, overrides = {}) => ({
  id,
  sku: `SGE-CH-${id}`,
  name,
  category: "Chandelier",
  status: "published",
  images: [`/${id}.jpg`],
  ...overrides,
});

test("uses verified collection specs before the product-name prefix", () => {
  expect(collectionSuggestionName(product("001", "Unrelated Product", {
    specs: { "Collection / Family": "Rajdarbar" },
  }))).toBe("Rajdarbar");
});

test("suggests repeated visual groups but skips drafts, imageless products and live collections", () => {
  const suggestions = suggestCollections([
    product("001", "Mayurcrest Amber Chandelier"),
    product("002", "Mayurcrest Clear Chandelier"),
    product("003", "Mayurcrest Draft", { status: "draft" }),
    product("004", "Mayurcrest No Image", { images: [] }),
    product("005", "Gulzar Table Lamp"),
    product("006", "Gulzar Floor Lamp"),
    product("007", "Diamond Cut Chandelier"),
    product("008", "Diamond Lattice Table Lamp"),
  ], [{ slug: "gulzar", name: "Gulzar" }]);

  expect(suggestions).toHaveLength(1);
  expect(suggestions[0]).toMatchObject({ slug: "mayurcrest", name: "Mayurcrest" });
  expect(suggestions[0].products.map((item) => item.sku)).toEqual(["SGE-CH-001", "SGE-CH-002"]);
});

test("returns a saved collection tag as a private suggestion even with one product", () => {
  const suggestions = suggestCollections([
    product("010", "Afsana Crystal Table Lamp", {
      tags: ["collection:afsana", "collection-label:afsana:Afsana"],
    }),
  ], [{ slug: "gulzar", name: "Gulzar" }]);

  expect(suggestions).toHaveLength(1);
  expect(suggestions[0]).toMatchObject({ slug: "afsana", name: "Afsana", source: "saved tag" });
  expect(suggestions[0].products[0].sku).toBe("SGE-CH-010");
});
