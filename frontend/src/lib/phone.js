/**
 * Shared client-side phone normaliser.
 *
 * Input formats accepted for India:
 *   +91XXXXXXXXXX        (E.164)
 *   91XXXXXXXXXX         (bare country prefix)
 *   0XXXXXXXXXX          (leading zero, Indian mobile)
 *   XXXXXXXXXX           (10-digit mobile — assumed India)
 *
 * Input formats accepted internationally:
 *   +[country code][8..15 digits total after the +]
 *   Bare digits 8..15 long (treated as E.164 without the +)
 *
 * Spaces, hyphens and parentheses are stripped before validation so
 * the visitor can type `+91 89203-92937` and we still normalise it to
 * `+918920392937`.
 *
 * Returns:
 *   { ok: true,  value: "<normalised E.164 with leading +>" }
 *   { ok: false, error: "<human-readable reason>" }
 */
export function normalizePhone(raw) {
  const s = String(raw || "").replace(/[\s\-()]/g, "").trim();
  if (!s) return { ok: false, error: "Mobile / WhatsApp number is required" };
  if (!/^\+?\d+$/.test(s)) {
    return { ok: false, error: "Enter a valid phone number (digits only)" };
  }
  if (s.startsWith("+")) {
    const d = s.slice(1);
    if (d.length < 8 || d.length > 15) {
      return { ok: false, error: "Number length is invalid (E.164 requires 8–15 digits)" };
    }
    return { ok: true, value: s };
  }
  if (s.length === 10) return { ok: true, value: `+91${s}` };
  if (s.length === 12 && s.startsWith("91")) return { ok: true, value: `+${s}` };
  if (s.length === 11 && s.startsWith("0")) return { ok: true, value: `+91${s.slice(1)}` };
  if (s.length >= 8 && s.length <= 15) return { ok: true, value: `+${s}` };
  return { ok: false, error: "Enter a valid phone number" };
}
