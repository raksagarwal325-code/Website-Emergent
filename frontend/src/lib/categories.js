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
