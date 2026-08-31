const PRODUCTION_ORIGIN = "https://samratglass.com";

function ensureRobotsNoindex() {
  let el = document.head.querySelector('meta[name="robots"]');
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", "robots");
    document.head.appendChild(el);
  }
  el.setAttribute("content", "noindex,follow");
}

function ensureCanonicalForCurrentPath() {
  const path = window.location?.pathname || "/";
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", `${PRODUCTION_ORIGIN}${path}`);
}

function applyProductNotFoundSeoIfPresent() {
  if (!document.querySelector('[data-testid="product-not-found"]')) return false;
  ensureRobotsNoindex();
  ensureCanonicalForCurrentPath();
  return true;
}

/**
 * ProductDetail has a dedicated in-page 404 state rather than routing through
 * the general NotFound page. Install a tiny DOM guard so stale/deleted product
 * URLs emit noindex,follow and canonicalise to the actual missing URL once that
 * state renders. Valid product pages are untouched.
 */
export function installProductNotFoundSeoGuard() {
  applyProductNotFoundSeoIfPresent();
  const observer = new MutationObserver(() => applyProductNotFoundSeoIfPresent());
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

export { applyProductNotFoundSeoIfPresent };
