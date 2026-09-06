import { scoreSpaceSuggestion, suggestionsForSpace } from "./spaceSuggestions";

const spaces = {
  dining: { slug: "dining-room" },
  doubleHeight: { slug: "double-height-staircase" },
};

describe("space suggestion scoring", () => {
  test("marks a dining chandelier as a strong fit", () => {
    const result = scoreSpaceSuggestion({
      name: "Rajsi Dining Chandelier",
      category: "Chandelier",
      description: "A statement chandelier for dining tables and intimate entertaining spaces.",
      tags: [],
    }, spaces.dining);

    expect(result.confidence).toBe("strong");
    expect(result.score).toBeGreaterThanOrEqual(70);
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
      { id: "1", name: "Dining Chandelier", category: "Chandelier", description: "For dining tables", tags: ["space:dining-room"] },
      { id: "2", name: "Pendant Cluster", category: "Hanging Light", description: "Dining pendant cluster", tags: [] },
    ], spaces.dining);

    expect(rows.map((row) => row.product.id)).toEqual(["2"]);
  });
});
