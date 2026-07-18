import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pageView } from "../lib/analytics";

/**
 * Fires a single `page_view` to GA4 on initial mount and whenever the
 * React-Router pathname or query string changes. Sits inside <BrowserRouter>
 * so it can access `useLocation`. The `pageView` helper itself dedupes
 * consecutive identical route entries, skips /admin, and respects DNT.
 */
export default function AnalyticsRouteTracker() {
  const location = useLocation();
  useEffect(() => {
    pageView({ path: location.pathname, search: location.search });
  }, [location.pathname, location.search]);
  return null;
}
