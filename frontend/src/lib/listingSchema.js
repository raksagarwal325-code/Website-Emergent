import { SITE_ORIGIN } from "./categories";

export const CATALOG_PAGE_SIZE = 24;

export function buildItemList(products = [], { page = 1, pageSize = CATALOG_PAGE_SIZE } = {}) {
  const visibleProducts = Array.isArray(products) ? products : [];
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const safePageSize = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0
    ? Number(pageSize)
    : CATALOG_PAGE_SIZE;
  const offset = (safePage - 1) * safePageSize;

  return {
    "@type": "ItemList",
    "numberOfItems": visibleProducts.length,
    "itemListElement": visibleProducts.map((product, index) => ({
      "@type": "ListItem",
      "position": offset + index + 1,
      "url": `${SITE_ORIGIN}/product/${product.id}`,
      "name": product.name,
    })),
  };
}
