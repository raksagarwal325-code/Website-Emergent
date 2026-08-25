import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export default function FounderTeaser() {
  const { hp } = useSettings();
  const f = hp?.about?.founder || {};
  const t = hp?.founder_teaser || {};
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const portraitScale = useTransform(scrollYProgress, [0, 0.45, 1], [0.9, 1.03, 1]);
  const portraitOpacity = useTransform(scrollYProgress, [0, 0.18, 1], [0.4, 1, 1]);
  const copyY = useTransform(scrollYProgress, [0, 0.42, 0.8, 1], [100, 0, 0, -70]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.2, 0.82, 1], [0, 1, 1, 0.25]);
  const yearY = useTransform(scrollYProgress, [0, 1], [60, -80]);
  const ruleScale = useTransform(scrollYProgress, [0.08, 0.48], [0, 1]);

  if (t.enabled === false || !f.image) return null;

  const eyebrow = t.eyebrow || "Meet the founder";
  const title = t.title || "Four decades of glass, in one steady hand.";
  const body = t.body || "Since 1981, Mr. Sunil Kumar Agarwal has led our atelier in Firozabad — training master craftsmen, pushing form and finish, and quietly building a name that lights homes, hotels and hospitality across India.";
  const cta_text = t.cta_text || "Read our story";
  const cta_link = t.cta_link || "/about";

  return (
    <section ref={sectionRef} data-testid="founder-teaser" className="relative isolate h-auto md:h-[190vh] px-6 bg-[#16070f]">
      <div className="max-w-7xl mx-auto md:sticky md:top-20 md:h-[calc(100vh-5rem)] flex items-center py-20 md:py-8 overflow-hidden">
        <div className="relative warm-panel w-full overflow-hidden min-h-[620px] md:min-h-0 md:h-[74vh] flex items-center">
          <motion.div aria-hidden className="absolute right-[-2vw] bottom-[-8vh] font-serif text-[24vw] leading-none text-white/[0.025] select-none" style={{ y: prefersReducedMotion ? 0 : yearY }}>1981</motion.div>
          <div className="absolute -top-28 -right-20 w-[34rem] h-[34rem] rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,175,55,0.5), transparent 66%)" }} />
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-[0.85fr_1.15fr] gap-10 md:gap-14 items-center w-full p-8 md:p-12 lg:p-14">
            <motion.div className="relative flex justify-center" style={{ scale: prefersReducedMotion ? 1 : portraitScale, opacity: prefersReducedMotion ? 1 : portraitOpacity }}>
              <div className="relative">
                <div data-testid="founder-teaser-photo" className="overflow-hidden brand-glow border border-[#D4AF37]/35 w-[260px] h-[340px] md:w-[300px] md:h-[405px]">
                  <img src={f.image} alt={f.name || "Founder"} loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -left-5 -top-5 w-16 h-16 border-l border-t border-[#D4AF37]/60" aria-hidden />
                <div className="absolute -right-5 -bottom-5 w-16 h-16 border-r border-b border-[#D4AF37]/60" aria-hidden />
              </div>
            </motion.div>

            <motion.div className="text-center md:text-left will-change-transform min-w-0" style={{ y: prefersReducedMotion ? 0 : copyY, opacity: prefersReducedMotion ? 1 : copyOpacity }}>
              <div className="eyebrow mb-4 text-[#D4AF37]">{eyebrow}</div>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.04] mb-6 max-w-3xl text-balance">{title}</h2>
              <motion.div aria-hidden className="h-px w-44 bg-gradient-to-r from-[#D4AF37] to-transparent origin-left mb-7 mx-auto md:mx-0" style={{ scaleX: prefersReducedMotion ? 1 : ruleScale }} />
              <p className="text-white/70 leading-relaxed md:text-base lg:text-lg max-w-2xl">{body}</p>
              {f.name && <div className="mt-7 flex flex-wrap items-center gap-3 justify-center md:justify-start text-[11px] uppercase tracking-[0.28em] text-[#BF9972]"><span className="inline-block w-8 h-px bg-[#D4AF37]/60" />{f.name}{f.signature && <><span className="text-white/40">·</span><span className="text-white/50 tracking-normal normal-case text-sm italic">Since 1981</span></>}</div>}
              <div className="mt-8 flex justify-center md:justify-start"><Link to={cta_link} data-testid="founder-teaser-cta" className="group inline-flex items-center gap-2 border border-[#D4AF37]/60 hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors px-7 py-3.5 uppercase text-xs tracking-[0.28em] text-[#D4AF37]">{cta_text}<ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link></div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
