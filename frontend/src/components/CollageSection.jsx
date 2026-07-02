import React from "react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowUpRight, MessageCircle, Sparkles, Award, Truck, Palette } from "lucide-react";
import { api } from "../lib/api";

const STATS = [
  { icon: Sparkles, value: "1000+", label: "Designs" },
  { icon: Award, value: "40+", label: "Years Experience" },
  { icon: Truck, value: "Pan-India", label: "Delivery" },
  { icon: Palette, value: "Custom", label: "Lighting Available" },
];

export default function CollageSection() {
  const [wa, setWa] = useState("");

  useEffect(() => {
    api.getSettings().then((s) => setWa((s.whatsapp_number || "").replace(/[^0-9]/g, ""))).catch(() => {});
  }, []);

  const waLink = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent("Hello Samrat Glass Emporium, I would like to enquire about your lighting collection.")}`
    : "#";

  return (
    <section data-testid="collage-section" className="relative overflow-hidden">
      {/* Ambient copper/terracotta glows */}
      <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse at 15% 20%, rgba(163,99,80,0.32), transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(174,118,92,0.22), transparent 55%)"}}></div>

      {/* Faint chandelier SVG line-art motif */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="absolute -top-10 -right-10 w-[420px] h-[420px] opacity-[0.06] pointer-events-none"
        fill="none"
        stroke="#D4AF37"
        strokeWidth="0.6"
      >
        <circle cx="100" cy="30" r="8" />
        <path d="M100 38 L100 80" />
        <path d="M60 90 Q100 60 140 90" />
        <path d="M60 90 L50 130 M100 90 L100 140 M140 90 L150 130" />
        <circle cx="50" cy="140" r="4" />
        <circle cx="100" cy="150" r="4" />
        <circle cx="150" cy="140" r="4" />
        <path d="M40 145 Q100 175 160 145" />
      </svg>

      <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
        <div className="eyebrow mb-4">The Full Range</div>
        <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
          <span className="brand-gradient-text">1000+ Light Options</span>
          <span className="block text-white mt-1">Inside</span>
        </h2>
        <div className="mx-auto mt-6 h-px w-16 bg-[#D4AF37]/60"></div>
        <p className="mt-6 text-[#BF9972] text-base md:text-lg italic tracking-wide">
          Handcrafted decorative lighting from Firozabad
        </p>
        <p className="mt-4 text-white/70 leading-relaxed max-w-2xl mx-auto">
          Explore chandeliers, hanging lights, wall lights, table lamps, floor lamps, sconces, and custom decorative lighting designs crafted by experienced artisans.
        </p>

        {/* Stat cards */}
        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              data-testid={`collage-stat-${i}`}
              className="warm-panel rounded-xl p-6 md:p-7 text-left group hover:border-[#D4AF37]/45 transition-colors relative overflow-hidden"
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{background:"radial-gradient(circle,rgba(212,175,55,0.18),transparent 70%)"}}></div>
              <div className="relative">
                <div className="w-10 h-10 mb-4 flex items-center justify-center border border-[#D4AF37]/40 text-[#D4AF37] rounded-md">
                  <s.icon size={16} strokeWidth={1.5} />
                </div>
                <div className="font-serif text-2xl md:text-3xl brand-gradient-text leading-none">{s.value}</div>
                <div className="text-[10px] md:text-[11px] uppercase tracking-[0.24em] text-white/60 mt-3">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link
            to="/catalog"
            data-testid="collage-explore-btn"
            className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] transition-colors"
          >
            Explore Catalog <ArrowUpRight size={14} />
          </Link>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            data-testid="collage-wa-btn"
            className="inline-flex items-center gap-2 border border-[#D4AF37]/50 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 text-white px-8 py-4 uppercase text-xs tracking-[0.28em] transition-colors"
          >
            <MessageCircle size={14} /> Send WhatsApp Inquiry
          </a>
        </div>
      </div>
    </section>
  );
}
