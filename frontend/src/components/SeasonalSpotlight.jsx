import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { api, formatProductPrice } from "../lib/api";
import { productPath } from "../lib/productUrl";
import { LUXURY_EASE } from "../lib/motion";

export default function SeasonalSpotlight({ products = [], eyebrow, title, viewAllText, viewAllLink }) {
  const prefersReducedMotion = useReducedMotion();
  const items = useMemo(() => products.filter(Boolean).slice(0, 16), [products]);
  const [active, setActive] = useState(0);

  if (!items.length) return null;

  const currentIndex = Math.min(active, items.length - 1);
  const current = items[currentIndex];
  const prevIndex = (currentIndex - 1 + items.length) % items.length;
  const nextIndex = (currentIndex + 1) % items.length;
  const price = formatProductPrice(current);
  const go = (delta) => setActive((index) => (index + delta + items.length) % items.length);

  return (
    <section data-testid="seasonal-spotlight" className="relative overflow-hidden border-y border-white/10 py-20 md:py-28">
      <div aria-hidden className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 50% 40%, rgba(212,175,55,0.12), transparent 35%), radial-gradient(circle at 12% 70%, rgba(105,35,70,0.35), transparent 38%)" }} />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <div className="eyebrow mb-3">{eyebrow}</div>
            <h2 className="font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">{title}</h2>
          </div>
          <Link to={viewAllLink || "/catalog"} className="hidden shrink-0 items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#D4AF37] hover:text-[#E0C15D] md:inline-flex">
            {viewAllText || "View all"} <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-16">
          <div className="relative min-h-[470px] sm:min-h-[560px]" style={{ perspective: "1500px" }}>
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => setActive(prevIndex)} aria-label={`Show ${items[prevIndex].name}`} className="absolute left-0 top-1/2 z-0 hidden h-[72%] w-[27%] -translate-y-1/2 overflow-hidden border border-white/8 bg-black/40 opacity-45 transition hover:opacity-75 md:block" style={{ transform: "translateY(-50%) rotateY(12deg) scale(.88)", transformOrigin: "right center" }}>
                  <img src={api.resolveImage(items[prevIndex].images?.[0])} alt="" className="h-full w-full object-contain p-6" loading="lazy" />
                </button>
                <button type="button" onClick={() => setActive(nextIndex)} aria-label={`Show ${items[nextIndex].name}`} className="absolute right-0 top-1/2 z-0 hidden h-[72%] w-[27%] -translate-y-1/2 overflow-hidden border border-white/8 bg-black/40 opacity-45 transition hover:opacity-75 md:block" style={{ transform: "translateY(-50%) rotateY(-12deg) scale(.88)", transformOrigin: "left center" }}>
                  <img src={api.resolveImage(items[nextIndex].images?.[0])} alt="" className="h-full w-full object-contain p-6" loading="lazy" />
                </button>
              </>
            )}

            <div className="absolute inset-x-[8%] inset-y-0 z-10 md:inset-x-[18%]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: 45, scale: 0.92, rotateY: -8 }}
                  animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, x: -45, scale: 0.94, rotateY: 8 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.75, ease: LUXURY_EASE }}
                  className="relative flex h-full items-center justify-center overflow-hidden border border-[#D4AF37]/30 bg-[#08030a] shadow-[0_35px_90px_-25px_rgba(0,0,0,.95)]"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 62%, rgba(212,175,55,0.16), transparent 43%)" }} />
                  {current.images?.[0] ? (
                    <img src={api.resolveImage(current.images[0])} alt={current.name} className="relative z-10 max-h-[92%] max-w-[92%] object-contain p-4 md:p-8" loading="lazy" />
                  ) : null}
                  <div className="absolute bottom-4 left-4 z-20 text-[10px] uppercase tracking-[0.3em] text-[#BF9972]">{String(currentIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={`copy-${current.id}`} initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={prefersReducedMotion ? undefined : { opacity: 0, y: -16 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.55, ease: LUXURY_EASE }} className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#BF9972]">{current.category}</div>
              <h3 className="mt-4 max-w-xl font-serif text-3xl leading-[1.08] text-white sm:text-4xl lg:text-5xl">{current.name}</h3>
              <div className="mt-6 text-[#D4AF37]">
                {price.onRequest ? <span className="font-serif text-xl">Price on request</span> : <><span className="mr-2 text-[10px] uppercase tracking-[0.24em] text-[#BF9972]">{price.label}</span><span className="font-serif text-2xl">{price.primary}</span></>}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={productPath(current)} className="inline-flex items-center gap-2 bg-[#D4AF37] px-7 py-3.5 text-xs uppercase tracking-[0.22em] text-black hover:bg-[#B5952F]">View product <ArrowUpRight size={14} /></Link>
                <div className="flex gap-2">
                  <button type="button" onClick={() => go(-1)} aria-label="Previous seasonal product" className="flex h-12 w-12 items-center justify-center border border-white/15 text-white/75 hover:border-[#D4AF37] hover:text-[#D4AF37]"><ArrowLeft size={18} /></button>
                  <button type="button" onClick={() => go(1)} aria-label="Next seasonal product" className="flex h-12 w-12 items-center justify-center border border-white/15 text-white/75 hover:border-[#D4AF37] hover:text-[#D4AF37]"><ArrowRight size={18} /></button>
                </div>
              </div>
              <div className="mt-8 flex max-w-md gap-1.5 overflow-hidden">
                {items.map((item, index) => <button key={item.id} type="button" onClick={() => setActive(index)} aria-label={`Show ${item.name}`} aria-current={index === currentIndex ? "true" : undefined} className={`h-1.5 flex-1 transition-colors ${index === currentIndex ? "bg-[#D4AF37]" : "bg-white/15 hover:bg-white/30"}`} />)}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
