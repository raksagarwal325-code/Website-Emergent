const clean = (value = "") => String(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .replace(/-{2,}/g, "-");

const hasUsableSku = (sku) => {
  const value = clean(sku);
  return value && !["tbd", "na", "n-a", "unknown"].includes(value);
};

export function productSlug(product = {}) {
  const name = clean(product.name) || "product";
  const identity = hasUsableSku(product.sku) ? clean(product.sku) : clean(product.id);
  return identity ? `${name}-${identity}` : name;
}

export function productPath(product = {}) {
  return `/product/${productSlug(product)}`;
}

