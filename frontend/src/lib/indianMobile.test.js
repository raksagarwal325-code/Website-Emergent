import { parseIndianMobile, whatsappErrorFor, MSG_BLANK, MSG_INVALID } from "./indianMobile";

describe("parseIndianMobile", () => {
  test.each([
    ["9876543210", "+919876543210"],
    ["+919876543210", "+919876543210"],
    ["919876543210", "+919876543210"],
    [" 98765 43210 ", "+919876543210"],
    ["98765-43210", "+919876543210"],
    ["+91 98765 43210", "+919876543210"],
  ])("accepts %s and normalises to %s", (raw, expected) => {
    const r = parseIndianMobile(raw);
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe(expected);
  });

  test.each([
    "", "   ", "abc", "123", "12345", "5876543210", // first digit < 6
    "0876543210", "+9198765", "+9998765432101",
    "+911234567890",                                // starts with 1
  ])("rejects %s", (raw) => {
    expect(parseIndianMobile(raw).ok).toBe(false);
  });

  test("distinguishes blank from invalid", () => {
    expect(parseIndianMobile("").code).toBe("blank");
    expect(parseIndianMobile("abc").code).toBe("invalid");
  });
});

describe("whatsappErrorFor", () => {
  test("returns null for valid numbers", () => {
    expect(whatsappErrorFor("9876543210")).toBeNull();
  });
  test("returns the blank message for empty input", () => {
    expect(whatsappErrorFor("")).toBe(MSG_BLANK);
  });
  test("returns the invalid message for bad input", () => {
    expect(whatsappErrorFor("12345")).toBe(MSG_INVALID);
  });
});
