import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pageView, installWhatsAppClickListener } from "../lib/analytics";

/**
 * Fires a single `page_view` to GA4 on initial mount and whenever the
 * React-Router pathname or query string changes. Sits inside <BrowserRouter>
 * so it can access `useLocation`. The `pageView` helper itself dedupes
 * consecutive identical route entries, skips /admin, and respects DNT.
 *
 * Also installs the global WhatsApp click listener once on mount so
 * every public `wa.me/` CTA on the site fires the `whatsapp_click`
 * custom event (previously only 2 of ~14 CTAs did).
 */
export default function AnalyticsRouteTracker() {
  const location = useLocation();
  useEffect(() => {
    installWhatsAppClickListener();
  }, []);
  useEffect(() => {
    pageView({ path: location.pathname, search: location.search });
  }, [location.pathname, location.search]);
  return null;
}
