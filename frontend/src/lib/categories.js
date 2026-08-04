/**
 * Single-source category catalogue for the whole app.
 *
 * `categories.data.json` is the ONLY place that lists SEO-visible
 * categories. Every consumer — homepage grid, catalogue filter, footer
 * strip, cross-category link row on a category page, the /api/sitemap.xml
 * backend endpoint and the build-time prerender script — reads from here.
 *
 * Flag semantics:
 *   * published    → category is real; its /category/<slug> page is
 *                    routable and prerendered
 *   * nav_visible  → appears in "Browse by category" strips (catalog,
 *                    footer), homepage grid and cross-category rows
 *   * sitemap      → included in the XML sitemap
 *
 * A category that is not `published` is treated as if it doesn't exist by
 * the public site (getCategoryBySlug returns undefined, so the CategoryPage
 * renders the NotFound view). Admin flows that need the raw list can read
 * `CATEGORIES` directly.
 */
import data from "./categories.data.json";

/** Every entry, flags and all. Prefer the filtered selectors below. */
export const CATEGORIES = data.categories;

/** Everything the public site is allowed to know about. */
export const PUBLIC_CATEGORIES = CATEGORIES.filter((c) => c.published);

/** Categories shown in cross-app navigation strips (catalog / footer /
 *  homepage grid / cross-links). */
export const NAV_CATEGORIES = CATEGORIES.filter(
  (c) => c.published && c.nav_visible,
);

/** Categories emitted in /api/sitemap.xml. Kept in sync with the backend
 *  (which reads the same JSON file). */
export const SITEMAP_CATEGORIES = CATEGORIES.filter(
  (c) => c.published && c.sitemap,
);

/** Public site origin for canonical URLs. Never links to the preview host. */
export const SITE_ORIGIN = "https://samratglass.com";

/**
 * Lookup by URL slug ("chandeliers"). Only returns published categories —
 * unpublished slugs surface the NotFound view. Callers that need the raw
 * lookup (e.g. admin) can filter `CATEGORIES` directly.
 */
export const getCategoryBySlug = (slug) =>
  PUBLIC_CATEGORIES.find((c) => c.slug === slug);

/**
 * Lookup by canonical DB name ("Chandelier"). Used when translating a
 * legacy `?category=<db_name>` URL to its clean-path equivalent.
 */
export const getCategoryByDbName = (name) =>
  PUBLIC_CATEGORIES.find((c) => c.db_name === name);

/**
 * Deterministic slug generator for categories that aren't in the curated
 * registry yet — e.g. a fresh admin uploads a product with
 * `category = "Ceiling Light"` and no one has enriched it with SEO
 * metadata. We generate `ceiling-lights` (lowercased, kebab-cased,
 * simply-pluralised) so the fallback slug matches the naming
 * convention already used by registry entries (`chandeliers`,
 * `hanging-lights`, `wall-lights`, `table-lamps`).
 */
export const fallbackSlugFor = (dbName) => {
  const base = String(dbName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .trim();
  if (!base) return "";
  // Add a naive plural s if the word doesn't already end in one — matches
  // the convention of the registry ("Chandelier" → "chandeliers").
  return base.endsWith("s") ? base : `${base}s`;
};

/**
 * Merge a live-from-API list of published-product db_names with the
 * curated registry. Published-product db_names are the source of truth;
 * the registry only ENRICHES known ones with SEO metadata (slug, label,
 * intro, hero image). Unknown db_names get a safe fallback slug and use
 * the db_name itself as the label.
 *
 * De-duplication is case + whitespace insensitive so "  ceiling light "
 * and "Ceiling Light" never appear as two separate categories.
 */
export const mergeDynamicCategories = (dbNames) => {
  if (!Array.isArray(dbNames)) return [...NAV_CATEGORIES];
  const seen = new Set();
  const out = [];
  // Helper: title-case for auto-generated labels so admin-typed
  // "ceiling light" / "CEILING LIGHT" doesn't leak weird casing into the UI.
  const titleCase = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/\b(\w)/g, (m) => m.toUpperCase());

  const pushRegistry = (registryEntry) => {
    const key = String(registryEntry.db_name || "").toLowerCase();
    if (seen.has(key)) return;
    if (!registryEntry.published || !registryEntry.nav_visible) return;
    seen.add(key);
    out.push(registryEntry);
  };

  for (const raw of dbNames) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    const registryEntry = CATEGORIES.find(
      (c) => String(c.db_name || "").toLowerCase() === key,
    );
    if (registryEntry) {
      pushRegistry(registryEntry);
      continue;
    }
    // Fallback for a brand-new db_name.
    seen.add(key);
    out.push({
      slug: fallbackSlugFor(trimmed),
      db_name: trimmed,
      label: titleCase(trimmed),
      published: true,
      nav_visible: true,
      sitemap: false,     // don't auto-add to sitemap without curator review
      _dynamic: true,     // marker so callers can style/skip curated-only UIs
    });
  }
  // Finally: make sure every curated nav-visible category is included,
  // even if no product currently uses it. This preserves the "always
  // browsable" invariant for curated categories (a category with zero
  // stock still deserves a discoverable page).
  for (const cur of NAV_CATEGORIES) {
    pushRegistry(cur);
  }
  return out;
};
