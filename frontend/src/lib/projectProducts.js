export function projectProductPresentation(products = []) {
  const linked = Array.isArray(products) ? products.filter(Boolean) : [];
  const count = linked.length;
  const isMulti = count > 1;
  const skuList = linked.map((product) => product.sku).filter(Boolean);
  const namesAndSkus = linked.map((product) => [product.name, product.sku].filter(Boolean).join(" · "));

  return {
    count,
    isMulti,
    heroLabel: count
      ? `${isMulti ? "Catalogue pieces" : "Catalogue piece"} · ${skuList.join(" · ")}`
      : "",
    snapshotLabel: isMulti ? "Products" : "Product",
    snapshotValue: namesAndSkus.join(" • "),
    tocLabel: isMulti ? "The exact catalogue pieces" : "The exact catalogue piece",
    sectionEyebrow: isMulti ? "The catalogue pieces" : "The catalogue piece",
    faqQuestion: isMulti ? "Can I view the exact products used in this project?" : "Can I view the exact product used in this project?",
    faqAnswer: count
      ? `Yes. This project is linked to ${namesAndSkus.join(isMulti ? "; " : "")} in the Samrat Glass Emporium catalogue.`
      : "",
  };
}

export function projectQuickAnswer({ location, customisation, products = [] }) {
  const linked = Array.isArray(products) ? products.filter(Boolean) : [];
  if (!linked.length) {
    return `${location ? `This ${location} project` : "This project"} documents a real Samrat Glass Emporium client installation with photographs from the completed space.`;
  }

  const productText = linked
    .map((product) => `${product.name}${product.sku ? ` (${product.sku})` : ""}`)
    .join(linked.length > 1 ? "; and " : "");
  const verb = linked.length > 1 ? "uses" : "uses";
  const pieceText = linked.length > 1 ? "catalogue pieces" : "catalogue piece";

  return `${location ? `This ${location} installation ${verb}` : `This installation ${verb}`} ${productText}, linked directly to the exact Samrat Glass Emporium ${pieceText}. The photographs on this page are from the real client space${customisation ? `, with ${customisation}` : ""}.`;
}
