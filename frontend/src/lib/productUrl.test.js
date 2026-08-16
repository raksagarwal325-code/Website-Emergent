import { productPath, productSlug } from "./productUrl";

describe("product public URLs", () => {
  test("uses readable product name and Samrat SKU", () => {
    const product = {
      id: "8f218a68-2ff1-4119-a5de-984c2bcdb8d2",
      name: "Noorvastra Scalloped Etched-Tulip Eight-Light Crystal Chandelier",
      sku: "SGE-CH-088",
    };
    expect(productPath(product)).toBe(
      "/product/noorvastra-scalloped-etched-tulip-eight-light-crystal-chandelier-sge-ch-088"
    );
  });

  test("does not publish an unresolved SKU", () => {
    const product = { id: "abc-123", name: "Shankh Grand Hanging Light", sku: "TBD" };
    expect(productSlug(product)).toBe("shankh-grand-hanging-light-abc-123");
  });
});
