import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { api, formatProductPrice } from "../lib/api";
import { productPath } from "../lib/productUrl";
import { LUXURY_EASE } from "../lib/motion";

export default function SeasonalSpotlight({ products = [], eyebrow, title, viewAllText, viewAllLink }) {
  const prefersReducedMotion = useReducedMotion();
  const items = useMemo(() => products.filter(Boolean), [products]);
  const [active, setActive] = useState(0);
  const sectionRef = useRef(null);
  const keyboardActiveRef = useRef(false);

  const go = (delta) => {
    if (!items.length) return;
    setActive((index) => (index + delta + items.length) % items.length);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => { keyboardActiveRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.42; },
      { threshold: [0, 0.42, 0.75] },
    );
    observer.observe(sectionRef.current);

    const onKeyDown = (event) => {
      if (!keyboardActiveRef.current || items.length <= 1) return;
      const target = event.target;
      if (target?.matches?.("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [items.length]);

  if (!items.length) return null;

  const currentIndex = Math.min(active, items.length - 1);
  const current = items[currentIndex];
  const prevIndex = (currentIndex - 1 + items.length) % items.length;
  const nextIndex = (currentIndex + 1) % items.length;
  const price = formatProductPrice(current);
  const progress = (currentIndex + 1) / items.length;

  return (
    <section ref={sectionRef} data-testid="seasonal-spotlight" aria-label="Pieces of the season" className="relative overflow-hidden border-y border-white/10 py-20 md:py-24">
      <div aria-hidden className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 50% 40%, rgba(212,175,55,0.12), transparent 35%), radial-gradient(circle at 12% 70%, rgba(105,35,70,0.35), transparent 38%)" }} />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="eyebrow mb-3">{eyebrow}</div>
            <h2 className="font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">{title}</h2>
          </div>
          <Link to={viewAllLink || "/catalog"} className="hidden shrink-0 items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#D4AF37] hover:text-[#E0C15D] md:inline-flex">
            {viewAllText || "View all"} <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-16">
          <div className="relative min-h-[450px] sm:min-h-[540px]" style={{ perspective: "1500px" }}>
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => setActive(prevIndex)} aria-label={`Show ${items[prevIndex].name}`} className="absolute left-0 top-1/2 z-0 hidden h-[70%] w-[27%] -translate-y-1/2 overflow-hidden border border-white/8 bg-black/40 opacity-38 transition hover:opacity-70 md:block" style={{ transform: "translateY(-50%) rotateY(12deg) scale(.88)", transformOrigin: "right center" }}>
                  <img src={api.resolveImage(items[prevIndex].images?.[0])} alt="" className="h-full w-full object-contain p-6" loading="lazy" />
                </button>
                <button type="button" onClick={() => setActive(nextIndex)} aria-label={`Show ${items[nextIndex].name}`} className="absolute right-0 top-1/2 z-0 hidden h-[70%] w-[27%] -translate-y-1/2 overflow-hidden border border-white/8 bg-black/40 opacity-38 transition hover:opacity-70 md:block" style={{ transform: "translateY(-50%) rotateY(-12deg) scale(.88)", transformOrigin: "left center" }}>
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
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.68, ease: LUXURY_EASE }}
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
            <motion.div key={`copy-${current.id}`} initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={prefersReducedMotion ? undefined : { opacity: 0, y: -14 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: LUXURY_EASE }} className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#BF9972]">{current.category}</div>
              <h3 className="mt-4 max-w-xl font-serif text-3xl leading-[1.08] text-white sm:text-4xl lg:text-5xl">{current.name}</h3>
              <div className="mt-6 text-[#D4AF37]">
                {price.onRequest ? <span className="font-serif text-xl">Price on request</span> : <><span className="mr-2 text-[10px] uppercase tracking-[0.24em] text-[#BF9972]">{price.label}</span><span className="font-serif text-2xl">{price.primary}</span></>}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={productPath(current)} className="inline-flex items-center gap-2 bg-[#D4AF37] px-7 py-3.5 text-xs uppercase tracking-[0.22em] text-black hover:bg-[#B5952F]">View product <ArrowUpRight size={14} /></Link>
                {items.length > 1 && <div className="flex gap-2">
                  <button type="button" onClick={() => go(-1)} aria-label="Previous seasonal product" className="flex h-12 w-12 items-center justify-center border border-white/15 text-white/75 hover:border-[#D4AF37] hover:text-[#D4AF37]"><ArrowLeft size={18} /></button>
                  <button type="button" onClick={() => go(1)} aria-label="Next seasonal product" className="flex h-12 w-12 items-center justify-center border border-white/15 text-white/75 hover:border-[#D4AF37] hover:text-[#D4AF37]"><ArrowRight size={18} /></button>
                </div>}
              </div>
              {items.length > 1 && <div className="mt-8 max-w-md">
                <div className="h-1 bg-white/12 overflow-hidden"><div className="h-full bg-[#D4AF37] transition-[width] duration-500" style={{ width: `${progress * 100}%` }} /></div>
                <div className="mt-3 flex items-center justify-between text-[9px] uppercase tracking-[0.26em] text-white/35"><span>← → keyboard</span><span>{currentIndex + 1} of {items.length}</span></div>
              </div>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
