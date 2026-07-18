import { useEffect } from "react";

/**
 * Lightweight per-page meta manager (no external deps).
 * Sets document.title + updates <meta> tags for description, OpenGraph, and Twitter cards.
 * Falls back to the site-wide defaults declared in /public/index.html on unmount.
 */
// Canonical URLs must always resolve against the official production domain,
// never the Emergent preview host (which changes per environment and shouldn't
// be indexed).
const PRODUCTION_ORIGIN = "https://samratglass.com";

const setMeta = (selector, attrName, name, content) => {
  if (!content) return;
  let el = document.head.querySelector(`meta[${selector}]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const setCanonical = (href) => {
  if (!href) return;
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

export default function SEO({
  title,
  description,
  image,
  path,
  type = "website",
  noindex = false,
}) {
  useEffect(() => {
    if (title) document.title = title;
    const routePath =
      path ||
      (typeof window !== "undefined" && window.location.pathname) ||
      "";
    const url = `${PRODUCTION_ORIGIN}${routePath}`;
    setCanonical(url);
    setMeta('name="description"', "name", "description", description);
    setMeta('property="og:title"', "property", "og:title", title);
    setMeta('property="og:description"', "property", "og:description", description);
    setMeta('property="og:image"', "property", "og:image", image);
    setMeta('property="og:type"', "property", "og:type", type);
    setMeta('property="og:url"', "property", "og:url", url);
    setMeta('property="og:site_name"', "property", "og:site_name", "Samrat Glass Emporium");
    setMeta('name="twitter:card"', "name", "twitter:card", image ? "summary_large_image" : "summary");
    setMeta('name="twitter:title"', "name", "twitter:title", title);
    setMeta('name="twitter:description"', "name", "twitter:description", description);
    setMeta('name="twitter:image"', "name", "twitter:image", image);
    // Per-page robots directive. `noindex` pages must set noindex,follow so
    // link equity still flows to indexable products but the page itself is
    // kept out of the SERP. On unmount we REMOVE the tag so subsequent pages
    // don't inherit it (default: indexable).
    const robotsEl = document.head.querySelector('meta[name="robots"]');
    if (noindex) {
      if (robotsEl) {
        robotsEl.setAttribute("content", "noindex,follow");
      } else {
        const el = document.createElement("meta");
        el.setAttribute("name", "robots");
        el.setAttribute("content", "noindex,follow");
        document.head.appendChild(el);
      }
    } else if (robotsEl) {
      robotsEl.remove();
    }
  }, [title, description, image, path, type, noindex]);
  return null;
}
