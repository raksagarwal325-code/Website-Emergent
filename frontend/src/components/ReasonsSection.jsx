import React from "react";
import { useSettings } from "../context/SettingsContext";

const ICONS = [
  "M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z",
  "M20 21v-2a4 4 0 0 0-3-3.87M4 21v-2a4 4 0 0 1 3-3.87m5-4a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  "M12 3l9 4-9 4-9-4 9-4zM3 12l9 4 9-4M3 17l9 4 9-4",
  "M20 6L9 17l-5-5",
  "M12 20l-8-8 4-4 4 4 8-8 4 4z",
  "M12 2C8 6 5 9 5 13a7 7 0 0 0 14 0c0-4-3-7-7-11zM12 20a4 4 0 1 1 0-8 4 4 0 0 1 0 8z",
];

export default function ReasonsSection({ compact = false }) {
  const { hp } = useSettings();
  const r = hp.reasons;
  return (
    <section data-testid="reasons-section" className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{background:"radial-gradient(ellipse at 50% 0%, #D4AF37 0%, transparent 55%)"}}></div>
      <div className={`relative max-w-7xl mx-auto px-6 ${compact ? "py-16" : "py-24"}`}>
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className="eyebrow mb-3">{r.eyebrow}</div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight brand-gradient-text">{r.heading}</h2>
          <div className="mt-4 mx-auto h-px w-16 bg-[#D4AF37]/60"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(r.items || []).map((it, i) => (
            <div key={i} data-testid={`reason-${i}`} className="warm-panel p-6 group hover:border-[#D4AF37]/50 transition-colors">
              <div className="w-10 h-10 mb-4 flex items-center justify-center border border-[#D4AF37]/40 text-[#D4AF37] group-hover:bg-[#D4AF37]/10 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[i % ICONS.length]}/></svg>
              </div>
              <div className="font-serif text-base md:text-lg leading-snug text-white mb-2">{it.title}</div>
              <p className="text-white/60 text-xs md:text-sm leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

