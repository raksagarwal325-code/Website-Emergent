import {
  filterCollectionProducts,
  getCollection,
  selectDiverseCollectionPreview,
} from "../constants/collections";

describe("Gulzar collection v2", () => {
  const gulzar = getCollection("gulzar");

  test("uses only owner-confirmed Gulzar SKUs and corrects display names in collection UI", () => {
    const items = [
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

  test("preview represents as many different categories as possible before adding variants", () => {
    const items = [
      { id: "current", sku: "SGE-FL-015", category: "Floor Chandelier" },
      { id: "tl17", sku: "SGE-TL-017", category: "Table Lamp" },
      { id: "tl18", sku: "SGE-TL-018", category: "Table Lamp" },
      { id: "future-ch", sku: "FUTURE-CH", category: "Chandelier" },
      { id: "future-wl", sku: "FUTURE-WL", category: "Wall Light" },
      { id: "future-hl", sku: "FUTURE-HL", category: "Hanging Light" },
    ];

    const selected = selectDiverseCollectionPreview(items, "SGE-FL-015", 5);

    expect(selected.map((product) => product.category)).toEqual([
      "Floor Chandelier",
      "Table Lamp",
      "Chandelier",
      "Wall Light",
      "Hanging Light",
    ]);
  });

  test("current piece may represent its category when it is the only confirmed member of that category", () => {
    const items = [
      { id: "current", sku: "SGE-FL-015", category: "Floor Chandelier" },
      { id: "tl17", sku: "SGE-TL-017", category: "Table Lamp" },
      { id: "tl18", sku: "SGE-TL-018", category: "Table Lamp" },
    ];

    expect(selectDiverseCollectionPreview(items, "SGE-FL-015", 3).map((p) => p.sku)).toEqual([
      "SGE-FL-015",
      "SGE-TL-017",
      "SGE-TL-018",
    ]);
  });
});
