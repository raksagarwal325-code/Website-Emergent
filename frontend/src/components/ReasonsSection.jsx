import React from "react";
import { motion, useReducedMotion } from "framer-motion";
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

  return (
    <section data-testid="reasons-section" className="relative overflow-hidden">
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{ background: "radial-gradient(ellipse at 50% 0%, #D4AF37 0%, transparent 55%)" }}
        initial={prefersReducedMotion ? false : { opacity: 0.035, scale: 0.94 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 0.075, scale: 1.04 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.4, ease: LUXURY_EASE }}
      />

      <div className={`relative max-w-7xl mx-auto px-6 ${compact ? "py-16" : "py-24"}`}>
        <motion.div
          className="text-center mb-12 max-w-2xl mx-auto"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.8, ease: LUXURY_EASE }}
        >
          <div className="eyebrow mb-3">{r.eyebrow}</div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight brand-gradient-text">{r.heading}</h2>
          <motion.div
            className="mt-4 mx-auto h-px w-16 origin-center bg-[#D4AF37]/60"
            initial={prefersReducedMotion ? false : { scaleX: 0 }}
            whileInView={prefersReducedMotion ? undefined : { scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, delay: 0.15, ease: LUXURY_EASE }}
          />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(r.items || []).map((it, i) => (
            <motion.div
              key={i}
              data-testid={`reason-${i}`}
              className="warm-panel p-6 group relative overflow-hidden hover:border-[#D4AF37]/50 transition-colors"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 38, scale: 0.975 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.24 }}
              transition={{ duration: 0.7, delay: prefersReducedMotion ? 0 : (i % 4) * 0.08, ease: LUXURY_EASE }}
              whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.012 }}
            >
              <motion.div
                aria-hidden
                className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-[#D4AF37]/10"
                initial={false}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.18, opacity: 0.75 }}
                transition={{ duration: 0.45, ease: LUXURY_EASE }}
              />

              <motion.div
                className="w-10 h-10 mb-4 flex items-center justify-center border border-[#D4AF37]/40 text-[#D4AF37] group-hover:bg-[#D4AF37]/10 transition-colors"
                whileHover={prefersReducedMotion ? undefined : { rotate: 4, scale: 1.08 }}
                transition={{ duration: 0.28 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[i % ICONS.length]} /></svg>
              </motion.div>

              <div className="font-serif text-base md:text-lg leading-snug text-white mb-2">{it.title}</div>
              <p className="text-sm md:text-[15px] text-white/70 leading-relaxed">{it.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
