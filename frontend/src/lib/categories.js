/**
 * Single-source category catalogue.
 * Reads from `categories.data.json` — the same JSON file used by the
 * build-time prerender script (`scripts/prerender-categories.js`). Both
 * webpack (via CRA) and Node can `require`/`import` this file, so we
 * never have to duplicate the list.
 */
import data from "./categories.data.json";

export const CATEGORIES = data.categories;

/** Public site origin for canonical URLs. Never links to the preview host. */
export const SITE_ORIGIN = "https://samratglass.com";

/** Lookup by URL slug ("chandeliers"). Returns `undefined` for invalid slugs
 *  so callers can surface a 404 instead of guessing. */
export const getCategoryBySlug = (slug) =>
  CATEGORIES.find((c) => c.slug === slug);

/** Lookup by canonical DB name ("Chandelier"). Used when translating a legacy
 *  `?category=<db_name>` URL to its clean-path equivalent. */
export const getCategoryByDbName = (name) =>
  CATEGORIES.find((c) => c.db_name === name);
