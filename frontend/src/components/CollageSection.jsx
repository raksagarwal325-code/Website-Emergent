import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import { waGeneralLink } from "../lib/whatsapp";
import { editorialGroup, editorialItem, LUXURY_EASE } from "../lib/motion";

export default function CollageSection() {
  const { settings, hp } = useSettings();
  const c = hp.collage;
  const prefersReducedMotion = useReducedMotion();
  const secondaryHref = c.secondary_cta_link || waGeneralLink(settings?.whatsapp_number) || "#";
  const secondaryExternal = secondaryHref.startsWith("http") || secondaryHref.startsWith("mailto") || secondaryHref.startsWith("tel");
  const stats = (c.stats || []).slice(0, 4);

  return (
    <section data-testid="collage-section" className="relative overflow-hidden border-y border-white/10 bg-[#17080f]">
      <div aria-hidden className="absolute inset-0 opacity-50" style={{ background: "linear-gradient(100deg,rgba(92,39,45,.42),rgba(22,7,15,.68) 48%,rgba(38,12,25,.92)), radial-gradient(circle at 16% 22%,rgba(212,175,55,.10),transparent 30%)" }} />
      <div aria-hidden className="pointer-events-none absolute -right-16 top-1/2 -translate-y-1/2 font-serif text-[19vw] leading-none text-white/[0.025]">1981</div>

      <div className="relative mx-auto max-w-[1500px] px-6 py-12 md:py-16">
        <motion.div className="grid gap-8 lg:grid-cols-[1.05fr_1.55fr] lg:items-end" initial={prefersReducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.22 }} variants={editorialGroup}>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="max-w-xl">
            <div className="eyebrow mb-3">{c.eyebrow}</div>
            <h2 className="font-serif text-4xl leading-[1.02] sm:text-5xl lg:text-6xl">
              <span className="brand-gradient-text">{c.title}</span>
              {c.highlight && <span className="block text-white">{c.highlight}</span>}
            </h2>
            {c.subtitle && <p className="mt-4 text-base italic tracking-wide text-[#BF9972] md:text-lg">{c.subtitle}</p>}
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/64 md:text-base">{c.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={c.primary_cta_link || "/catalog"} data-testid="collage-explore-btn" className="inline-flex items-center gap-2 border border-[#D4AF37]/70 px-6 py-3 text-[10px] uppercase tracking-[0.23em] text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-black">{c.primary_cta_text} <ArrowUpRight size={13} /></Link>
              {c.secondary_cta_text && (secondaryExternal ? <a href={secondaryHref} target="_blank" rel="noreferrer" data-testid="collage-wa-btn" className="inline-flex items-center gap-2 px-3 py-3 text-[10px] uppercase tracking-[0.23em] text-white/62 transition hover:text-[#D4AF37]"><MessageCircle size={13} /> {c.secondary_cta_text}</a> : <Link to={secondaryHref} data-testid="collage-wa-btn" className="inline-flex items-center gap-2 px-3 py-3 text-[10px] uppercase tracking-[0.23em] text-white/62 transition hover:text-[#D4AF37]"><MessageCircle size={13} /> {c.secondary_cta_text}</Link>)}
            </div>
          </motion.div>

          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="relative border-y border-[#BF9972]/18">
            <div className="grid grid-cols-2 md:grid-cols-4">
              {stats.map((s, i) => (
                <motion.div key={`${s.value}-${s.label}`} data-testid={`collage-stat-${i}`} className="relative min-h-[132px] px-4 py-6 md:min-h-[156px] md:px-6 md:py-8" initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.65, delay: i * 0.08, ease: LUXURY_EASE }}>
                  {i > 0 && <span aria-hidden className="absolute left-0 top-5 hidden h-[calc(100%-2.5rem)] w-px bg-white/10 md:block" />}
                  <div className="font-serif text-3xl leading-none brand-gradient-text md:text-4xl lg:text-5xl">{s.value}</div>
                  <div className="mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-white/62 md:text-[11px]">{s.label}</div>
                  <div aria-hidden className="mt-5 h-px w-10 bg-[#D4AF37]/45" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
