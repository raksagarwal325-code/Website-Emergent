import { resolveEnquiryType, enquiryTypeLabel, ENQUIRY_TYPES } from "./enquiryTypes";

describe("resolveEnquiryType", () => {
  test("no param → general", () => {
    expect(resolveEnquiryType(undefined)).toBe("general");
    expect(resolveEnquiryType(null)).toBe("general");
  });

  test("valid values pass through", () => {
    expect(resolveEnquiryType("general")).toBe("general");
    expect(resolveEnquiryType("bulk")).toBe("bulk");
    expect(resolveEnquiryType("trade")).toBe("trade");
  });

  test("valid values are case-insensitive and trimmed", () => {
    expect(resolveEnquiryType("BULK")).toBe("bulk");
    expect(resolveEnquiryType(" Trade ")).toBe("trade");
    expect(resolveEnquiryType("General")).toBe("general");
  });

  test("invalid values fall back to general", () => {
    expect(resolveEnquiryType("wholesale")).toBe("general");
    expect(resolveEnquiryType("bulk;drop table users;")).toBe("general");
    expect(resolveEnquiryType("")).toBe("general");
    expect(resolveEnquiryType("<script>")).toBe("general");
    expect(resolveEnquiryType("0")).toBe("general");
  });
});

describe("enquiryTypeLabel", () => {
  test("returns the right label for each supported value", () => {
    expect(enquiryTypeLabel("general")).toBe("General Enquiry");
    expect(enquiryTypeLabel("bulk")).toBe("Custom Lighting / Bulk Order");
    expect(enquiryTypeLabel("trade")).toBe("Architect / Interior Designer");
  });
  test("unknown value defaults to general label (defensive)", () => {
    expect(enquiryTypeLabel("nonsense")).toBe("General Enquiry");
  });
});

describe("ENQUIRY_TYPES contract", () => {
  test("shape matches backend allow-list exactly", () => {
    expect(ENQUIRY_TYPES.map((t) => t.value).sort()).toEqual(["bulk", "general", "trade"]);
  });
});
