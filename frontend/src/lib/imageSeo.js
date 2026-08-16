// Reusable helpers that build descriptive alt text and structured strings
// for product/gallery images. Kept dependency-free so it works both from
// browser React code and from Node test harnesses.

const BRAND = "Samrat Glass Emporium";

function normalise(str) {
  return String(str || "")
    .replace(/\s+/g, " ")
    .trim();
}

function includesCategory(name, category) {
  if (!name || !category) return false;
  return name.toLowerCase().includes(String(category).toLowerCase());
}

/**
 * Build alt text for a product image.
 * Falls back gracefully when fields are missing. Adds " — view N" from view 2
 * onward so screen readers and Google can distinguish thumbnails.
 */
export function productImageAlt({ name, category, sku, view = 1 } = {}) {
  const parts = [];
  const cleanName = normalise(name);
  const cleanCategory = normalise(category);
  const cleanSku = normalise(sku);

  if (cleanName) parts.push(cleanName);
  if (cleanCategory && !includesCategory(cleanName, cleanCategory)) parts.push(cleanCategory);
  if (cleanSku) parts.push(cleanSku);
  parts.push(BRAND);

  let alt = parts.join(" · ");
  if (view && Number(view) >= 2) alt += ` — view ${Number(view)}`;
  return normalise(alt);
}

/**
 * Build alt text for a gallery / project image.
 */
export function galleryImageAlt({ title, location, view = 1 } = {}) {
  const parts = [];
  const cleanTitle = normalise(title);
  const cleanLocation = normalise(location);

  if (cleanTitle) parts.push(cleanTitle);
  if (cleanLocation) parts.push(cleanLocation);
  parts.push(BRAND);

  let alt = parts.join(" · ");
  if (view && Number(view) >= 2) alt += ` — detail ${Number(view)}`;
  return normalise(alt);
}
