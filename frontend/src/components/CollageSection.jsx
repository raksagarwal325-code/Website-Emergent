import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function CollageSection() {
  return (
    <section data-testid="collage-section" className="relative overflow-hidden">
      {/* Ambient warm glow */}
      <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse at 15% 40%, rgba(163,99,80,0.22), transparent 55%)"}}></div>

      <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
          {/* Image card — 45% on desktop, full width on mobile */}
          <div className="md:col-span-5 order-1 w-full">
            <div
              className="relative w-full rounded-2xl overflow-hidden border border-[#BF9972]/30 bg-[#1e0d1a] mx-auto"
              style={{
                maxHeight: "520px",
                aspectRatio: "1 / 1",
                boxShadow: "0 0 0 1px rgba(212,175,55,0.25), 0 24px 60px -12px rgba(163,99,80,0.55), 0 8px 24px -8px rgba(0,0,0,0.6)",
              }}
            >
              <img
                src="/collage.png"
                alt="Samrat Glass Emporium chandelier collection — 1000+ light options"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(135deg, rgba(42,17,37,0.10) 0%, transparent 55%)" }}
              ></div>
              {/* subtle top hairline highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent"></div>
            </div>
          </div>

          {/* Copy — 55% on desktop */}
          <div className="md:col-span-7 order-2 min-w-0">
            <div className="eyebrow mb-3">The Full Range</div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-[1.1]">
              <span className="brand-gradient-text">1000+ Light Options</span>
              <span className="block text-white">Inside</span>
            </h2>
            <p className="mt-6 text-white/75 leading-relaxed text-base md:text-lg max-w-xl">
              Handcrafted decorative lighting from Firozabad — chandeliers, hanging lights, wall lights, table lamps, floor lamps and sconces in every finish, size and mood.
            </p>
            <p className="mt-3 text-white/55 text-sm md:text-base leading-relaxed max-w-xl">
              From compact bedroom sconces to grand foyer chandeliers, our workshop produces designs for every Indian home, hotel, showroom and restaurant.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/catalog"
                data-testid="collage-explore-btn"
                className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-7 py-3.5 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] transition-colors"
              >
                Explore Catalog <ArrowUpRight size={14} />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-7 py-3.5 uppercase text-xs tracking-[0.28em] transition-colors"
              >
                Our Story
              </Link>
            </div>

            {/* Feature strip */}
            <div className="mt-10 pt-6 border-t border-[#BF9972]/15 grid grid-cols-3 gap-4 max-w-xl">
              {[["1000+","Designs"],["40+","Years"],["Pan-India","Delivery"]].map(([v, l]) => (
                <div key={l}>
                  <div className="font-serif text-xl md:text-2xl text-[#D4AF37] leading-none">{v}</div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/50 mt-2">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
