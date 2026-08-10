import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Route-change scroll restoration.
 *
 * Contract:
 *   - On every PUSH/REPLACE navigation (footer / header / product-card
 *     clicks, programmatic navigate(), etc.) → scroll to the top of the
 *     page instantly.
 *   - On a POP navigation (browser back/forward) → do NOT interfere.
 *     The browser has already restored the visitor's previous scroll
 *     position on `history.back()`, which is the sensible default.
 *   - If the URL includes a `#hash`, do NOT jump to top — let the
 *     anchor scroll happen naturally so intra-page links keep working.
 *
 * Mount this component ONCE, inside <BrowserRouter> and above the
 * <Routes> block. It renders nothing.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType(); // "POP" | "PUSH" | "REPLACE"

  useEffect(() => {
    // Respect hash-anchor navigation on the same or a new page.
    if (hash) return;
    // Respect browser back/forward — the browser restores position itself.
    if (navType === "POP") return;
    // Use `instant` so users don't see a smooth-scroll flash on a route
    // change (the new page should feel like a fresh page open).
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      // Older browsers that don't accept the options object.
      window.scrollTo(0, 0);
    }
  }, [pathname, hash, navType]);

  return null;
}
