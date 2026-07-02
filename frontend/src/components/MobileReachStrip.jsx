import React from "react";
import { useLocation } from "react-router-dom";
import { Phone, Navigation } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

// WhatsApp glyph
const WA = ({ size = 20 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <path fill="currentColor" d="M19.11 17.29c-.28-.14-1.66-.82-1.91-.91-.26-.09-.44-.14-.63.14-.19.28-.72.91-.88 1.09-.16.18-.32.21-.6.07-.28-.14-1.19-.44-2.27-1.4-.84-.75-1.4-1.66-1.56-1.95-.16-.28-.02-.44.12-.58.13-.13.28-.32.42-.49.14-.16.19-.28.28-.46.09-.19.05-.35-.02-.49-.07-.14-.63-1.52-.86-2.08-.23-.55-.46-.47-.63-.48-.16-.01-.35-.01-.53-.01-.19 0-.49.07-.74.35-.26.28-.98.96-.98 2.34 0 1.38 1 2.71 1.14 2.9.14.19 1.98 3.02 4.8 4.24.67.29 1.19.46 1.6.59.67.21 1.28.18 1.77.11.54-.08 1.66-.68 1.9-1.34.23-.66.23-1.22.16-1.34-.07-.12-.26-.19-.54-.33zM16.03 26.14c-1.85 0-3.66-.5-5.24-1.44l-.38-.22-3.89 1.02 1.04-3.79-.25-.39a10.1 10.1 0 0 1-1.55-5.4c0-5.6 4.55-10.15 10.15-10.15a10.1 10.1 0 0 1 7.18 2.97 10.1 10.1 0 0 1 2.97 7.18c0 5.6-4.56 10.15-10.03 10.22zm8.63-18.85A12.06 12.06 0 0 0 16.03 4C9.4 4 4 9.4 4 16.02c0 2.12.55 4.19 1.6 6.02L4 28l6.1-1.6a12 12 0 0 0 5.93 1.51h.01c6.62 0 12.03-5.4 12.03-12.02 0-3.21-1.25-6.23-3.4-8.51z" />
  </svg>
);

const WA_PREFILLED = "Hi Rakshit ji, I am interested in Samrat Glass Emporium products. Please share more details.";

/**
 * Sticky mobile reach-us strip.
 * Renders only on mobile (< md) and hides on the printable catalogue view.
 * Three tap-through icons: Call · WhatsApp · Directions.
 */
export default function MobileReachStrip() {
  const { settings } = useSettings();
  const location = useLocation();
  if (location.pathname.startsWith("/catalogue")) return null;

  const rawNum = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waHref = rawNum ? `https://wa.me/${rawNum}?text=${encodeURIComponent(WA_PREFILLED)}` : "";
  const telHref = rawNum ? `tel:+${rawNum}` : "";
  const mapsHref = settings?.google_maps_url || (settings?.google_cid ? `https://www.google.com/maps?cid=${settings.google_cid}` : "");

  const items = [
    telHref && { key: "call", href: telHref, label: "Call", icon: <Phone size={18} strokeWidth={1.6} />, external: false },
    waHref && { key: "wa", href: waHref, label: "WhatsApp", icon: <WA size={20} />, external: true, accent: true },
    mapsHref && { key: "map", href: mapsHref, label: "Directions", icon: <Navigation size={18} strokeWidth={1.6} />, external: true },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div
      data-testid="mobile-reach-strip"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#BF9972]/30 bg-black/90 backdrop-blur no-print"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="grid grid-cols-3 divide-x divide-[#BF9972]/15">
        {items.map((it) => (
          it.external ? (
            <a
              key={it.key}
              href={it.href}
              target="_blank"
              rel="noreferrer"
              data-testid={`reach-${it.key}`}
              className={`flex flex-col items-center justify-center gap-1 py-3 transition-colors ${it.accent ? "text-[#25D366]" : "text-white/80 hover:text-[#D4AF37]"}`}
            >
              {it.icon}
              <span className="text-[9px] uppercase tracking-[0.24em]">{it.label}</span>
            </a>
          ) : (
            <a
              key={it.key}
              href={it.href}
              data-testid={`reach-${it.key}`}
              className="flex flex-col items-center justify-center gap-1 py-3 text-white/80 hover:text-[#D4AF37] transition-colors"
            >
              {it.icon}
              <span className="text-[9px] uppercase tracking-[0.24em]">{it.label}</span>
            </a>
          )
        ))}
      </div>
    </div>
  );
}
