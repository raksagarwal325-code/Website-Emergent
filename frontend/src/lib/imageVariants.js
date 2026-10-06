const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const FILE_MARKER = "/api/files/";
const WIDTHS = new Set([320, 640, 960, 1280]);
const STATIC_VARIANT_NAMES = new Set([
  "atelier-1.png",
  "atelier-2.png",
  "atelier-3.png",
  "atelier-4.png",
  "atelier-5.png",
  "atelier-hero.png",
]);

function isEmergentPreviewHost() {
  if (typeof window === "undefined") return false;
  const host = String(window.location?.hostname || "").toLowerCase();
  return host.endsWith(".preview.emergentagent.com");
}

export function imageVariantUrl(src, width) {
  if (!src || !WIDTHS.has(Number(width))) return src || "";
  const value = String(src);

  // Emergent Preview can serve the original uploaded product image even when
  // the production-only responsive variant route is temporarily unavailable.
  // Prefer the master there so Preview remains visually trustworthy; the
  // production site continues using optimized WebP variants normally.
  if (isEmergentPreviewHost()) return value;

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
  if (!src || isEmergentPreviewHost()) return undefined;
  const variants = widths
    .filter((width) => WIDTHS.has(Number(width)))
    .map((width) => `${imageVariantUrl(src, Number(width))} ${Number(width)}w`);
  return variants.length ? variants.join(", ") : undefined;
}

export function staticImageVariantUrl(src, width) {
  if (!src || !WIDTHS.has(Number(width))) return src || "";
  const value = String(src);
  if (isEmergentPreviewHost()) return value;

  let pathname = value.split(/[?#]/, 1)[0];
  let origin = BACKEND_URL;
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      pathname = parsed.pathname;
      origin = parsed.origin;
    } catch (_) {
      return value;
    }
  }

  const name = pathname.replace(/^\/+/, "");
  if (!STATIC_VARIANT_NAMES.has(name)) return value;
  return `${origin}/api/static-image-variant/${Number(width)}/${name}`;
}

export function staticImageVariantSrcSet(src, widths = [320, 640, 960]) {
  if (!src || isEmergentPreviewHost()) return undefined;
  const variants = widths
    .filter((width) => WIDTHS.has(Number(width)))
    .map((width) => `${staticImageVariantUrl(src, Number(width))} ${Number(width)}w`)
    .filter((entry) => !entry.startsWith(`${src} `));
  return variants.length ? variants.join(", ") : undefined;
}
