import { buildItemList, CATALOG_PAGE_SIZE } from "./listingSchema";

describe("buildItemList", () => {
  test("uses exact visible products and global positions across pages", () => {
    const products = [
      { id: "p-25", name: "Visible Product 25" },
      { id: "p-26", name: "Visible Product 26" },
    ];

    const schema = buildItemList(products, {
      page: 2,
      pageSize: CATALOG_PAGE_SIZE,
    });

    expect(schema["@type"]).toBe("ItemList");
    expect(schema.numberOfItems).toBe(2);
    expect(schema.itemListElement).toEqual([
      {
        "@type": "ListItem",
        "position": 25,
        "url": "https://samratglass.com/product/p-25",
        "name": "Visible Product 25",
      },
      {
        "@type": "ListItem",
        "position": 26,
        "url": "https://samratglass.com/product/p-26",
        "name": "Visible Product 26",
      },
    ]);
  });
});
