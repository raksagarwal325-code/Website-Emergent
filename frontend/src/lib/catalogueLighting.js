export const CATALOGUE_LIGHT_MODE_EVENT = "sge:catalogue-light-mode";
export const CATALOGUE_LIGHT_MODE_STORAGE_KEY = "sge.catalogueLightMode";

export function getCatalogueLightImages(product) {
  const fallback = product?.images?.[0] || "";
  const off = product?.catalog_image_off || fallback;
  const on = product?.catalog_image_on || off || fallback;
  return { off, on };
}

export function readCatalogueLightMode() {
  if (typeof window === "undefined") return "on";
  try {
    const stored = window.localStorage.getItem(CATALOGUE_LIGHT_MODE_STORAGE_KEY);
    return stored === "off" ? "off" : "on";
  } catch {
    return "on";
  }
}

export function writeCatalogueLightMode(mode) {
  const next = mode === "on" ? "on" : "off";
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(CATALOGUE_LIGHT_MODE_STORAGE_KEY, next);
  } catch {
    // Storage can be unavailable in private/restricted browsing contexts.
  }
  window.dispatchEvent(new CustomEvent(CATALOGUE_LIGHT_MODE_EVENT, { detail: next }));
  return next;
}
