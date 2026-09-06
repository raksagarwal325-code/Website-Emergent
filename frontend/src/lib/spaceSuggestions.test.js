import { scoreSpaceSuggestion, suggestionsForSpace } from "./spaceSuggestions";

const spaces = {
  living: { slug: "living-room" },
  dining: { slug: "dining-room" },
  doubleHeight: { slug: "double-height-staircase" },
};

describe("space suggestion scoring", () => {
  test("marks a dining chandelier with direct application evidence as a strong fit", () => {
    const result = scoreSpaceSuggestion({
      name: "Rajsi Dining Chandelier",
      category: "Chandelier",
      description: "A chandelier designed for dining tables and dining room entertaining spaces.",
      tags: [],
    }, spaces.dining);

    expect(result.confidence).toBe("strong");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.reasons.join(" ")).toMatch(/Direct application evidence/i);
  });

  test("does not call a generic living-room category match strong without direct evidence", () => {
    const result = scoreSpaceSuggestion({
      name: "Sculpted Diamond-Lattice Wall Sconce",
      category: "Wall Light",
      description: "A statement wall light with warm ambient illumination.",
      tags: [],
    }, spaces.living);

    expect(result.confidence).toBe("possible");
    expect(result.score).toBeLessThan(70);
  });

  test("promotes a living-room product when the catalogue explicitly says living room", () => {
    const result = scoreSpaceSuggestion({
      name: "Sculpted Diamond-Lattice Wall Sconce",
      category: "Wall Light",
      description: "A statement wall light for living room feature walls.",
      tags: [],
    }, spaces.living);

    expect(result.confidence).toBe("strong");
  });

  test("rejects a gate light for dining despite generic lighting words", () => {
    const result = scoreSpaceSuggestion({
      name: "Heritage Gate Light",
      category: "Gate Light",
      description: "Decorative entrance and gate light.",
      tags: [],
    }, spaces.dining);

    expect(result.confidence).toBe("none");
  });

  test("uses scale/application clues for double-height suggestions", () => {
    const result = scoreSpaceSuggestion({
      name: "Grand Tiered Cascade Chandelier",
      category: "Chandelier",
      description: "Large cascading chandelier for a double-height staircase void.",
      tags: [],
    }, spaces.doubleHeight);

    expect(result.confidence).toBe("strong");
  });

  test("does not suggest products already assigned to the selected space", () => {
    const rows = suggestionsForSpace([
      { id: "1", name: "Dining Chandelier", category: "Chandelier", description: "For a dining room table", tags: ["space:dining-room"] },
      { id: "2", name: "Pendant Cluster", category: "Hanging Light", description: "Pendant cluster for a dining room", tags: [] },
    ], spaces.dining);

    expect(rows.map((row) => row.product.id)).toEqual(["2"]);
  });
});
