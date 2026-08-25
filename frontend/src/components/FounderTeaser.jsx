import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { LUXURY_EASE } from "../lib/motion";

export default function FounderTeaser() {
  const { hp } = useSettings();
  const f = hp?.about?.founder || {};
  const t = hp?.founder_teaser || {};
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], [46, -46]);
  const photoScale = useTransform(scrollYProgress, [0, 0.48, 1], [0.94, 1.04, 0.98]);
  const copyY = useTransform(scrollYProgress, [0, 0.45, 1], [90, 0, -72]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.22, 0.78, 1], [0.2, 1, 1, 0.35]);
  const ruleScale = useTransform(scrollYProgress, [0.15, 0.55], [0, 1]);

  if (t.enabled === false || !f.image) return null;

  const eyebrow = t.eyebrow || "Meet the founder";
  const title = t.title || "Four decades of glass, in one steady hand.";
  const body =
    t.body ||
    "Since 1981, Mr. Sunil Kumar Agarwal has led our atelier in Firozabad — training master craftsmen, pushing form and finish, and quietly building a name that lights homes, hotels and hospitality across India.";
  const cta_text = t.cta_text || "Read our story";
  const cta_link = t.cta_link || "/about";

  return (
    <section
      ref={sectionRef}
      data-testid="founder-teaser"
      className="relative max-w-7xl mx-auto px-6 py-20 md:py-28 md:min-h-[135vh]"
    >
      <div className="md:sticky md:top-24">
        <div className="relative warm-panel overflow-hidden">
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(212,175,55,0.55), transparent 65%)" }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(163,99,80,0.55), transparent 65%)" }}
          />

          <div className="relative grid md:grid-cols-[0.9fr_1.35fr] gap-8 md:gap-14 items-center p-8 md:p-14 lg:p-16">
            <motion.div
              className="flex justify-center md:justify-start will-change-transform"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 1, ease: LUXURY_EASE }}
              style={{
                y: prefersReducedMotion ? 0 : photoY,
                scale: prefersReducedMotion ? 1 : photoScale,
              }}
            >
              <div className="relative">
                <div
                  data-testid="founder-teaser-photo"
                  className="rounded-full overflow-hidden brand-glow ring-2 ring-[#D4AF37]/40"
                  style={{ width: 260, height: 260, minWidth: 260, minHeight: 260 }}
                >
                  <img
                    src={f.image}
                    alt={f.name || "Founder"}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%", display: "block" }}
                  />
                </div>
                <motion.div
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 -bottom-8 h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37]/80 to-transparent origin-center"
                  style={{ scaleX: prefersReducedMotion ? 1 : ruleScale }}
                />
              </div>
            </motion.div>

            <motion.div
              className="text-center md:text-left will-change-transform"
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, ease: LUXURY_EASE }}
              style={{
                y: prefersReducedMotion ? 0 : copyY,
                opacity: prefersReducedMotion ? 1 : copyOpacity,
              }}
            >
              <div className="eyebrow mb-4 text-[#D4AF37]">{eyebrow}</div>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-[1.06] mb-6">
                {title}
              </h2>
              <p className="text-white/70 leading-relaxed md:text-lg max-w-2xl md:max-w-none">
                {body}
              </p>

              {f.name && (
                <div className="mt-7 flex items-center gap-3 justify-center md:justify-start text-[11px] uppercase tracking-[0.32em] text-[#BF9972]">
                  <span className="inline-block w-8 h-px bg-[#D4AF37]/60" />
                  {f.name}
                  {f.signature && <span className="text-white/40">·</span>}
                  {f.signature && <span className="text-white/50 tracking-normal normal-case text-sm italic">Since 1981</span>}
                </div>
              )}

              <div className="mt-8 flex justify-center md:justify-start">
                <Link
                  to={cta_link}
                  data-testid="founder-teaser-cta"
                  className="group inline-flex items-center gap-2 border border-[#D4AF37]/60 hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors px-7 py-3.5 uppercase text-xs tracking-[0.28em] text-[#D4AF37]"
                >
                  {cta_text}
                  <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
