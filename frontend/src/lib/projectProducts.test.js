import {
  isStandardCatalogueConfiguration,
  projectConfigurationLabel,
  projectProductPresentation,
  projectQuickAnswer,
} from "./projectProducts";

describe("project product presentation", () => {
  const chandelier = { name: "Devshikhar Crystal-Rod Grand Tiered Chandelier", sku: "SGE-CH-003" };
  const lamp = { name: "Rangbagh Scalloped Floral Hurricane Table Lamp — Ruby Red", sku: "SGE-TL-031" };

  test("keeps singular wording for one linked product", () => {
    const result = projectProductPresentation([chandelier]);
    expect(result.isMulti).toBe(false);
    expect(result.heroLabel).toBe("Catalogue piece · SGE-CH-003");
    expect(result.snapshotLabel).toBe("Product");
    expect(result.tocLabel).toBe("The exact catalogue piece");
  });

  test("uses plural wording and includes every linked product", () => {
    const result = projectProductPresentation([chandelier, lamp]);
    expect(result.isMulti).toBe(true);
    expect(result.heroLabel).toBe("Catalogue pieces · SGE-CH-003 · SGE-TL-031");
    expect(result.snapshotLabel).toBe("Products");
    expect(result.snapshotValue).toContain("Devshikhar Crystal-Rod Grand Tiered Chandelier · SGE-CH-003");
    expect(result.snapshotValue).toContain("Rangbagh Scalloped Floral Hurricane Table Lamp — Ruby Red · SGE-TL-031");
    expect(result.tocLabel).toBe("The exact catalogue pieces");
  });

  test("standard catalogue configuration is not described as a customisation", () => {
    const text = projectQuickAnswer({ location: "Hyderabad", customisation: "Standard catalogue configuration", products: [chandelier, lamp] });
    expect(text).toContain("Devshikhar Crystal-Rod Grand Tiered Chandelier (SGE-CH-003)");
    expect(text).toContain("Rangbagh Scalloped Floral Hurricane Table Lamp — Ruby Red (SGE-TL-031)");
    expect(text).toContain("catalogue pieces");
    expect(text).toContain("The installation uses the standard catalogue configuration.");
    expect(text).not.toContain("with Standard catalogue configuration");
    expect(projectConfigurationLabel("Standard catalogue configuration")).toBe("Configuration");
    expect(isStandardCatalogueConfiguration("Standard catalogue configuration.")).toBe(true);
  });

  test("verified customisation is presented as its own clean sentence", () => {
    const text = projectQuickAnswer({
      location: "Nagpur",
      customisation: "Designed from a client reference image.",
      products: [chandelier],
    });
    expect(text).toContain("Customisation: Designed from a client reference image.");
    expect(text).not.toContain(".. ");
    expect(text).not.toContain("..");
    expect(projectConfigurationLabel("Height reduced for the site")).toBe("Customisation");
  });
});
