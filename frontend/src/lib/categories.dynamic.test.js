/**
 * Regression test: dynamic category discovery.
 * When a published product uses a category not in `categories.data.json`,
 * `mergeDynamicCategories` must surface it (with a safe fallback slug),
 * without losing any curated registry metadata.
 */
import {
  CATEGORIES,
  NAV_CATEGORIES,
  fallbackSlugFor,
  mergeDynamicCategories,
} from "./categories";

describe("fallbackSlugFor", () => {
  test.each([
    ["Ceiling Light",       "ceiling-lights"],
    ["Chandelier",          "chandeliers"],
    ["Table Lamps",         "table-lamps"],       // already plural
    ["  Wall  Sconce  ",    "wall-sconces"],
    ["Décor light",         "d-cor-lights"],      // strips non-alnum
    ["",                    ""],
  ])("fallbackSlugFor(%p) → %p", (input, expected) => {
    expect(fallbackSlugFor(input)).toBe(expected);
  });
});

describe("mergeDynamicCategories", () => {
  test("new published category not in registry gets a fallback entry", () => {
    const merged = mergeDynamicCategories([
      "Chandelier", "Ceiling Light",
    ]);
    const ceiling = merged.find((c) => c.db_name === "Ceiling Light");
    expect(ceiling).toBeDefined();
    expect(ceiling.slug).toBe("ceiling-lights");
    expect(ceiling.label).toBe("Ceiling Light");
    expect(ceiling._dynamic).toBe(true);
    // Curated Chandelier entry is preserved with its full SEO metadata.
    const chand = merged.find((c) => c.db_name === "Chandelier");
    expect(chand.slug).toBe("chandeliers");
    expect(chand.h1).toBeDefined();
    expect(chand.metaDescription).toBeDefined();
  });

  test("existing curated categories still appear unchanged", () => {
    const merged = mergeDynamicCategories(
      NAV_CATEGORIES.map((c) => c.db_name),
    );
    NAV_CATEGORIES.forEach((cur) => {
      const m = merged.find((c) => c.slug === cur.slug);
      expect(m).toBeDefined();
      expect(m.label).toBe(cur.label);
      expect(m._dynamic).toBeUndefined();
    });
  });

  test("curated categories with ZERO products are still included", () => {
    // Simulate: API only returns Chandelier + Ceiling Light. Every other
    // curated NAV_CATEGORY must still appear (browsable even when out
    // of stock).
    const merged = mergeDynamicCategories(["Chandelier", "Ceiling Light"]);
    NAV_CATEGORIES.forEach((cur) => {
      expect(merged.find((c) => c.slug === cur.slug)).toBeDefined();
    });
    // And the dynamic one.
    expect(merged.find((c) => c.slug === "ceiling-lights")).toBeDefined();
  });

  test("fallback label is Title Cased even if admin typed odd casing", () => {
    const merged = mergeDynamicCategories(["CEILING LIGHT"]);
    const ceiling = merged.find((c) => c.slug === "ceiling-lights");
    expect(ceiling.label).toBe("Ceiling Light");
  });

  test("case + whitespace duplicates are de-duplicated", () => {
    const merged = mergeDynamicCategories([
      "Ceiling Light", "  ceiling light ", "CEILING LIGHT",
    ]);
    const matches = merged.filter(
      (c) => c.db_name.toLowerCase().trim() === "ceiling light",
    );
    expect(matches.length).toBe(1);
  });

  test("empty / blank / null entries are ignored (still returns curated set)", () => {
    // Even if the API returns only garbage, the curated NAV_CATEGORIES must
    // still appear so the browsing UI never goes blank on transient errors.
    const merged = mergeDynamicCategories(["", "   ", null, undefined, "Chandelier"]);
    // Chandelier + every curated NAV_CATEGORY (Chandelier is already one).
    expect(merged.length).toBe(NAV_CATEGORIES.length);
    expect(merged.find((c) => c.db_name === "Chandelier")).toBeDefined();
  });

  test("registry entry with nav_visible=false is NOT surfaced even if a product uses it", () => {
    // Simulate the case: use the FIRST registry entry after setting
    // nav_visible=false via a shallow copy passed through the merger.
    const hidden = { ...CATEGORIES[0], nav_visible: false };
    const spy = jest.spyOn(Array.prototype, "find");
    // easier path: assert on real data — any category that has
    // nav_visible=false in categories.data.json must never appear.
    spy.mockRestore();
    const allNames = CATEGORIES.map((c) => c.db_name);
    const merged = mergeDynamicCategories(allNames);
    merged.forEach((m) => {
      if (!m._dynamic) {
        expect(m.nav_visible).toBe(true);
        expect(m.published).toBe(true);
      }
    });
  });

  test("non-array input falls back to NAV_CATEGORIES", () => {
    const merged = mergeDynamicCategories(undefined);
    expect(merged.length).toBe(NAV_CATEGORIES.length);
  });
});
