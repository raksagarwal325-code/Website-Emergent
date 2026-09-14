import {
  getVariantFamilies,
  suggestVariantFamilies,
  variantAxes,
  variantBaseName,
} from "./variantFamilies";

const product = (id, name, category, specs = {}) => ({ id, sku: `SGE-${id}`, name, category, specs });

test("same design names become review suggestions, not approved families", () => {
  const items = [
    product("1", "Neelpushp Amber Glass Eight-Light Chandelier", "Chandelier"),
    product("2", "Neelpushp Cobalt-Blue Glass Eight-Light Chandelier", "Chandelier"),
    product("3", "Unrelated Floor Lamp", "Floor Lamp"),
  ];
  expect(variantBaseName(items[0].name)).toBe("neelpushp");
  const suggestions = suggestVariantFamilies(items, []);
  expect(suggestions).toHaveLength(1);
  expect(suggestions[0].products.map((item) => item.id)).toEqual(["1", "2"]);
  expect(getVariantFamilies({ homepage_content: {} })).toEqual([]);
});

test("selector exposes only attributes that actually differ", () => {
  const items = [
    product("1", "Rajsi", "Chandelier", { "Glass Colour": "Amber", Finish: "Antique Brass", "Number of Lights": "8" }),
    product("2", "Rajsi", "Chandelier", { "Glass Colour": "Clear", Finish: "Antique Brass", "Number of Lights": "8" }),
    product("3", "Rajsi", "Table Lamp", { "Glass Colour": "Clear", Finish: "Nickel", "Number of Lights": "1" }),
  ];
  const axes = variantAxes(items);
  expect(axes.map((axis) => axis.key)).toEqual(["glass_colour", "metal_finish", "lights", "use"]);
  expect(axes.find((axis) => axis.key === "use").values).toEqual(["Chandelier", "Chandelier", "Table Lamp"]);
});

test("already approved products are excluded from new suggestions", () => {
  const items = [product("1", "Neelpushp Amber Chandelier", "Chandelier"), product("2", "Neelpushp Blue Chandelier", "Chandelier")];
  expect(suggestVariantFamilies(items, [{ product_ids: ["1", "2"] }])).toEqual([]);
});
