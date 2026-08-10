/**
 * Indian mobile-number validation and normalization.
 *
 * Accepts three input shapes:
 *   - 10 digits              e.g. "9876543210"
 *   - +91 + 10 digits        e.g. "+919876543210"
 *   - 91 + 10 digits         e.g. "919876543210"
 *
 * Any of the above normalises to the canonical `+91XXXXXXXXXX` form used
 * when we store the number on new enquiries. Spaces, dashes and brackets
 * are stripped before validation.
 *
 * The first digit of the 10-digit subscriber portion must be 6-9 (TRAI
 * mobile-numbering-plan constraint) — anything else is rejected.
 *
 * `MSG_BLANK` and `MSG_INVALID` are exported so the same strings can be
 * used by every frontend form and shown consistently.
 */

export const MSG_BLANK = "Please enter your WhatsApp number.";
export const MSG_INVALID = "Please enter a valid 10-digit WhatsApp number.";

/**
 * @param {unknown} raw
 * @returns {{ok: true, normalized: string} | {ok: false, code: "blank"|"invalid"}}
 */
export function parseIndianMobile(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return { ok: false, code: "blank" };
  const digits = s.replace(/[^\d+]/g, "");
  let ten;
  if (/^\+?91\d{10}$/.test(digits)) {
    ten = digits.slice(-10);
  } else if (/^\d{10}$/.test(digits)) {
    ten = digits;
  } else {
    return { ok: false, code: "invalid" };
  }
  if (!/^[6-9]/.test(ten)) return { ok: false, code: "invalid" };
  return { ok: true, normalized: `+91${ten}` };
}

/** Returns the error message for a given raw input, or null when valid. */
export function whatsappErrorFor(raw) {
  const res = parseIndianMobile(raw);
  if (res.ok) return null;
  return res.code === "blank" ? MSG_BLANK : MSG_INVALID;
}
