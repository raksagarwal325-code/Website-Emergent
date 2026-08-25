import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import { waGeneralLink } from "../lib/whatsapp";
import { editorialGroup, editorialItem, LUXURY_EASE } from "../lib/motion";

export default function CollageSection() {
  const { settings, hp } = useSettings();
  const c = hp.collage;
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const ghostX = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const ruleScale = useTransform(scrollYProgress, [0.12, 0.58], [0, 1]);
  const secondaryHref = c.secondary_cta_link || waGeneralLink(settings?.whatsapp_number) || "#";
  const secondaryExternal = secondaryHref.startsWith("http") || secondaryHref.startsWith("mailto") || secondaryHref.startsWith("tel");
  const stats = (c.stats || []).slice(0, 4);

  return (
    <section ref={sectionRef} data-testid="collage-section" className="relative overflow-hidden border-y border-white/10 bg-[#17080f]">
      <div aria-hidden className="absolute inset-0 opacity-50" style={{ background: "linear-gradient(100deg,rgba(92,39,45,.42),rgba(22,7,15,.68) 48%,rgba(38,12,25,.92)), radial-gradient(circle at 16% 22%,rgba(212,175,55,.10),transparent 30%)" }} />
      <motion.div aria-hidden className="pointer-events-none absolute -right-[4vw] top-1/2 -translate-y-1/2 font-serif text-[24vw] leading-none text-white/[0.035]" style={{ x: prefersReducedMotion ? 0 : ghostX }}>1981</motion.div>

      <div className="relative mx-auto max-w-[1500px] px-6 py-14 md:py-20">
        <motion.div className="grid gap-10 lg:grid-cols-[.9fr_1.6fr] lg:items-center" initial={prefersReducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={editorialGroup}>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="max-w-xl">
            <div className="eyebrow mb-3">{c.eyebrow}</div>
            <h2 className="font-serif text-4xl leading-[1.02] sm:text-5xl lg:text-6xl"><span className="brand-gradient-text">{c.title}</span>{c.highlight && <span className="block text-white">{c.highlight}</span>}</h2>
            {c.subtitle && <p className="mt-4 text-base italic tracking-wide text-[#BF9972] md:text-lg">{c.subtitle}</p>}
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/64 md:text-base">{c.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={c.primary_cta_link || "/catalog"} data-testid="collage-explore-btn" className="inline-flex items-center gap-2 border border-[#D4AF37]/70 px-6 py-3 text-[10px] uppercase tracking-[0.23em] text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-black">{c.primary_cta_text} <ArrowUpRight size={13} /></Link>
              {c.secondary_cta_text && (secondaryExternal ? <a href={secondaryHref} target="_blank" rel="noreferrer" data-testid="collage-wa-btn" className="inline-flex items-center gap-2 px-3 py-3 text-[10px] uppercase tracking-[0.23em] text-white/62 transition hover:text-[#D4AF37]"><MessageCircle size={13} /> {c.secondary_cta_text}</a> : <Link to={secondaryHref} data-testid="collage-wa-btn" className="inline-flex items-center gap-2 px-3 py-3 text-[10px] uppercase tracking-[0.23em] text-white/62 transition hover:text-[#D4AF37]"><MessageCircle size={13} /> {c.secondary_cta_text}</Link>)}
            </div>
          </motion.div>

          <div className="relative py-4">
            <motion.div aria-hidden className="absolute inset-x-0 top-0 h-px origin-left bg-gradient-to-r from-[#D4AF37] via-[#BF9972]/45 to-transparent" style={{ scaleX: prefersReducedMotion ? 1 : ruleScale }} />
            <div className="grid grid-cols-2 md:grid-cols-4">
              {stats.map((s, i) => (
                <motion.div
                  key={`${s.value}-${s.label}`}
                  data-testid={`collage-stat-${i}`}
                  className="relative min-h-[150px] px-4 py-8 md:min-h-[190px] md:px-7 md:py-10"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 36, scale: .97 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: .45 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: .8, delay: i * .1, ease: LUXURY_EASE }}
                >
                  {i > 0 && <span aria-hidden className="absolute left-0 top-8 hidden h-[calc(100%-4rem)] w-px bg-white/10 md:block" />}
                  <motion.div className="font-serif text-4xl leading-none brand-gradient-text md:text-5xl lg:text-6xl" whileInView={prefersReducedMotion ? undefined : { y: [8, 0] }} viewport={{ once: true }} transition={{ duration: .7, delay: .12 + i * .1, ease: LUXURY_EASE }}>{s.value}</motion.div>
                  <div className="mt-3 max-w-[12rem] text-[10px] font-medium uppercase tracking-[0.2em] text-white/65 md:text-[11px]">{s.label}</div>
                  <motion.div aria-hidden className="mt-6 h-px bg-[#D4AF37]/55" initial={prefersReducedMotion ? false : { width: 0 }} whileInView={{ width: 42 }} viewport={{ once: true }} transition={{ duration: .7, delay: .22 + i * .1, ease: LUXURY_EASE }} />
                </motion.div>
              ))}
            </div>
            <motion.div aria-hidden className="absolute inset-x-0 bottom-0 h-px origin-right bg-gradient-to-l from-[#D4AF37] via-[#BF9972]/45 to-transparent" style={{ scaleX: prefersReducedMotion ? 1 : ruleScale }} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
