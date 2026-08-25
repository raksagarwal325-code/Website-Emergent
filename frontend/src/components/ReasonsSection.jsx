import React, { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import { LUXURY_EASE } from "../lib/motion";

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
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const headingY = useTransform(scrollYProgress, [0, 0.5, 1], prefersReducedMotion ? [0, 0, 0] : [34, 0, -20]);
  const gridY = useTransform(scrollYProgress, [0.18, 0.55, 0.9], prefersReducedMotion ? [0, 0, 0] : [26, 0, -18]);
  const glowX = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? ["0%", "0%"] : ["-12%", "12%"]);

  return (
    <section ref={sectionRef} data-testid="reasons-section" className="relative overflow-hidden">
      <motion.div
        aria-hidden
        className="absolute -inset-x-[12%] inset-y-0 pointer-events-none opacity-[0.07]"
        style={{
          x: glowX,
          background: "radial-gradient(ellipse at 50% 0%, #D4AF37 0%, transparent 55%), radial-gradient(circle at 18% 70%, rgba(163,99,80,.22), transparent 35%)",
        }}
      />

      <div className={`relative max-w-7xl mx-auto px-6 ${compact ? "py-16" : "py-24"}`}>
        <motion.div
          className="text-center mb-12 max-w-2xl mx-auto"
          style={{ y: headingY }}
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.965 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.28 }}
          transition={{ duration: 0.82, ease: LUXURY_EASE }}
        >
          <motion.div
            className="eyebrow mb-3"
            initial={prefersReducedMotion ? false : { opacity: 0, letterSpacing: "0.42em" }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, letterSpacing: "0.28em" }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, ease: LUXURY_EASE }}
          >
            {r.eyebrow}
          </motion.div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight brand-gradient-text">{r.heading}</h2>
          <motion.div
            className="mt-4 mx-auto h-px w-16 origin-center bg-[#D4AF37]/60"
            initial={prefersReducedMotion ? false : { scaleX: 0 }}
            whileInView={prefersReducedMotion ? undefined : { scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.15, ease: LUXURY_EASE }}
          />
        </motion.div>

        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ y: gridY }}>
          {(r.items || []).map((it, i) => (
            <motion.div
              key={i}
              data-testid={`reason-${i}`}
              className="warm-panel p-6 group relative overflow-hidden hover:border-[#D4AF37]/50 transition-colors"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 58, x: i % 2 === 0 ? -18 : 18, scale: 0.95 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0, x: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.18 }}
              transition={{ duration: 0.82, delay: prefersReducedMotion ? 0 : (i % 4) * 0.1, ease: LUXURY_EASE }}
              whileHover={prefersReducedMotion ? undefined : { y: -8, scale: 1.015 }}
            >
              {!prefersReducedMotion && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 5.2 + (i % 3) * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                >
                  <motion.div
                    className="absolute left-0 top-0 h-px w-24 bg-gradient-to-r from-[#D4AF37]/90 to-transparent"
                    animate={{ x: [0, 115, 0], opacity: [0.28, 0.9, 0.28] }}
                    transition={{ duration: 5.5 + i * 0.25, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>
              )}

              <motion.div
                aria-hidden
                className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-[#D4AF37]/10"
                animate={prefersReducedMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.24, 0.58, 0.24] }}
                transition={{ duration: 6.2 + i * 0.3, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
              />

              <motion.div
                className="w-10 h-10 mb-4 flex items-center justify-center border border-[#D4AF37]/40 text-[#D4AF37] group-hover:bg-[#D4AF37]/10 transition-colors"
                initial={prefersReducedMotion ? false : { rotate: -8, scale: 0.82 }}
                whileInView={prefersReducedMotion ? undefined : { rotate: 0, scale: 1 }}
                viewport={{ once: true }}
                animate={prefersReducedMotion ? undefined : { y: [0, -3, 0], rotate: [0, 2, 0] }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 4.8 + i * 0.35, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }}
                whileHover={prefersReducedMotion ? undefined : { rotate: 5, scale: 1.1 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[i % ICONS.length]} /></svg>
              </motion.div>

              <motion.div
                className="font-serif text-base md:text-lg leading-snug text-white mb-2"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.28 + (i % 4) * 0.1 }}
              >
                {it.title}
              </motion.div>
              <motion.p
                className="text-sm md:text-[15px] text-white/70 leading-relaxed"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.36 + (i % 4) * 0.1 }}
              >
                {it.body}
              </motion.p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
