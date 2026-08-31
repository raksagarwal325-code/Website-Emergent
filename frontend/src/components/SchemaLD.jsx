import { useEffect } from "react";

/**
 * Remove product shipping timing that is not backed by a fixed transit-time
 * promise. Public copy states dispatch is typically 7–10 business days while
 * transit varies by destination, so exposing a hard 7–10 day transit window in
 * Product JSON-LD would be more specific than the business can truthfully claim.
 */
export function sanitizeSchemaData(data) {
  if (!data || data["@type"] !== "Product") return data;

  const shippingDetails = data?.offers?.shippingDetails;
  if (!shippingDetails?.deliveryTime?.transitTime) return data;

  const next = {
    ...data,
    offers: {
      ...data.offers,
      shippingDetails: {
        ...shippingDetails,
      },
    },
  };

  const deliveryTime = { ...shippingDetails.deliveryTime };
  delete deliveryTime.transitTime;

  if (Object.keys(deliveryTime).length > 1 || Object.keys(deliveryTime).some((key) => key !== "@type")) {
    next.offers.shippingDetails.deliveryTime = deliveryTime;
  } else {
    delete next.offers.shippingDetails.deliveryTime;
  }

  return next;
}

/**
 * Injects a JSON-LD schema.org script into <head>, keyed by `id`.
 * On unmount, removes the script so per-page schemas don't leak across routes.
 * Google/Bing crawl JS-rendered JSON-LD.
 */
export default function SchemaLD({ id, data }) {
  useEffect(() => {
    if (!id || !data) return;
    let el = document.head.querySelector(`script[data-schema="${id}"]`);
    if (!el) {
      el = document.createElement("script");
      el.setAttribute("type", "application/ld+json");
      el.setAttribute("data-schema", id);
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(sanitizeSchemaData(data));
    return () => {
      const stale = document.head.querySelector(`script[data-schema="${id}"]`);
      if (stale) stale.remove();
    };
  }, [id, data]);
  return null;
}
