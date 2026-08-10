/**
 * Build a Gmail-web compose URL that always opens through the official
 * business account (`authuser=samratglassemp@gmail.com`).
 *
 * Values are URL-encoded via `encodeURIComponent` so subjects containing
 * ampersands, hashes and unicode punctuation land in Gmail exactly as
 * typed. Returns `null` for missing/invalid recipient addresses so the
 * caller can hide/disable the Reply button rather than open an empty
 * compose window.
 *
 * @param {{to?: string, subject?: string}} params
 * @returns {string|null}
 */
export const OFFICIAL_GMAIL = "samratglassemp@gmail.com";

export function gmailComposeUrl({ to = "", subject = "" } = {}) {
  const address = String(to).trim();
  // Cheap sanity check — avoid opening compose for garbage input; Gmail's
  // own validation will still catch domain-level issues.
  if (!address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return null;
  const base = "https://mail.google.com/mail/";
  const qs = new URLSearchParams({
    view: "cm",
    fs: "1",
    authuser: OFFICIAL_GMAIL,
    to: address,
    su: String(subject || ""),
  });
  return `${base}?${qs.toString()}`;
}
