import { sanitizePublicProduct } from "./api";

describe("sanitizePublicProduct", () => {
  it("removes internal tags and unconfirmed specs from the customer-facing product payload", () => {
    const source = {
      id: "product-1",
      name: "Test Light",
      tags: [
        "collection:ratnanchal",
        "collection-label:ratnanchal:Ratnanchal",
        "diamond cut glass wall lamp clear globe wall light",
      ],
      specs: {
        Height: "Needs confirmation",
        Width: "To be confirmed before order",
        Holder: "to be confirmed",
        Material: "Glass and metal",
        Finish: "Antique gold",
        Weight: "N/A",
      },
    };

    const result = sanitizePublicProduct(source);

    expect(result).toEqual({
      id: "product-1",
      name: "Test Light",
      tags: [],
      specs: {
        Material: "Glass and metal",
        Finish: "Antique gold",
      },
    });
    expect(source.tags).toHaveLength(3);
    expect(source.specs.Height).toBe("Needs confirmation");
  });

  it("leaves nullish values unchanged", () => {
    expect(sanitizePublicProduct(null)).toBeNull();
    expect(sanitizePublicProduct(undefined)).toBeUndefined();
  });
});
