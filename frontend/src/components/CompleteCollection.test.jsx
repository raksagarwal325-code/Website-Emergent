import {
  collectionLabelTag,
  collectionMembershipTag,
  filterCollectionProducts,
  getCollectionFromProducts,
  getCollectionForProduct,
  selectDiverseCollectionPreview,
} from "../constants/collections";

describe("data-driven collections", () => {
  test("keeps the legacy Gulzar mapping until Admin saves explicit tags and uses actual product names", () => {
    const items = [
      { id: "ch54", sku: "SGE-CH-054", name: "Gulzar Neelam Six-Light Glass Chandelier", category: "Chandelier", tags: [] },
      { id: "fl15", sku: "SGE-FL-015", name: "Gulzar Clear Glass Floor Chandelier — Five Light", category: "Floor Chandelier", tags: [] },
      { id: "17", sku: "SGE-TL-017", name: "Pankhuri Ribbed Glass Table Lamp — Crystal Clear", category: "Table Lamp", tags: [] },
      { id: "wrong", sku: "SGE-HL-021", name: "Not Gulzar", category: "Hanging Light", tags: [] },
    ];
    const gulzar = getCollectionFromProducts(items, "gulzar");
    expect(filterCollectionProducts(items, gulzar).map((p) => p.sku)).toEqual([
      "SGE-CH-054", "SGE-FL-015", "SGE-TL-017",
    ]);
    expect(filterCollectionProducts(items, gulzar).find((p) => p.sku === "SGE-TL-017").name)
      .toBe("Pankhuri Ribbed Glass Table Lamp — Crystal Clear");
  });

  test("explicit Admin tags become the source of truth and old display tags cannot rename products", () => {
    const items = [
      { id: "a", sku: "A-1", name: "Stored Name", category: "Chandelier", tags: [
        collectionMembershipTag("rajdarbar"),
        collectionLabelTag("rajdarbar", "Rajdarbar"),
        "collection-display:rajdarbar:Rajdarbar%20Display%20Name",
      ] },
      { id: "b", sku: "B-1", name: "Lamp", category: "Table Lamp", tags: [collectionMembershipTag("rajdarbar")] },
      { id: "c", sku: "C-1", name: "Other", category: "Floor Lamp", tags: [] },
    ];
    const collection = getCollectionFromProducts(items, "rajdarbar");
    expect(collection.name).toBe("Rajdarbar");
    expect(filterCollectionProducts(items, collection).map((p) => p.sku)).toEqual(["A-1", "B-1"]);
    expect(filterCollectionProducts(items, collection)[0].name).toBe("Stored Name");
    expect(getCollectionForProduct(items, items[1]).slug).toBe("rajdarbar");
  });

  test("preview represents different categories before additional variants", () => {
    const items = [
      { sku: "FL", category: "Floor Chandelier" },
      { sku: "CH1", category: "Chandelier" },
      { sku: "CH2", category: "Chandelier" },
      { sku: "TL1", category: "Table Lamp" },
      { sku: "TL2", category: "Table Lamp" },
    ];
    const selected = selectDiverseCollectionPreview(items, "FL", 5, ["CH2"]);
    expect(selected.slice(0, 3).map((p) => p.category)).toEqual([
      "Floor Chandelier", "Chandelier", "Table Lamp",
    ]);
    expect(selected[1].sku).toBe("CH2");
  });
});
