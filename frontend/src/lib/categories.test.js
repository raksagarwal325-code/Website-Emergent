import { CATEGORIES, getCategoryBySlug, getCategoryByDbName, SITE_ORIGIN } from "./categories";

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;

describe("categories catalogue", () => {
  test("exposes exactly the six SEO categories", () => {
    expect(CATEGORIES).toHaveLength(6);
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(slugs.sort()).toEqual([
      "candle-stands",
      "chandeliers",
      "floor-lamps",
      "hanging-lights",
      "table-lamps",
      "wall-lights",
    ]);
  });

  test("every category has all required SEO fields", () => {
    for (const c of CATEGORIES) {
      expect(c.slug).toMatch(/^[a-z0-9-]+$/);
      expect(c.db_name).toBeTruthy();
      expect(c.label).toBeTruthy();
      expect(c.h1).toBeTruthy();
      expect(c.seoTitle).toBeTruthy();
      expect(c.metaDescription).toBeTruthy();
      expect(c.metaDescription.length).toBeLessThanOrEqual(180);
      expect(c.intro).toBeTruthy();
    }
  });

  test("intro is between 100 and 150 words for every category", () => {
    for (const c of CATEGORIES) {
      const n = wordCount(c.intro);
      expect(n).toBeGreaterThanOrEqual(100);
      expect(n).toBeLessThanOrEqual(150);
    }
  });

  test("slugs and seoTitles are all unique", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    const titles = CATEGORIES.map((c) => c.seoTitle);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test("db_name values match the values already stored on products", () => {
    // These must match the canonical DB category strings — mismatches would
    // silently render an empty product list.
    const expected = [
      "Chandelier", "Hanging Light", "Wall Light",
      "Table Lamp", "Floor Lamp", "Candle Stand",
    ];
    expect(CATEGORIES.map((c) => c.db_name).sort())
      .toEqual(expected.sort());
  });

  test("SITE_ORIGIN is the production domain", () => {
    expect(SITE_ORIGIN).toBe("https://samratglass.com");
  });

  test("getCategoryBySlug finds valid slugs and returns undefined otherwise", () => {
    expect(getCategoryBySlug("chandeliers")?.db_name).toBe("Chandelier");
    expect(getCategoryBySlug("does-not-exist")).toBeUndefined();
  });

  test("getCategoryByDbName finds valid names and returns undefined otherwise", () => {
    expect(getCategoryByDbName("Floor Lamp")?.slug).toBe("floor-lamps");
    expect(getCategoryByDbName("Sconce")).toBeUndefined();
  });
});
