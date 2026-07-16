import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle, Sparkles, Award, Truck, Palette, Package, ShieldCheck } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const ICONS = [Sparkles, Award, Truck, Palette, Package, ShieldCheck];

export default function CollageSection() {
  const { settings, hp } = useSettings();
  const c = hp.collage;
  const wa = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const secondaryHref = c.secondary_cta_link || (wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent("Hello Samrat Glass Emporium, I would like to enquire about your lighting collection.")}`
    : "#");
  const secondaryExternal = secondaryHref.startsWith("http") || secondaryHref.startsWith("mailto") || secondaryHref.startsWith("tel");

  return (
    <section data-testid="collage-section" className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse at 15% 20%, rgba(163,99,80,0.32), transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(174,118,92,0.22), transparent 55%)"}}></div>
      <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute -top-10 -right-10 w-[420px] h-[420px] opacity-[0.06] pointer-events-none" fill="none" stroke="#D4AF37" strokeWidth="0.6">
        <circle cx="100" cy="30" r="8" /><path d="M100 38 L100 80" /><path d="M60 90 Q100 60 140 90" /><path d="M60 90 L50 130 M100 90 L100 140 M140 90 L150 130" /><circle cx="50" cy="140" r="4" /><circle cx="100" cy="150" r="4" /><circle cx="150" cy="140" r="4" /><path d="M40 145 Q100 175 160 145" />
      </svg>

      <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
        <div className="eyebrow mb-4">{c.eyebrow}</div>
        <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
          <span className="brand-gradient-text">{c.title}</span>
          {c.highlight && <span className="block text-white mt-1">{c.highlight}</span>}
        </h2>
        <div className="mx-auto mt-6 h-px w-16 bg-[#D4AF37]/60"></div>
        <p className="mt-6 text-[#BF9972] text-base md:text-lg italic tracking-wide">{c.subtitle}</p>
        <p className="mt-4 text-white/70 leading-relaxed max-w-2xl mx-auto">{c.description}</p>

        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {(c.stats || []).map((s, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <div key={i} data-testid={`collage-stat-${i}`} className="warm-panel rounded-xl p-6 md:p-7 text-left group hover:border-[#D4AF37]/45 transition-colors relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{background:"radial-gradient(circle,rgba(212,175,55,0.18),transparent 70%)"}}></div>
                <div className="relative">
                  <div className="w-10 h-10 mb-4 flex items-center justify-center border border-[#D4AF37]/40 text-[#D4AF37] rounded-md">
                    <Icon size={16} strokeWidth={1.5} />
                  </div>
                  <div className="font-serif text-2xl md:text-3xl brand-gradient-text leading-none">{s.value}</div>
                  <div className="text-[10px] md:text-[11px] uppercase tracking-[0.24em] text-white/60 mt-3">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link to={c.primary_cta_link || "/catalog"} data-testid="collage-explore-btn" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] transition-colors">
            {c.primary_cta_text} <ArrowUpRight size={14} />
          </Link>
          {c.secondary_cta_text && (secondaryExternal ? (
            <a href={secondaryHref} target="_blank" rel="noreferrer" data-testid="collage-wa-btn" className="inline-flex items-center gap-2 border border-[#D4AF37]/50 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 text-white px-8 py-4 uppercase text-xs tracking-[0.28em] transition-colors">
              <MessageCircle size={14} /> {c.secondary_cta_text}
            </a>
          ) : (
            <Link to={secondaryHref} data-testid="collage-wa-btn" className="inline-flex items-center gap-2 border border-[#D4AF37]/50 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 text-white px-8 py-4 uppercase text-xs tracking-[0.28em] transition-colors">
              <MessageCircle size={14} /> {c.secondary_cta_text}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
