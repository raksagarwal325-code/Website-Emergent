import { schemaAvailabilityFor, isMadeToOrder, AVAILABILITY } from "./productAvailability";

describe("schemaAvailabilityFor", () => {
  test("returns InStock when stock is a positive number", () => {
    expect(schemaAvailabilityFor({ stock: 5, status: "published" }))
      .toBe(AVAILABILITY.InStock);
  });

  test("returns InStock when stock is a numeric string > 0", () => {
    expect(schemaAvailabilityFor({ stock: "3", status: "published" }))
      .toBe(AVAILABILITY.InStock);
  });

  test("returns PreOrder for a published product with 0 stock (schema fallback)", () => {
    expect(schemaAvailabilityFor({ stock: 0, status: "published" }))
      .toBe(AVAILABILITY.PreOrder);
  });

  test("returns PreOrder when stock is missing/null on a published product", () => {
    expect(schemaAvailabilityFor({ status: "published" }))
      .toBe(AVAILABILITY.PreOrder);
    expect(schemaAvailabilityFor({ stock: null, status: "published" }))
      .toBe(AVAILABILITY.PreOrder);
  });

  test("returns PreOrder when stock is an unparseable string on a published product", () => {
    expect(schemaAvailabilityFor({ stock: "N/A", status: "published" }))
      .toBe(AVAILABILITY.PreOrder);
  });

  test("returns null (no schema) for draft or unpublished products", () => {
    expect(schemaAvailabilityFor({ stock: 10, status: "draft" })).toBeNull();
    expect(schemaAvailabilityFor({ stock: 0, status: "archived" })).toBeNull();
  });

  test("never returns the deprecated MadeToOrder URL", () => {
    const cases = [
      { stock: 0, status: "published" },
      { stock: -1, status: "published" },
      { status: "published" },
      { stock: "0", status: "published" },
      { stock: 100, status: "published" },
    ];
    for (const c of cases) {
      const v = schemaAvailabilityFor(c);
      expect(v).not.toContain("MadeToOrder");
    }
  });

  test("gracefully handles bad input", () => {
    expect(schemaAvailabilityFor(null)).toBeNull();
    expect(schemaAvailabilityFor(undefined)).toBeNull();
    expect(schemaAvailabilityFor("not an object")).toBeNull();
  });
});

describe("isMadeToOrder", () => {
  test("does not infer a visible preorder label from zero or missing stock", () => {
    expect(isMadeToOrder({ stock: 0, status: "published" })).toBe(false);
    expect(isMadeToOrder({ status: "published" })).toBe(false);
  });

  test("true only for an explicitly marked published preorder / made-to-order product", () => {
    expect(isMadeToOrder({ stock: 0, status: "published", made_to_order: true })).toBe(true);
    expect(isMadeToOrder({ stock: 0, status: "published", preorder: true })).toBe(true);
    expect(isMadeToOrder({ stock: 0, status: "published", availability: "preorder" })).toBe(true);
  });

  test("false for a normal published product with stock", () => {
    expect(isMadeToOrder({ stock: 3, status: "published" })).toBe(false);
    expect(isMadeToOrder({ stock: "7", status: "published" })).toBe(false);
  });

  test("false for draft/unpublished products even when explicitly flagged", () => {
    expect(isMadeToOrder({ stock: 0, status: "draft", made_to_order: true })).toBe(false);
    expect(isMadeToOrder({ stock: 0, status: "archived", preorder: true })).toBe(false);
  });
});
