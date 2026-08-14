import {
  filterCollectionProducts,
  getCollection,
  selectDiverseCollectionPreview,
} from "../constants/collections";

describe("Gulzar collection v2", () => {
  const gulzar = getCollection("gulzar");

  test("uses only owner-confirmed Gulzar SKUs and corrects display names in collection UI", () => {
    const items = [
      { id: "ch54", sku: "SGE-CH-054", name: "Gulzar Neelam Six-Light Glass Chandelier", category: "Chandelier" },
      { id: "ch55", sku: "SGE-CH-055", name: "Gulzar Clear Six-Light Glass Chandelier", category: "Chandelier" },
      { id: "fl15", sku: "SGE-FL-015", name: "Gulzar Clear Glass Floor Chandelier — Five Light", category: "Floor Chandelier" },
      { id: "17", sku: "SGE-TL-017", name: "Pankhuri Ribbed Glass Table Lamp — Crystal Clear", category: "Table Lamp" },
      { id: "18", sku: "SGE-TL-018", name: "Pankhuri Ribbed Glass Table Lamp — Ruby Red", category: "Table Lamp" },
      { id: "19", sku: "SGE-TL-019", name: "Pankhuri Ribbed Glass Table Lamp — Cobalt Blue", category: "Table Lamp" },
      { id: "20", sku: "SGE-TL-020", name: "Pankhuri Ribbed Glass Table Lamp — Amber Gold", category: "Table Lamp" },
      { id: "21", sku: "SGE-TL-021", name: "Pankhuri Ribbed Glass Table Lamp — Emerald Green", category: "Table Lamp" },
      { id: "wrong-hanging", sku: "SGE-HL-021", name: "Gulzar Opaline...", category: "Hanging Light" },
      { id: "wrong-chandelier", sku: "SGE-CH-005", name: "Ruby Red Prism...", category: "Chandelier" },
    ];

    const filtered = filterCollectionProducts(items, gulzar);

    expect(filtered.map((product) => product.sku)).toEqual([
      "SGE-CH-054",
      "SGE-CH-055",
      "SGE-FL-015",
      "SGE-TL-017",
      "SGE-TL-018",
      "SGE-TL-019",
      "SGE-TL-020",
      "SGE-TL-021",
    ]);
    expect(filtered.find((product) => product.sku === "SGE-TL-017").name)
      .toBe("Gulzar Ribbed Glass Table Lamp — Crystal Clear");
  });

  test("preview represents CH, FL and TL before adding same-category variants", () => {
    const items = [
      { id: "current", sku: "SGE-FL-015", category: "Floor Chandelier" },
      { id: "ch54", sku: "SGE-CH-054", category: "Chandelier" },
      { id: "ch55", sku: "SGE-CH-055", category: "Chandelier" },
      { id: "tl17", sku: "SGE-TL-017", category: "Table Lamp" },
      { id: "tl18", sku: "SGE-TL-018", category: "Table Lamp" },
    ];

    const selected = selectDiverseCollectionPreview(items, "SGE-FL-015", 5);

    expect(selected.slice(0, 3).map((product) => product.category)).toEqual([
      "Floor Chandelier",
      "Chandelier",
      "Table Lamp",
    ]);
  });

  test("current piece may represent its category when it is the only confirmed member of that category", () => {
    const items = [
      { id: "current", sku: "SGE-FL-015", category: "Floor Chandelier" },
      { id: "ch54", sku: "SGE-CH-054", category: "Chandelier" },
      { id: "tl17", sku: "SGE-TL-017", category: "Table Lamp" },
    ];

    expect(selectDiverseCollectionPreview(items, "SGE-FL-015", 3).map((p) => p.sku)).toEqual([
      "SGE-FL-015",
      "SGE-CH-054",
      "SGE-TL-017",
    ]);
  });
});
