import { productImageAlt, galleryImageAlt } from "./imageSeo";

describe("productImageAlt", () => {
  test("combines name, category, sku, brand", () => {
    expect(productImageAlt({
      name: "Ruby Cascade Pendant",
      category: "Chandelier",
      sku: "SGE-CH-004",
    })).toBe("Ruby Cascade Pendant · Chandelier · SGE-CH-004 · Samrat Glass Emporium");
  });

  test("skips category when it is already in the name (no duplication)", () => {
    expect(productImageAlt({
      name: "Rajwada Amber Glass Table Lamp",
      category: "Table Lamp",
      sku: "SGE-TL-084",
    })).toBe("Rajwada Amber Glass Table Lamp · SGE-TL-084 · Samrat Glass Emporium");
  });

  test("differentiates secondary views", () => {
    const primary = productImageAlt({ name: "Cobalt Palace", category: "Chandelier", sku: "SGE-CH-009", view: 1 });
    const secondary = productImageAlt({ name: "Cobalt Palace", category: "Chandelier", sku: "SGE-CH-009", view: 3 });
    expect(primary).not.toMatch(/view/);
    expect(secondary).toMatch(/— view 3$/);
    expect(secondary).not.toBe(primary);
  });

  test("normalises excess whitespace", () => {
    expect(productImageAlt({
      name: "  Ruby   Cascade  ",
      category: "  Chandelier  ",
      sku: "  SGE-CH-004  ",
    })).toBe("Ruby Cascade · Chandelier · SGE-CH-004 · Samrat Glass Emporium");
  });

  test("handles missing fields gracefully", () => {
    expect(productImageAlt({ name: "Solo" })).toBe("Solo · Samrat Glass Emporium");
    expect(productImageAlt({})).toBe("Samrat Glass Emporium");
  });
});

describe("galleryImageAlt", () => {
  test("combines title, location, brand", () => {
    expect(galleryImageAlt({
      title: "Ruby Red Crystal Chandelier – Private Residence",
      location: "Nagpur",
    })).toBe("Ruby Red Crystal Chandelier – Private Residence · Nagpur · Samrat Glass Emporium");
  });

  test("adds detail counter from view 2 onward", () => {
    expect(galleryImageAlt({ title: "Palace Ballroom", location: "Udaipur", view: 2 }))
      .toMatch(/— detail 2$/);
    expect(galleryImageAlt({ title: "Palace Ballroom", location: "Udaipur", view: 1 }))
      .not.toMatch(/detail/);
  });

  test("works without location", () => {
    expect(galleryImageAlt({ title: "Untitled Install" }))
      .toBe("Untitled Install · Samrat Glass Emporium");
  });
});
