import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { editorialGroup, editorialItem, editorialItemSoft, LUXURY_EASE } from "../lib/motion";

export default function FounderTeaser() {
  const { hp } = useSettings();
  const f = hp?.about?.founder || {};
  const t = hp?.founder_teaser || {};
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const yearY = useTransform(scrollYProgress, [0, 1], [12, -12]);

  if (t.enabled === false || !f.image) return null;

  const eyebrow = t.eyebrow || "Meet the founder";
  const title = t.title || "Four decades of glass, in one steady hand.";
  const body = t.body || "Since 1981, Mr. Sunil Kumar Agarwal has led our atelier in Firozabad — training master craftsmen, pushing form and finish, and quietly building a name that lights homes, hotels and hospitality across India.";
  const cta_text = t.cta_text || "Read our story";
  const cta_link = t.cta_link || "/about";

  return (
    <section ref={sectionRef} data-testid="founder-teaser" className="relative isolate overflow-hidden bg-[#16070f] px-6 py-20 md:py-28">
      <div className="relative mx-auto max-w-7xl overflow-hidden border border-[#BF9972]/15 bg-[linear-gradient(135deg,rgba(72,29,45,.78),rgba(28,9,18,.94))]">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-[-0.08em] right-[2.5%] select-none whitespace-nowrap font-serif text-[clamp(8rem,18vw,17rem)] leading-none tracking-[-0.07em] text-[#D4AF37]/[0.085]"
          style={{ y: prefersReducedMotion ? 0 : yearY }}
        >
          1981
        </motion.div>
        <div aria-hidden className="absolute -right-24 -top-28 h-[34rem] w-[34rem] rounded-full opacity-20" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.48), transparent 66%)" }} />

        <div className="relative z-10 grid grid-cols-1 items-center gap-12 p-8 md:grid-cols-[0.88fr_1.12fr] md:p-12 lg:gap-16 lg:p-16">
          <motion.div className="relative flex justify-center md:justify-start" initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.9, ease: LUXURY_EASE }}>
            <div className="relative">
              <div data-testid="founder-teaser-photo" className="relative h-[390px] w-[280px] overflow-hidden rounded-t-[140px] border border-[#D4AF37]/35 bg-[#5a4035] shadow-[0_30px_80px_-28px_rgba(0,0,0,.95)] md:h-[440px] md:w-[320px] md:rounded-t-[160px]">
                <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(236,206,166,.36),transparent_48%),linear-gradient(180deg,#6a493b,#2a111d)]" />
                <img src={f.image} alt={f.name || "Founder"} loading="lazy" className="relative h-full w-full scale-[1.28] object-cover object-center mix-blend-normal" style={{ transformOrigin: "50% 46%" }} />
                <div aria-hidden className="absolute inset-0 ring-1 ring-inset ring-white/5" />
              </div>
              <motion.div aria-hidden className="absolute -left-6 -top-6 h-20 w-20 border-l border-t border-[#D4AF37]/65" initial={prefersReducedMotion ? false : { scale: 0.65, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay: 0.15, ease: LUXURY_EASE }} />
              <motion.div aria-hidden className="absolute -bottom-6 -right-6 h-20 w-20 border-b border-r border-[#D4AF37]/65" initial={prefersReducedMotion ? false : { scale: 0.65, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay: 0.25, ease: LUXURY_EASE }} />
            </div>
          </motion.div>

          <motion.div className="min-w-0 text-center md:text-left" initial={prefersReducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={editorialGroup}>
            <motion.div variants={prefersReducedMotion ? undefined : editorialItemSoft} className="eyebrow mb-4 text-[#D4AF37]">{eyebrow}</motion.div>
            <motion.h2 variants={prefersReducedMotion ? undefined : editorialItem} className="mb-5 max-w-3xl font-serif text-4xl leading-[1.04] text-balance md:text-5xl lg:text-6xl">{title}</motion.h2>
            <motion.div variants={prefersReducedMotion ? undefined : editorialItemSoft} aria-hidden className="mx-auto mb-6 h-px w-44 bg-gradient-to-r from-[#D4AF37] to-transparent md:mx-0" />
            <motion.p variants={prefersReducedMotion ? undefined : editorialItem} className="max-w-2xl text-white/70 leading-relaxed md:text-base lg:text-lg">{body}</motion.p>
            {f.name && <motion.div variants={prefersReducedMotion ? undefined : editorialItemSoft} className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.28em] text-[#BF9972] md:justify-start"><span className="inline-block h-px w-8 bg-[#D4AF37]/60" />{f.name}{f.signature && <><span className="text-white/40">·</span><span className="text-sm normal-case italic tracking-normal text-white/50">Since 1981</span></>}</motion.div>}
            <motion.div variants={prefersReducedMotion ? undefined : editorialItemSoft} className="mt-7 flex justify-center md:justify-start"><Link to={cta_link} data-testid="founder-teaser-cta" className="group inline-flex items-center gap-2 border border-[#D4AF37]/60 px-7 py-3.5 text-xs uppercase tracking-[0.28em] text-[#D4AF37] transition-colors hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black">{cta_text}<ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link></motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
