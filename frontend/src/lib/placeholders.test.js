/**
 * Regression: stock Unsplash image flash removed.
 *
 * Before: `CategoryShowcase` and the Home hero rendered
 * `https://images.unsplash.com/photo-1513506003901-1e6a229e2d15…` while
 * the real image resolved, briefly flashing a stock photo before the
 * true product/category image loaded.
 *
 * After: the neutral branded SVG placeholder (`data:image/svg+xml;…`)
 * from `frontend/src/lib/placeholders.js` is used everywhere the
 * Unsplash URL previously lived.
 */
import { BRAND_PLACEHOLDER, BRAND_PLACEHOLDER_HERO } from "./placeholders";
import fs from "fs";
import path from "path";

describe("Branded placeholder replaces Unsplash flash", () => {
  test("branded placeholder is an inline data URI (no network fetch)", () => {
    expect(BRAND_PLACEHOLDER.startsWith("data:image/svg+xml")).toBe(true);
    expect(BRAND_PLACEHOLDER_HERO.startsWith("data:image/svg+xml")).toBe(true);
  });

  test("branded placeholders do NOT reference images.unsplash.com", () => {
    expect(BRAND_PLACEHOLDER).not.toContain("unsplash.com");
    expect(BRAND_PLACEHOLDER_HERO).not.toContain("unsplash.com");
  });

  test("CategoryShowcase.jsx no longer contains a hardcoded Unsplash URL", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "components", "CategoryShowcase.jsx"),
      "utf8",
    );
    expect(src).not.toMatch(/images\.unsplash\.com/);
    // And it imports the branded placeholder.
    expect(src).toMatch(/BRAND_PLACEHOLDER/);
  });

  test("Home.jsx no longer contains a hardcoded Unsplash URL", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "pages", "Home.jsx"),
      "utf8",
    );
    expect(src).not.toMatch(/images\.unsplash\.com/);
    // And it imports the hero-variant branded placeholder.
    expect(src).toMatch(/BRAND_PLACEHOLDER_HERO/);
  });
});
