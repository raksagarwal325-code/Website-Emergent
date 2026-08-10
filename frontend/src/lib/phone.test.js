import { normalizePhone } from "./phone";

describe("normalizePhone — India-first, international-safe", () => {
  test("rejects empty / missing input", () => {
    for (const bad of ["", null, undefined, "   "]) {
      const r = normalizePhone(bad);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/required/i);
    }
  });

  test("rejects non-numeric input", () => {
    expect(normalizePhone("hello").ok).toBe(false);
    expect(normalizePhone("abc-def-ghij").ok).toBe(false);
  });

  test("accepts 10-digit Indian mobile and normalises to +91…", () => {
    expect(normalizePhone("8920392937")).toEqual({ ok: true, value: "+918920392937" });
  });

  test("accepts spaces + hyphens + parens and strips them", () => {
    expect(normalizePhone("+91 89203-92937")).toEqual({ ok: true, value: "+918920392937" });
    expect(normalizePhone("(892) 039-2937")).toEqual({ ok: true, value: "+918920392937" });
  });

  test("accepts +91XXXXXXXXXX unchanged", () => {
    expect(normalizePhone("+918920392937")).toEqual({ ok: true, value: "+918920392937" });
  });

  test("accepts bare 91XXXXXXXXXX and adds +", () => {
    expect(normalizePhone("918920392937")).toEqual({ ok: true, value: "+918920392937" });
  });

  test("accepts leading-zero Indian mobile (0XXXXXXXXXX)", () => {
    expect(normalizePhone("08920392937")).toEqual({ ok: true, value: "+918920392937" });
  });

  test("accepts a valid international number (+US 10-digit)", () => {
    expect(normalizePhone("+14155552671")).toEqual({ ok: true, value: "+14155552671" });
  });

  test("accepts an international number with spaces (+44)", () => {
    expect(normalizePhone("+44 20 7946 0018")).toEqual({ ok: true, value: "+442079460018" });
  });

  test("rejects too-short / too-long numbers", () => {
    expect(normalizePhone("1234").ok).toBe(false);       // 4 digits — too short
    expect(normalizePhone("+1234567").ok).toBe(false);   // 7 digits E.164 body — too short
    expect(normalizePhone("+1234567890123456").ok).toBe(false); // 16 digits — too long
  });
});
