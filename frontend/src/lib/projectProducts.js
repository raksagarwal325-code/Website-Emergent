const trimTerminalPunctuation = (value = "") => String(value).trim().replace(/[.!?]+$/g, "");

export function isStandardCatalogueConfiguration(value) {
  return trimTerminalPunctuation(value).toLowerCase() === "standard catalogue configuration";
}

export function projectConfigurationLabel(value) {
  return isStandardCatalogueConfiguration(value) ? "Configuration" : "Customisation";
}

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
  const pieceText = linked.length > 1 ? "catalogue pieces" : "catalogue piece";
  const cleanCustomisation = trimTerminalPunctuation(customisation);

  let configurationSentence = "";
  if (cleanCustomisation) {
    configurationSentence = isStandardCatalogueConfiguration(cleanCustomisation)
      ? " The installation uses the standard catalogue configuration."
      : ` Customisation: ${cleanCustomisation}.`;
  }

  return `${location ? `This ${location} installation uses` : "This installation uses"} ${productText}, linked directly to the exact Samrat Glass Emporium ${pieceText}. The photographs on this page are from the real client space.${configurationSentence}`;
}
