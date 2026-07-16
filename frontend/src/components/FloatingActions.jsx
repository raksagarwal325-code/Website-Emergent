import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const WA_PREFILLED = "Hi Rakshit ji, I am interested in Samrat Glass Emporium products. Please share more details.";

// Official WhatsApp glyph (SVG) — brand-accurate
const WhatsAppGlyph = ({ size = 24 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <path
      fill="currentColor"
      d="M19.11 17.29c-.28-.14-1.66-.82-1.91-.91-.26-.09-.44-.14-.63.14-.19.28-.72.91-.88 1.09-.16.18-.32.21-.6.07-.28-.14-1.19-.44-2.27-1.4-.84-.75-1.4-1.66-1.56-1.95-.16-.28-.02-.44.12-.58.13-.13.28-.32.42-.49.14-.16.19-.28.28-.46.09-.19.05-.35-.02-.49-.07-.14-.63-1.52-.86-2.08-.23-.55-.46-.47-.63-.48-.16-.01-.35-.01-.53-.01-.19 0-.49.07-.74.35-.26.28-.98.96-.98 2.34 0 1.38 1 2.71 1.14 2.9.14.19 1.98 3.02 4.8 4.24.67.29 1.19.46 1.6.59.67.21 1.28.18 1.77.11.54-.08 1.66-.68 1.9-1.34.23-.66.23-1.22.16-1.34-.07-.12-.26-.19-.54-.33zM16.03 26.14c-1.85 0-3.66-.5-5.24-1.44l-.38-.22-3.89 1.02 1.04-3.79-.25-.39a10.1 10.1 0 0 1-1.55-5.4c0-5.6 4.55-10.15 10.15-10.15a10.1 10.1 0 0 1 7.18 2.97 10.1 10.1 0 0 1 2.97 7.18c0 5.6-4.56 10.15-10.03 10.22zm8.63-18.85A12.06 12.06 0 0 0 16.03 4C9.4 4 4 9.4 4 16.02c0 2.12.55 4.19 1.6 6.02L4 28l6.1-1.6a12 12 0 0 0 5.93 1.51h.01c6.62 0 12.03-5.4 12.03-12.02 0-3.21-1.25-6.23-3.4-8.51z"
    />
  </svg>
);

export default function FloatingActions() {
  const { settings } = useSettings();
  const location = useLocation();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide on the printable catalogue view (looks bad in the exported PDF)
  const isCatalogue = location.pathname.startsWith("/catalogue");
  if (isCatalogue) return null;

  const rawNumber = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waLink = rawNumber
    ? `https://wa.me/${rawNumber}?text=${encodeURIComponent(WA_PREFILLED)}`
    : "";

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="hidden md:flex fixed right-5 md:right-6 bottom-5 md:bottom-6 z-40 flex-col items-end gap-3 no-print">
      {/* Back to top */}
      <button
        type="button"
        onClick={scrollTop}
        aria-label="Back to top"
        data-testid="back-to-top-btn"
        className={`h-11 w-11 border border-[#BF9972]/50 bg-black/70 backdrop-blur text-[#D4AF37] hover:border-[#D4AF37] hover:bg-black transition-all flex items-center justify-center shadow-lg ${showTop ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        <ArrowUp size={18} strokeWidth={1.6} />
      </button>

      {/* WhatsApp */}
      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with us on WhatsApp"
          data-testid="floating-whatsapp-btn"
          className="group h-14 w-14 rounded-full flex items-center justify-center text-white shadow-2xl relative overflow-hidden"
          style={{ background: "#25D366" }}
        >
          <span className="absolute inset-0 rounded-full opacity-70 animate-ping" style={{ background: "#25D366" }}></span>
          <span className="absolute inset-0 rounded-full" style={{ background: "#25D366" }}></span>
          <span className="relative z-10 inline-flex items-center justify-center">
            <WhatsAppGlyph size={26} />
          </span>
          <span className="absolute right-full mr-3 whitespace-nowrap bg-black text-white text-[10px] uppercase tracking-[0.24em] px-3 py-2 border border-[#BF9972]/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Chat with us
          </span>
        </a>
      )}
    </div>
  );
}
