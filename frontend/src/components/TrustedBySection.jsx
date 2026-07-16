import React from "react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";

/**
 * Trusted-by strip — dark luxury credibility row.
 * - Hidden entirely until at least one client/venue is added via Admin CMS.
 * - Static row on desktop (md+), auto-scrolling marquee on mobile.
 * - Each entry: {name, logo?} — logo is optional; name always renders.
 */
export default function TrustedBySection() {
  const { hp } = useSettings();
  const t = hp.trusted_by || {};
  const items = (t.items || []).filter((it) => (it?.name || "").trim() || (it?.logo || "").trim());
  if (!items.length) return null;

  // Duplicate for seamless marquee loop on mobile
  const loop = [...items, ...items];

  return (
    <section data-testid="trusted-by-section" className="relative border-y border-[#BF9972]/15 bg-black/40">
      <div className="max-w-7xl mx-auto px-6 py-10 md:py-12">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-3">
            <span className="h-px w-8 bg-[#BF9972]/40"></span>
            <span className="text-[10px] uppercase tracking-[0.32em] text-[#BF9972]">{t.eyebrow || "Trusted by"}</span>
            <span className="h-px w-8 bg-[#BF9972]/40"></span>
          </div>
          {t.tagline && (
            <div className="mt-3 font-serif italic text-white/55 text-sm md:text-base">{t.tagline}</div>
          )}
        </div>

        {/* Desktop / tablet: static row */}
        <div className="hidden md:flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {items.map((it, i) => (
            <TrustedItem key={`d-${i}`} item={it} index={i} />
          ))}
        </div>

        {/* Mobile: infinite marquee */}
        <div className="md:hidden overflow-hidden trusted-marquee-mask">
          <div className="flex items-center gap-10 trusted-marquee-track">
            {loop.map((it, i) => (
              <TrustedItem key={`m-${i}`} item={it} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustedItem({ item, index }) {
  const hasLogo = !!(item?.logo || "").trim();
  const name = (item?.name || "").trim();
  return (
    <div
      data-testid={`trusted-item-${index}`}
      className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity duration-300 whitespace-nowrap"
    >
      {hasLogo && (
        <img
          src={api.resolveImage(item.logo)}
          alt={name || "client logo"}
          className="h-8 md:h-9 w-auto object-contain grayscale contrast-125 brightness-110"
          loading="lazy"
        />
      )}
      {name && (
        <span className="font-serif text-base md:text-lg tracking-wide text-white/75">{name}</span>
      )}
    </div>
  );
}
