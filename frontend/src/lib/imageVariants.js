const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const FILE_MARKER = "/api/files/";
const WIDTHS = new Set([320, 640, 960, 1280]);

export function imageVariantUrl(src, width) {
  if (!src || !WIDTHS.has(Number(width))) return src || "";
  const value = String(src);
  const markerIndex = value.indexOf(FILE_MARKER);
  if (markerIndex < 0) return value;

  const storagePath = value.slice(markerIndex + FILE_MARKER.length);
  if (!storagePath || !storagePath.includes("/products/")) return value;

  let origin = BACKEND_URL;
  if (/^https?:\/\//i.test(value)) {
    try {
      origin = new URL(value).origin;
    } catch (_) {
      return value;
    }
  }
  return `${origin}/api/image-variant/${Number(width)}/${storagePath}`;
}

export function imageVariantSrcSet(src, widths = [320, 640, 960, 1280]) {
  if (!src) return undefined;
  const variants = widths
    .filter((width) => WIDTHS.has(Number(width)))
    .map((width) => `${imageVariantUrl(src, Number(width))} ${Number(width)}w`);
  return variants.length ? variants.join(", ") : undefined;
}
