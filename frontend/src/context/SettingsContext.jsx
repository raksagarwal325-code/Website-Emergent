import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { mergeHomepage } from "../lib/homepageDefaults";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch (e) {
      /* ignore */
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const hp = mergeHomepage(settings?.homepage_content);

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
