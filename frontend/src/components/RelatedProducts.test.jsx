import { scoreRelatedProduct, selectRelatedProducts } from "./RelatedProducts";

describe("RelatedProducts relevance ranking", () => {
  const current = {
    id: "current",
    name: "Rajdarbar Etched Hurricane Floor Chandelier — Five-Light",
    category: "Floor Chandelier",
    tags: ["etched", "heritage"],
    specs: {
      Material: "Brass & Glass",
      Finish: "Antique Brass",
      "Number of Lights": "5",
    },
    price: 50000,
    images: ["current.jpg"],
  };

  test("excludes the current product and other categories", () => {
    const items = [
      current,
      { id: "same", name: "Same Category", category: "Floor Chandelier", images: ["a.jpg"] },
      { id: "other", name: "Other Category", category: "Table Lamp", images: ["b.jpg"] },
    ];

    expect(selectRelatedProducts(items, current, 4).map((p) => p.id)).toEqual(["same"]);
  });

  test("ranks stronger shared style signals above catalogue order", () => {
    const catalogueFirstButWeak = {
      id: "weak",
      name: "Noorjahan Prism Floor Chandelier",
      category: "Floor Chandelier",
      tags: ["prism"],
      specs: { Finish: "Chrome" },
      price: 90000,
      images: ["weak.jpg"],
    };
    const catalogueLaterButRelevant = {
      id: "strong",
      name: "Rajdarbar Etched Floor Chandelier — Five-Light",
      category: "Floor Chandelier",
      tags: ["etched", "heritage"],
      specs: {
        Material: "Brass & Glass",
        Finish: "Antique Brass",
        "Number of Lights": "5",
      },
      price: 52000,
      images: ["strong.jpg"],
    };

    const ranked = selectRelatedProducts(
      [catalogueFirstButWeak, catalogueLaterButRelevant],
      current,
      2
    );

    expect(ranked.map((p) => p.id)).toEqual(["strong", "weak"]);
    expect(scoreRelatedProduct(current, catalogueLaterButRelevant))
      .toBeGreaterThan(scoreRelatedProduct(current, catalogueFirstButWeak));
  });

  test("missing metadata is neutral and image availability is only a tie-breaker", () => {
    const noImage = {
      id: "no-image",
      name: "Unrelated Alpha",
      category: "Floor Chandelier",
      tags: [],
      specs: {},
      price: 0,
      images: [],
    };
    const withImage = {
      id: "with-image",
      name: "Unrelated Beta",
      category: "Floor Chandelier",
      tags: [],
      specs: {},
      price: 0,
      images: ["beta.jpg"],
    };

    expect(scoreRelatedProduct(current, noImage)).toBe(0);
    expect(scoreRelatedProduct(current, withImage)).toBe(0);
    expect(selectRelatedProducts([noImage, withImage], current, 2).map((p) => p.id))
      .toEqual(["with-image", "no-image"]);
  });

  test("price proximity contributes softly when both prices are real", () => {
    const closePrice = {
      id: "close",
      name: "Unrelated Close",
      category: "Floor Chandelier",
      tags: [],
      specs: {},
      price: 54000,
      images: ["close.jpg"],
    };
    const farPrice = {
      id: "far",
      name: "Unrelated Far",
      category: "Floor Chandelier",
      tags: [],
      specs: {},
      price: 120000,
      images: ["far.jpg"],
    };

    expect(scoreRelatedProduct(current, closePrice))
      .toBeGreaterThan(scoreRelatedProduct(current, farPrice));
  });
});
