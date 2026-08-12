import { SITE_ORIGIN } from "./categories";

export const CATALOG_PAGE_SIZE = 24;

export function buildItemList(products = [], { page = 1, pageSize = CATALOG_PAGE_SIZE } = {}) {
  const safeProducts = Array.isArray(products)
    ? products.filter((p) => p?.id && p?.name)
    : [];
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const safePageSize = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0
    ? Number(pageSize)
    : CATALOG_PAGE_SIZE;
  const offset = (safePage - 1) * safePageSize;

  return {
    "@type": "ItemList",
    "numberOfItems": safeProducts.length,
    "itemListElement": safeProducts.map((product, index) => ({
      "@type": "ListItem",
      "position": offset + index + 1,
      "url": `${SITE_ORIGIN}/product/${product.id}`,
      "name": product.name,
    })),
  };
}
