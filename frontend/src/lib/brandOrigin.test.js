import { BRAND_ORIGIN, heritageEyebrow } from "./brandOrigin";

test("folds default heritage copy into a single statement and preserves custom CMS copy", () => {
  expect(heritageEyebrow("Since 1981 · Handcrafted in Firozabad")).toBe(BRAND_ORIGIN);
  expect(heritageEyebrow("Made in India · Since 1981")).toBe(BRAND_ORIGIN);
  expect(heritageEyebrow("Lighting for considered interiors")).toBe(BRAND_ORIGIN + " · Lighting for considered interiors");
});
