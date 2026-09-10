import { prepareListedProduct, sanitizePublicProduct } from "./api";

describe("sanitizePublicProduct", () => {
  it("removes internal tags, unconfirmed specs, and known taxonomy values from the customer-facing product payload", () => {
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
        Style: "heritage / classical indian luxury",
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
    expect(source.specs.Style).toBe("heritage / classical indian luxury");
  });

  it("leaves nullish values unchanged", () => {
    expect(sanitizePublicProduct(null)).toBeNull();
    expect(sanitizePublicProduct(undefined)).toBeUndefined();
  });

  it("preserves every stored SOP field for Admin raw listings", () => {
    const source = {
      id: "draft-1",
      tags: ["collection:rajshahi"],
      specs: {
        Material: "Glass and Metal",
        Finish: "Gold",
        Height: "To be confirmed before order",
        Width: "To be confirmed before order",
        "Holder Type": "To be confirmed before order",
        "Bulb Type": "To be confirmed before order",
        "Collection / Family": "Rajsi",
      },
    };

    expect(prepareListedProduct(source, { raw: true })).toBe(source);
    expect(Object.keys(prepareListedProduct(source, { raw: true }).specs)).toEqual([
      "Material",
      "Finish",
      "Height",
      "Width",
      "Holder Type",
      "Bulb Type",
      "Collection / Family",
    ]);
    expect(prepareListedProduct(source).specs).toEqual({
      Material: "Glass and Metal",
      Finish: "Gold",
      "Collection / Family": "Rajsi",
    });
  });
});
