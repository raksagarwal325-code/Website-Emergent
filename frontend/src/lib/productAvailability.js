/**
 * Product availability helpers for schema.org output and visible UI copy.
 *
 * Google no longer accepts `MadeToOrder` for Product rich results, so we
 * normalise every published product's schema status to a supported enum:
 *   * Number(stock) > 0                     -> InStock
 *   * published && Number(stock) <= 0       -> PreOrder   (schema fallback)
 *   * unpublished                           -> null       (no schema)
 *
 * Important: the schema fallback is not enough evidence to show a customer-
 * facing "Pre-order" message. A zero/unknown stock value only tells us that
 * ready stock is not confirmed; it does not prove the item is explicitly a
 * pre-order. Visible pre-order copy therefore requires an explicit product
 * flag while the generic UI can continue to say "Available on request".
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
 * True only when the product is explicitly marked as a pre-order / made-to-
 * order item. Do not infer this from stock=0: many enquiry-based catalogue
 * items intentionally have no ready-stock count and should simply display
 * "Available on request" instead of a second, potentially conflicting label.
 */
export function isMadeToOrder(product) {
  if (!product || typeof product !== "object") return false;
  if (product.status && product.status !== "published") return false;
  return product.made_to_order === true ||
    product.preorder === true ||
    String(product.availability || "").toLowerCase() === "preorder";
}

export const AVAILABILITY = SCHEMA_URLS;
