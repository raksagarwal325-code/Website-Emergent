import { sanitizePublicProduct } from "./api";

describe("sanitizePublicProduct", () => {
  it("removes internal tags from the customer-facing product payload", () => {
    const source = {
      id: "product-1",
      name: "Test Light",
      tags: [
        "collection:ratnanchal",
        "collection-label:ratnanchal:Ratnanchal",
        "diamond cut glass wall lamp clear globe wall light",
      ],
    };

    const result = sanitizePublicProduct(source);

    expect(result).toEqual({
      id: "product-1",
      name: "Test Light",
      tags: [],
    });
    expect(source.tags).toHaveLength(3);
  });

  it("leaves nullish values unchanged", () => {
    expect(sanitizePublicProduct(null)).toBeNull();
    expect(sanitizePublicProduct(undefined)).toBeUndefined();
  });
});
