import { BRAND_ORIGIN, heritageEyebrow, productOriginLabel } from "./brandOrigin";

test("folds default heritage copy into a single statement and preserves custom CMS copy", () => {
  expect(heritageEyebrow("Since 1981 · Handcrafted in Firozabad")).toBe(BRAND_ORIGIN);
  expect(heritageEyebrow("Made in India · Since 1981")).toBe(BRAND_ORIGIN);
  expect(heritageEyebrow("Lighting for considered interiors")).toBe(BRAND_ORIGIN + " · Lighting for considered interiors");
});
test.each([{}, { specs: {} }, { name: "Indian chandelier", specs: { Material: "Indian glass" } },
  { specs: { Origin: "India or imported" } }, { specs: { Origin: "India", "Country of Origin": "Italy" } }
])("does not infer product origin from missing, uncertain or conflicting data", (product) => {
  expect(productOriginLabel(product)).toBeNull();
});
test("uses only explicit saved origin and does not infer Firozabad from India", () => {
  expect(productOriginLabel({ specs: { "Country of Origin": "India" } })).toBe("Made in India");
  expect(productOriginLabel({ specs: { Origin: "Firozabad, Uttar Pradesh, India" } })).toBe("Made in India · Crafted in Firozabad");
});
