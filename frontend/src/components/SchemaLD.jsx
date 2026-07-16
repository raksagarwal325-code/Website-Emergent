import { useEffect } from "react";

/**
 * Injects a JSON-LD schema.org script into <head>, keyed by `id`.
 * On unmount, removes the script so per-page schemas don't leak across routes.
 * Google/Bing crawl JS-rendered JSON-LD.
 */
export default function SchemaLD({ id, data }) {
  useEffect(() => {
    if (!id || !data) return;
    let el = document.head.querySelector(`script[data-schema="${id}"]`);
    if (!el) {
      el = document.createElement("script");
      el.setAttribute("type", "application/ld+json");
      el.setAttribute("data-schema", id);
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
    return () => {
      const stale = document.head.querySelector(`script[data-schema="${id}"]`);
      if (stale) stale.remove();
    };
  }, [id, data]);
  return null;
}
