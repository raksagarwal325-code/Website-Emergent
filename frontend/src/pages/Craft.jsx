import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Flame, Sparkles, Scissors, Wrench, Award } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: Sparkles,
    title: "Design",
    kicker: "The drawing",
    body:
      "Each piece begins as a pencil sketch on the workshop table — proportions calibrated to a room, a chandelier drop measured against a ceiling. Nothing is designed to be mass-produced; every silhouette is drawn to be lived under.",
  },
  {
    num: "02",
    icon: Flame,
    title: "The Furnace",
    kicker: "Molten glass · 1400°C",
    body:
      "Master glass-blowers in Firozabad gather glass from the furnace on iron blowpipes and coax it into form through breath and rotation — the same technique this city has practiced for over four centuries.",
  },
  {
    num: "03",
    icon: Scissors,
    title: "Cutting",
    kicker: "Facets by hand",
    body:
      "Once cooled, crystal panels are hand-cut on stone wheels to shape the signature diamond facets that catch light. It is slow, exacting work — the angle of each cut determines how the finished piece will glow.",
  },
  {
    num: "04",
    icon: Wrench,
    title: "Assembly",
    kicker: "Brass, wire, patience",
    body:
      "Individual glass elements are strung and set into hand-worked brass frames — sometimes a single chandelier requires 400+ pieces threaded together. This step alone can take a week for a single fixture.",
  },
  {
    num: "05",
    icon: Award,
    title: "Finish",
    kicker: "Signed and inspected",
    body:
      "Every finished piece is lit, inspected, and packed by hand in our atelier before dispatch. Bespoke commissions are also numbered and signed — a signature you'll only see on the underside of the mount.",
  },
];

export default function Craft() {
  return (
    <div data-testid="page-craft">
      {/* Hero */}
      <section className="relative overflow-hidden grain">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(22,7,15,0.6) 0%, rgba(22,7,15,0.9) 60%, #16070f 100%)" }}></div>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 20% 40%, rgba(163,99,80,0.35), transparent 45%)" }}></div>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 80% 60%, rgba(212,175,55,0.15), transparent 55%)" }}></div>
        </div>
        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="eyebrow mb-6">Firozabad · Since 1981</div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
              The Craft <span className="brand-gradient-text italic">behind every piece.</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-white/70 text-base md:text-lg leading-relaxed">
              A lighting piece from our atelier is the sum of five slow, deliberate acts. What follows is how a single chandelier gets from the furnace to your ceiling — traditionally, by hand, over weeks.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-5xl mx-auto px-6 py-10 md:py-16 space-y-20 md:space-y-28">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const alignRight = i % 2 === 1;
          return (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={`grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-start ${alignRight ? "md:text-right" : ""}`}
            >
              {/* Number rail */}
              <div className={`md:col-span-3 flex ${alignRight ? "md:justify-end md:order-2" : ""} items-start`}>
                <div className={`inline-flex flex-col ${alignRight ? "md:items-end" : "items-start"}`}>
                  <div className="font-serif text-[64px] md:text-[88px] leading-none brand-gradient-text tracking-tight">{s.num}</div>
                  <div className={`mt-1 h-px w-16 bg-[#D4AF37]/50 ${alignRight ? "md:self-end" : ""}`}></div>
                </div>
              </div>

              {/* Content */}
              <div className={`md:col-span-9 ${alignRight ? "md:order-1" : ""}`}>
                <div className={`inline-flex items-center gap-3 mb-4 ${alignRight ? "md:flex-row-reverse" : ""}`}>
                  <span className="w-9 h-9 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center flex-shrink-0">
                    <Icon size={16} strokeWidth={1.4} />
                  </span>
                  <div className={`text-[10px] uppercase tracking-[0.32em] text-[#BF9972]`}>{s.kicker}</div>
                </div>
                <h2 className="font-serif text-3xl md:text-4xl mb-4 leading-tight">{s.title}</h2>
                <p className="text-white/70 leading-relaxed text-base md:text-[17px] max-w-2xl md:inline-block">{s.body}</p>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Editorial closer */}
      <section className="relative py-20 md:py-28 border-t border-[#BF9972]/15 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(163,99,80,0.3), transparent 55%)" }}></div>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="eyebrow mb-4">A note from the atelier</div>
            <p className="font-serif text-2xl md:text-3xl leading-snug italic text-white/85">
              &ldquo;A great piece of glass is one you can live under for forty years without ever growing tired of it.&rdquo;
            </p>
            <div className="mt-6 text-[10px] uppercase tracking-[0.32em] text-[#BF9972]">— Mr. Sunil Kumar Agarwal, Founder</div>
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              <Link to="/catalog" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">
                See the collection <ArrowUpRight size={14} />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.28em]">
                Request a bespoke piece
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
