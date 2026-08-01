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

  test("returns PreOrder for a published product with 0 stock (default)", () => {
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
  test("true for a published product with no stock", () => {
    expect(isMadeToOrder({ stock: 0, status: "published" })).toBe(true);
    expect(isMadeToOrder({ status: "published" })).toBe(true);
  });

  test("false for a published product with stock", () => {
    expect(isMadeToOrder({ stock: 3, status: "published" })).toBe(false);
    expect(isMadeToOrder({ stock: "7", status: "published" })).toBe(false);
  });

  test("false for draft/unpublished products (visible note should not be shown)", () => {
    expect(isMadeToOrder({ stock: 0, status: "draft" })).toBe(false);
    expect(isMadeToOrder({ stock: 0, status: "archived" })).toBe(false);
  });
});
