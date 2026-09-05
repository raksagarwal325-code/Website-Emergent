import { getProductDimensionData, parseProductLength } from "./productDimensions";

describe("productDimensions", () => {
  test("converts inch dimensions into metric and human-readable scale", () => {
    expect(parseProductLength('56"')).toEqual({
      sourceText: '56"',
      inches: 56,
      inchText: '56"',
      cmText: "142 cm",
      humanText: "4 ft 8 in",
    });
  });

  test("uses verified Height, Width and Number of Lights specs", () => {
    const data = getProductDimensionData({
      specs: {
        Height: '56"',
        Width: '52"',
        "Number of Lights": "24",
      },
    });

    expect(data.exactSummary).toBe('56" H × 52" W');
    expect(data.metricSummary).toBe("142 cm H × 132 cm W");
    expect(data.height.humanText).toBe("4 ft 8 in");
    expect(data.span.humanText).toBe("4 ft 4 in");
    expect(data.lights).toBe("24");
    expect(data.footprint).toBe("4 ft 4 in wide");
  });

  test("uses Diameter as the horizontal span when Width is absent", () => {
    const data = getProductDimensionData({
      specs: {
        Height: '30"',
        Diameter: '36"',
      },
    });

    expect(data.spanLabel).toBe("Overall Diameter");
    expect(data.spanShort).toBe("Dia");
    expect(data.exactSummary).toBe('30" H × 36" Dia');
  });

  test("extracts labelled height and width from Dimensions without guessing unlabeled order", () => {
    const labelled = getProductDimensionData({
      specs: { Dimensions: 'Height 40" × Width 28"' },
    });
    expect(labelled.exactSummary).toBe('40" H × 28" W');

    const unlabeled = getProductDimensionData({
      specs: { Dimensions: '40" × 28"' },
    });
    expect(unlabeled.height).toBeNull();
    expect(unlabeled.span).toBeNull();
    expect(unlabeled.exactSummary).toBe('40" × 28"');
  });

  test("does not invent a dimensions panel when no verified size spec exists", () => {
    expect(getProductDimensionData({ specs: { Material: "Glass" } })).toBeNull();
  });
});
