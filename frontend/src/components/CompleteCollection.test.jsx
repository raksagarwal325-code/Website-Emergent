import { selectGulzarCollection } from "./CompleteCollection";

describe("CompleteCollection Gulzar prototype", () => {
  test("selects only the owner-confirmed Gulzar table-lamp SKUs", () => {
    const items = [
      { id: "17", sku: "SGE-TL-017" },
      { id: "18", sku: "SGE-TL-018" },
      { id: "19", sku: "SGE-TL-019" },
      { id: "20", sku: "SGE-TL-020" },
      { id: "21", sku: "SGE-TL-021" },
      { id: "wrong-hanging", sku: "SGE-HL-021" },
      { id: "wrong-chandelier", sku: "SGE-CH-005" },
      { id: "other", sku: "SGE-TL-022" },
    ];

    expect(selectGulzarCollection(items).map((product) => product.sku)).toEqual([
      "SGE-TL-017",
      "SGE-TL-018",
      "SGE-TL-019",
      "SGE-TL-020",
      "SGE-TL-021",
    ]);
  });

  test("does not infer family membership from names", () => {
    const items = [
      { id: "fake", sku: "SGE-TL-999", name: "Gulzar Something" },
      { id: "17", sku: "SGE-TL-017", name: "Pankhuri Ribbed Glass Table Lamp" },
    ];

    expect(selectGulzarCollection(items).map((product) => product.sku)).toEqual([
      "SGE-TL-017",
    ]);
  });
});
