import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { mergeHomepage } from "../lib/homepageDefaults";
import { normalizeHomepageClaims } from "../lib/homepageClaimNormalization";
import { normalizePublicSettings } from "../lib/publicClaimNormalization";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const bootstrap = typeof window !== "undefined"
        ? window.__SGE_PUBLIC_SETTINGS_PROMISE__
        : null;
      let s = null;
      if (bootstrap && typeof bootstrap.then === "function") {
        try {
          s = await bootstrap;
        } catch (_) {
          // The HTML bootstrap is only a performance hint; preserve the
          // existing API fallback if that early request fails.
        }
      }
      if (!s) s = await api.getSettings();
      setSettings(normalizePublicSettings(s));
    } catch (e) {
      /* ignore */
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Admin can retain old homepage wording for years. Merge defaults first,
  // then normalize only the known legacy claims that the public audit flagged.
  const hp = normalizeHomepageClaims(mergeHomepage(settings?.homepage_content));

  return (
    <SettingsContext.Provider value={{ settings, hp, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};
