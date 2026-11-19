// Keep this dependency-free and CommonJS-compatible for the Node prerender.
const plain = value => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const shorten = (value, limit) => {
  if (value.length <= limit) return value;
  const prefix = value.slice(0, Math.max(0, limit - 1));
  const boundary = prefix.lastIndexOf(" ");
  return (boundary > limit * 0.65 ? prefix.slice(0, boundary) : prefix).trimEnd() + "…";
};

function productMetaDescription(product = {}) {
  const sku = plain(product.sku);
  const code = sku && !/^(?:tbd|n[ /-]?a|unknown)$/i.test(sku) ? sku : plain(product.id);
  const reference = code ? " Ref: " + code + "." : "";
  const origin = " — handcrafted in Firozabad by Samrat Glass Emporium.";
  const name = plain(product.name) || "Decorative lighting";
  const budget = Math.max(1, 155 - origin.length - reference.length);
  // The approved catalogue name contains the product-specific design facts.
  // Add a source sentence only when it fits intact and is not redundant.
  const detail = plain(product.short_description || product.description).match(/^[^.!?]+[.!?]?/)?.[0] || "";
  const extra = detail.replace(/[.!?]+$/, "");
  const withDetail = name + ". " + extra;
  const useDetail = extra && withDetail.length <= budget && !name.toLowerCase().includes(extra.toLowerCase()) && !/firozabad|samrat glass|handcraft/i.test(extra);
  return shorten(useDetail ? withDetail : name, budget) + origin + reference;
}

module.exports = { productMetaDescription };
