/**
 * Centralised WhatsApp deep-link builder.
 *
 * Every public "Chat on WhatsApp" / "Enquire on WhatsApp" CTA on the
 * site MUST route through this helper so the prefilled greeting stays
 * consistent (no personal-name greetings like "Rakshit ji"; brand-led
 * "Hi Samrat Glass Emporium, …" everywhere).
 *
 * Admin-only tools that build their own contextual messages (e.g. the
 * admin "reply to enquiry" quick action) are exempt — they're not
 * public and their message is per-customer.
 */

const BRAND_PREFIX = "Hi Samrat Glass Emporium,";

/**
 * Named prefilled messages for each public entry point. Kept in an
 * exported object so unit tests can pin the exact wording.
 */
export const WA_MESSAGES = {
  general:
    `${BRAND_PREFIX} I would like to know more about your lighting collection.`,
  customLighting:
    `${BRAND_PREFIX} I would like to discuss a custom lighting / bulk order requirement.`,
  architects:
    `${BRAND_PREFIX} I would like to discuss a lighting requirement for an architecture/interior project.`,
  gallery:
    `${BRAND_PREFIX} I would like to know more about this project/style and the lighting used in it.`,
  notFound:
    `${BRAND_PREFIX} I landed on a page that could not be found — can you help me find the piece I was looking at?`,
};

const digitsOnly = (n) => String(n || "").replace(/[^0-9]/g, "");

/**
 * Compose the product-page WhatsApp message. Includes the product URL
 * (usually `window.location.href`) if provided so the recipient can
 * jump straight to the piece.
 */
export const productMessage = (product, url) => {
  const nameSku = `${product?.name || "a product"}${
    product?.sku ? ` (${product.sku})` : ""
  }`;
  const base = `${BRAND_PREFIX} I am interested in ${nameSku}. Please share more details.`;
  return url ? `${base}\n${url}` : base;
};

/**
 * Compose the gallery-project product WhatsApp message. Uses the
 * project title as extra context.
 */
export const galleryProductMessage = (product, project) => {
  const nameSku = `${product?.name || "a product"}${
    product?.sku ? ` (SKU: ${product.sku})` : ""
  }`;
  const proj = project?.title ? ` in your "${project.title}" project` : "";
  return `${BRAND_PREFIX} I saw ${nameSku}${proj}. Please share more details.`;
};

/**
 * Compose the inquiry-basket cart WhatsApp message.
 */
export const cartMessage = (items = []) => {
  const lines = items.map(
    (i) => `- ${i.name}${i.sku ? ` (SKU: ${i.sku})` : ""} (x${i.quantity})`,
  );
  return `${BRAND_PREFIX} I would like to enquire about the following items:\n${lines.join("\n")}`;
};

/**
 * Build a wa.me deep link with the given phone number and prefilled
 * message. Returns "" if no number is configured so callers can hide
 * the CTA gracefully.
 */
export const buildWaLink = (number, message) => {
  const digits = digitsOnly(number);
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};

// -----------------------------------------------------------------------
// Convenience wrappers used across pages/components.
// -----------------------------------------------------------------------
export const waGeneralLink = (number) => buildWaLink(number, WA_MESSAGES.general);
export const waCustomLightingLink = (number) => buildWaLink(number, WA_MESSAGES.customLighting);
export const waArchitectsLink = (number) => buildWaLink(number, WA_MESSAGES.architects);
export const waGalleryLink = (number) => buildWaLink(number, WA_MESSAGES.gallery);
export const waNotFoundLink = (number) => buildWaLink(number, WA_MESSAGES.notFound);
export const waProductLink = (number, product, url) =>
  buildWaLink(number, productMessage(product, url));
export const waGalleryProductLink = (number, product, project) =>
  buildWaLink(number, galleryProductMessage(product, project));
export const waCartLink = (number, items) =>
  buildWaLink(number, cartMessage(items));
