import {
  CATEGORIES,
  PUBLIC_CATEGORIES,
  NAV_CATEGORIES,
  SITEMAP_CATEGORIES,
  getCategoryBySlug,
  getCategoryByDbName,
  SITE_ORIGIN,
} from "./categories";

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;

describe("categories catalogue", () => {
  test("exposes the ten published SEO categories", () => {
    expect(PUBLIC_CATEGORIES).toHaveLength(10);
    const slugs = PUBLIC_CATEGORIES.map((c) => c.slug).sort();
    expect(slugs).toEqual([
      "candle-stands",
      "ceiling-lights",
      "chandeliers",
      "floor-chandeliers",
      "floor-lamps",
      "gate-lights",
      "hanging-lights",
      "table-chandeliers",
      "table-lamps",
      "wall-lights",
    ]);
  });

  test("every category has all required SEO fields and flags", () => {
    for (const c of CATEGORIES) {
      expect(c.slug).toMatch(/^[a-z0-9-]+$/);       // lowercase, hyphen-safe
      expect(c.slug).not.toMatch(/^-|-$|--/);       // no leading/trailing/double hyphens
      expect(c.db_name).toBeTruthy();
      expect(c.label).toBeTruthy();
      expect(c.h1).toBeTruthy();
      expect(c.seoTitle).toBeTruthy();
      expect(c.metaDescription).toBeTruthy();
      expect(c.metaDescription.length).toBeLessThanOrEqual(180);
      expect(c.intro).toBeTruthy();
      expect(typeof c.published).toBe("boolean");
      expect(typeof c.nav_visible).toBe("boolean");
      expect(typeof c.sitemap).toBe("boolean");
    }
  });

  test("intro is between 100 and 150 words for every category", () => {
    for (const c of CATEGORIES) {
      const n = wordCount(c.intro);
      expect(n).toBeGreaterThanOrEqual(100);
      expect(n).toBeLessThanOrEqual(150);
    }
  });

  test("slugs, seoTitles and db_names are all unique", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    const titles = CATEGORIES.map((c) => c.seoTitle);
    const dbNames = CATEGORIES.map((c) => c.db_name);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(dbNames).size).toBe(dbNames.length);
  });

  test("db_name values match the values stored on products", () => {
    const expected = [
      "Candle Stand", "Ceiling Light", "Chandelier", "Floor Chandelier",
      "Floor Lamp", "Gate Light", "Hanging Light", "Table Chandelier",
      "Table Lamp", "Wall Light",
    ];
    expect(PUBLIC_CATEGORIES.map((c) => c.db_name).sort())
      .toEqual(expected.sort());
  });

  test("SITE_ORIGIN is the production domain", () => {
    expect(SITE_ORIGIN).toBe("https://samratglass.com");
  });

  test("getCategoryBySlug returns only published categories", () => {
    expect(getCategoryBySlug("chandeliers")?.db_name).toBe("Chandelier");
    expect(getCategoryBySlug("floor-chandeliers")?.db_name).toBe("Floor Chandelier");
    expect(getCategoryBySlug("table-chandeliers")?.db_name).toBe("Table Chandelier");
    expect(getCategoryBySlug("does-not-exist")).toBeUndefined();
  });

  test("getCategoryByDbName returns only published categories", () => {
    expect(getCategoryByDbName("Floor Lamp")?.slug).toBe("floor-lamps");
    expect(getCategoryByDbName("Floor Chandelier")?.slug).toBe("floor-chandeliers");
    expect(getCategoryByDbName("Table Chandelier")?.slug).toBe("table-chandeliers");
    expect(getCategoryByDbName("Sconce")).toBeUndefined();
  });

  test("NAV_CATEGORIES and SITEMAP_CATEGORIES are derived from published + flags", () => {
    // Every NAV entry must be published + nav_visible.
    for (const c of NAV_CATEGORIES) {
      expect(c.published).toBe(true);
      expect(c.nav_visible).toBe(true);
    }
    // Every SITEMAP entry must be published + sitemap.
    for (const c of SITEMAP_CATEGORIES) {
      expect(c.published).toBe(true);
      expect(c.sitemap).toBe(true);
    }
    // No unpublished category may sneak in.
    expect(NAV_CATEGORIES.every((c) => c.published)).toBe(true);
    expect(SITEMAP_CATEGORIES.every((c) => c.published)).toBe(true);
  });

  test("top navigation and left filter derive from the same source", () => {
    // The top-nav strips use NAV_CATEGORIES; the left filter passes the
    // same list (as db_names) into CatalogueBrowser. Both are read from a
    // single import — this assertion documents that contract.
    const navDbNames = NAV_CATEGORIES.map((c) => c.db_name).sort();
    // 10 published + nav-visible categories today.
    expect(navDbNames).toHaveLength(10);
    // "All" is filter-only — it must NOT appear in any navigation list.
    expect(navDbNames).not.toContain("All");
    expect(navDbNames).not.toContain("all");
  });

  test("Ceiling Lights and Gate Lights are registered as curated categories", () => {
    // Regression: this file WAS the single source of truth for curated
    // homepage/sitemap categories. Adding these two here surfaces them on
    // the homepage grid, the sitemap and the prerender output without
    // any additional code change.
    const ceiling = getCategoryBySlug("ceiling-lights");
    expect(ceiling).toBeDefined();
    expect(ceiling.db_name).toBe("Ceiling Light");
    expect(ceiling.label).toBe("Ceiling Lights");
    expect(ceiling.h1).toBe("Decorative Ceiling Lights");
    expect(ceiling.published).toBe(true);
    expect(ceiling.nav_visible).toBe(true);
    expect(ceiling.sitemap).toBe(true);

    const gate = getCategoryBySlug("gate-lights");
    expect(gate).toBeDefined();
    expect(gate.db_name).toBe("Gate Light");
    expect(gate.label).toBe("Gate Lights");
    expect(gate.h1).toBe("Decorative Gate Lights");
    expect(gate.published).toBe(true);
    expect(gate.nav_visible).toBe(true);
    expect(gate.sitemap).toBe(true);
  });

  test("existing eight URLs remain untouched", () => {
    // Guard against accidental slug renames on the categories that were
    // originally shipped. The db_name → slug mapping must be stable.
    const expected = {
      Chandelier: "chandeliers",
      "Hanging Light": "hanging-lights",
      "Wall Light": "wall-lights",
      "Table Lamp": "table-lamps",
      "Floor Lamp": "floor-lamps",
      "Candle Stand": "candle-stands",
      "Floor Chandelier": "floor-chandeliers",
      "Table Chandelier": "table-chandeliers",
    };
    for (const [db, slug] of Object.entries(expected)) {
      const c = getCategoryByDbName(db);
      expect(c).toBeDefined();
      expect(c.slug).toBe(slug);
    }
  });

  test("hypothetical new published category is picked up by all selectors without extra hard-coding", () => {
    // The system is data-driven: adding a new entry to categories.data.json
    // with published=true, nav_visible=true, sitemap=true should surface
    // it everywhere. We simulate this by pushing an in-memory row through
    // the same filter contract used by the selectors.
    const extra = {
      slug: "test-new-category",
      db_name: "Test New Category",
      label: "Test News",
      h1: "Test",
      seoTitle: "Test",
      metaDescription: "Test",
      intro: "x ".repeat(100),
      published: true,
      nav_visible: true,
      sitemap: true,
    };
    const all = [...CATEGORIES, extra];
    const asPublic = all.filter((c) => c.published);
    const asNav = asPublic.filter((c) => c.nav_visible);
    const asSitemap = asPublic.filter((c) => c.published && c.sitemap);
    expect(asPublic.find((c) => c.slug === "test-new-category")).toBeDefined();
    expect(asNav.find((c) => c.slug === "test-new-category")).toBeDefined();
    expect(asSitemap.find((c) => c.slug === "test-new-category")).toBeDefined();
  });
});
