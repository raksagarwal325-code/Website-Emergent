import { harmoniseCustomVariantNames } from "./quotationNaming";

test("harmonises related custom products using the shared family and only variant attributes", () => {
  const items = harmoniseCustomVariantNames([
    {
      line_id: "two-step", image: "/api/files/basket-large.webp", is_custom: true,
      name: "Crystal Basket Chandelier with Glass Shades - Gold Finish - Approx. 3 ft Dia x 3-3.5 ft H",
      customisation_notes: "Retain the same two arm tiers and keep the diameter fixed at 3 ft. Overall height approximately 3-3.5 ft.",
    },
    {
      line_id: "one-step", image: "/api/files/basket-small.webp", is_custom: true,
      name: "Crystal Basket Chandelier with Hurricane Glass Shades - 1-Step - Gold Finish - Approx. 3 ft Dia x 2-2.5 ft H",
      customisation_notes: "Use a single ring of arms. Diameter approximately 3 ft and height approximately 2-2.5 ft.",
    },
  ]);

  expect(items.map((item) => item.name)).toEqual([
    "Crystal Basket Chandelier with Glass Shades - 2-Step - Gold Finish - Approx. 3 ft Dia x 3-3.5 ft H",
    "Crystal Basket Chandelier with Glass Shades - 1-Step - Gold Finish - Approx. 3 ft Dia x 2-2.5 ft H",
  ]);
});

test("does not group products with different images", () => {
  const items = [
    { image: "/one.webp", is_custom: true, name: "First Chandelier" },
    { image: "/two.webp", is_custom: true, name: "Second Chandelier" },
  ];
  expect(harmoniseCustomVariantNames(items)).toEqual(items);
});
