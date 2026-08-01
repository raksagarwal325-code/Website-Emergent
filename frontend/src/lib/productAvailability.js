/**
 * Product availability helpers for schema.org output and visible UI copy.
 *
 * Google no longer accepts `MadeToOrder` for Product rich results, so we
 * normalise every published product's status to a supported enum value:
 *   * Number(stock) > 0                     -> InStock
 *   * published && Number(stock) <= 0       -> PreOrder   (default)
 *   * unpublished                           -> null       (no schema)
 *
 * Callers MUST skip emitting Product schema entirely when this helper
 * returns null. This matches the product API contract — the public
 * /products endpoint 404s drafts, but we guard defensively.
 *
 * Numeric coercion is intentional: some legacy rows carry `stock` as a
 * string ("0", "5") from CSV imports. `Number("")` and `Number(null)`
 * both coerce to 0/NaN, which falls through the > 0 check to the
 * PreOrder branch — safe.
 */

const SCHEMA_URLS = {
  InStock: "https://schema.org/InStock",
  PreOrder: "https://schema.org/PreOrder",
  BackOrder: "https://schema.org/BackOrder",
  OutOfStock: "https://schema.org/OutOfStock",
};

/**
 * Return the schema.org availability URL for a product, or null when the
 * product must not emit a public product schema at all.
 *
 * @param {{stock?: number|string, status?: string}} product
 * @returns {string|null}
 */
export function schemaAvailabilityFor(product) {
  if (!product || typeof product !== "object") return null;
  if (product.status && product.status !== "published") return null;
  const stock = Number(product.stock);
  if (Number.isFinite(stock) && stock > 0) return SCHEMA_URLS.InStock;
  return SCHEMA_URLS.PreOrder;
}

/**
 * `true` when the product is published *and* not currently in stock — used
 * to decide whether to surface the "Made to order…" note on the product
 * detail page.
 */
export function isMadeToOrder(product) {
  if (!product || typeof product !== "object") return false;
  if (product.status && product.status !== "published") return false;
  const stock = Number(product.stock);
  return !(Number.isFinite(stock) && stock > 0);
}

export const AVAILABILITY = SCHEMA_URLS;
