import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Award, Sparkles, Package, Truck } from "lucide-react";
import ReasonsSection from "../components/ReasonsSection";
import SEO from "../components/SEO";
import { useSettings } from "../context/SettingsContext";

const STAT_ICONS = [Award, Sparkles, Package, Truck];

export default function About() {
  const { hp } = useSettings();
  const a = hp.about;
  const founder = a.founder || {};
  const paragraphs = (a.story_paragraphs || []).map((p) => (typeof p === "string" ? p : p?.text || ""));
  const stats = a.stats || [];

  return (
    <div data-testid="page-about">
      <SEO
        title="About · Samrat Glass Emporium · Firozabad since 1981"
        description="Since 1981, our craftsmen in Firozabad have shaped glass into decorative lighting for homes, hotels and luxury interiors across India."
        path="/about"
      />
      {/* Hero */}
      <section className="relative overflow-hidden grain">
        <div className="absolute inset-0 opacity-25">
          <img src="/collage.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{background:"linear-gradient(180deg, rgba(22,7,15,0.75) 0%, rgba(22,7,15,0.95) 60%, #16070f 100%)"}}></div>
          <div className="absolute inset-0" style={{background:"radial-gradient(circle at 20% 30%, rgba(163,99,80,0.35), transparent 45%)"}}></div>
        </div>
        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24 text-center">
          <div className="flex justify-center mb-8">
            <img src="/logo.jpeg" alt="Samrat Glass Emporium" className="w-20 h-20 object-cover brand-glow" />
          </div>
          <div className="eyebrow mb-6">{a.eyebrow}</div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
            {a.title_pre} <span className="brand-gradient-text">{a.title_highlight}</span>
          </h1>
          {a.tagline && (
            <p className="mt-6 text-[#BF9972] text-sm md:text-base italic">{a.tagline}</p>
          )}
        </div>
      </section>

      {/* Story */}
      {paragraphs.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-20 space-y-8 text-white/80 leading-relaxed">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className={i === 0 ? "text-lg first-letter:font-serif first-letter:text-5xl first-letter:text-[#D4AF37] first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:mt-1" : ""}
            >
              {p}
            </p>
          ))}
        </section>
      )}

      {/* Founder callout */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="warm-panel border-l-2 border-[#D4AF37] p-8 md:p-10 flex flex-col md:flex-row gap-6 md:items-center relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 pointer-events-none" style={{background:"radial-gradient(circle at 80% 50%, rgba(191,153,114,0.35), transparent 60%)"}}></div>
          {founder.image ? (
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full flex-shrink-0 overflow-hidden brand-glow ring-2 ring-[#D4AF37]/40" data-testid="founder-photo">
              <img src={founder.image} alt={founder.name || "Founder"} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full flex-shrink-0 flex items-center justify-center brand-glow" style={{background:"linear-gradient(135deg,#A36350,#8B4F3F)"}}>
              <span className="font-serif text-4xl text-[#2A1125]">{founder.initial || "S"}</span>
            </div>
          )}
          <div className="relative">
            <div className="eyebrow mb-2 text-[#D4AF37]">{founder.eyebrow}</div>
            <h3 className="font-serif text-2xl md:text-3xl mb-3">{founder.name}</h3>
            <p className="text-white/70 leading-relaxed">{founder.description}</p>
          </div>
        </div>

        {founder.quote && (
          <div data-testid="founder-quote-block" className="relative mt-6 md:mt-8 max-w-3xl mx-auto text-center px-6 md:px-10 py-10 md:py-12">
            <span aria-hidden className="absolute left-0 top-0 font-serif text-[6rem] md:text-[8rem] leading-none text-[#D4AF37]/25 select-none">&ldquo;</span>
            <span aria-hidden className="absolute right-0 bottom-0 font-serif text-[6rem] md:text-[8rem] leading-none text-[#D4AF37]/25 select-none rotate-180">&ldquo;</span>
            <p className="font-serif italic text-xl md:text-2xl leading-relaxed text-white/85">
              {founder.quote}
            </p>
            <div className="mx-auto mt-6 h-px w-16 bg-[#D4AF37]/60"></div>
            {founder.signature && (
              <div className="mt-4 text-[11px] uppercase tracking-[0.32em] text-[#BF9972]">{founder.signature}</div>
            )}
          </div>
        )}
      </section>

      {/* Stats */}
      {stats.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => {
              const Icon = STAT_ICONS[i % STAT_ICONS.length];
              return (
                <div key={i} data-testid={`stat-${i}`} className="warm-panel p-8 text-center">
                  <Icon size={20} strokeWidth={1.4} className="text-[#D4AF37] mx-auto mb-4" />
                  <div className="font-serif text-3xl md:text-4xl brand-gradient-text">{s.value}</div>
                  <div className="text-xs uppercase tracking-[0.24em] text-white/50 mt-2">{s.label}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <ReasonsSection compact />

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="font-serif text-3xl md:text-4xl mb-6">{a.cta_heading}</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {a.cta_primary_text && (
            <Link to={a.cta_primary_link || "/catalog"} className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">
              {a.cta_primary_text} <ArrowUpRight size={14} />
            </Link>
          )}
          {a.cta_secondary_text && (
            <Link to={a.cta_secondary_link || "/contact"} className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.28em]">
              {a.cta_secondary_text}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
