const LEGACY_DELIVERY_INFO = "Pan-India shipping · 7–10 business days";
const NORMALIZED_DELIVERY_INFO = "Pan-India shipping · Dispatch typically in 7–10 business days; transit varies by destination";
const LEGACY_SHIPPING_POLICY_TEXT = "Standard delivery usually takes 7–10 business days after order confirmation and payment, depending on product availability, customization, packing time, and delivery location.";
const NORMALIZED_SHIPPING_POLICY_TEXT = "Standard pieces typically dispatch in 7–10 business days after order confirmation and payment; transit time then varies by destination, product size, carrier, and delivery location.";

export function normalizePublicSettings(settings) {
  if (!settings || typeof settings !== "object") return settings;
  if (settings.delivery_info !== LEGACY_DELIVERY_INFO) return settings;
  return { ...settings, delivery_info: NORMALIZED_DELIVERY_INFO };
}

export function normalizePublicLegalPage(slug, page) {
  if (slug !== "shipping" || !page || typeof page !== "object") return page;
  return {
    ...page,
    sections: Array.isArray(page.sections)
      ? page.sections.map((section) => {
        if (!section || typeof section !== "object") return section;
        if (section.heading === "Delivery Timeline" && section.text === LEGACY_SHIPPING_POLICY_TEXT) {
          return { ...section, text: NORMALIZED_SHIPPING_POLICY_TEXT };
        }
        return { ...section };
      })
      : page.sections,
  };
}

export const PUBLIC_DELIVERY_INFO = NORMALIZED_DELIVERY_INFO;
