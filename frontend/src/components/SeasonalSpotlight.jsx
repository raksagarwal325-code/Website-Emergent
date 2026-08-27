import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { api, formatProductPrice } from "../lib/api";
import { applyImageFrameColor } from "../lib/imageFrame";
import { productPath } from "../lib/productUrl";
import { LUXURY_EASE } from "../lib/motion";

export default function SeasonalSpotlight({ products = [], eyebrow, title, viewAllText, viewAllLink }) {
  const prefersReducedMotion = useReducedMotion();
  const items = useMemo(() => products.filter(Boolean), [products]);
  const [active, setActive] = useState(0);
  const sectionRef = useRef(null);
  const keyboardActiveRef = useRef(false);
  const swipeStartRef = useRef(null);

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

  const handleSwipeStart = (event) => {
    const touch = event.touches?.[0];
    if (touch) swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleSwipeEnd = (event) => {
    const start = swipeStartRef.current;
    const touch = event.changedTouches?.[0];
    swipeStartRef.current = null;
    if (!start || !touch || items.length <= 1) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
    go(dx < 0 ? 1 : -1);
  };

  const currentIndex = Math.min(active, items.length - 1);
  const current = items[currentIndex];
  const prevIndex = (currentIndex - 1 + items.length) % items.length;
  const nextIndex = (currentIndex + 1) % items.length;
  const price = formatProductPrice(current);
  const progress = (currentIndex + 1) / items.length;
  const currentImage = current.images?.[0] ? api.resolveImage(current.images[0]) : null;
  const prevImage = items[prevIndex]?.images?.[0] ? api.resolveImage(items[prevIndex].images[0]) : null;
  const nextImage = items[nextIndex]?.images?.[0] ? api.resolveImage(items[nextIndex].images[0]) : null;

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
          <div className="relative min-h-[450px] sm:min-h-[540px]" style={{ perspective: "1500px", touchAction: "pan-y", overscrollBehaviorX: "contain" }} onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => setActive(prevIndex)} aria-label={`Show ${items[prevIndex].name}`} className="absolute left-0 top-1/2 z-0 hidden h-[76%] w-[32%] -translate-y-1/2 overflow-hidden border border-white/12 bg-[#0b0508] opacity-[.62] transition hover:border-[#D4AF37]/35 hover:opacity-[.9] md:block" style={{ transform: "translateY(-50%) rotateY(10deg) scale(.92)", transformOrigin: "right center" }}>
                  {prevImage && <>
                    <img data-image-atmosphere src={prevImage} alt="" aria-hidden className="absolute -inset-[10%] h-[120%] w-[120%] object-cover blur-2xl opacity-35 scale-110" loading="lazy" />
                    <div data-image-atmosphere className="absolute inset-0 bg-[#13080f]/24" />
                    <img src={prevImage} alt="" className="relative z-10 h-full w-full object-contain p-4" loading="lazy" onLoad={(event) => applyImageFrameColor(event.currentTarget, event.currentTarget.parentElement)} />
                  </>}
                </button>
                <button type="button" onClick={() => setActive(nextIndex)} aria-label={`Show ${items[nextIndex].name}`} className="absolute right-0 top-1/2 z-0 hidden h-[76%] w-[32%] -translate-y-1/2 overflow-hidden border border-white/12 bg-[#0b0508] opacity-[.62] transition hover:border-[#D4AF37]/35 hover:opacity-[.9] md:block" style={{ transform: "translateY(-50%) rotateY(-10deg) scale(.92)", transformOrigin: "left center" }}>
                  {nextImage && <>
                    <img data-image-atmosphere src={nextImage} alt="" aria-hidden className="absolute -inset-[10%] h-[120%] w-[120%] object-cover blur-2xl opacity-35 scale-110" loading="lazy" />
                    <div data-image-atmosphere className="absolute inset-0 bg-[#13080f]/24" />
                    <img src={nextImage} alt="" className="relative z-10 h-full w-full object-contain p-4" loading="lazy" onLoad={(event) => applyImageFrameColor(event.currentTarget, event.currentTarget.parentElement)} />
                  </>}
                </button>
              </>
            )}

            <div className="absolute inset-x-[8%] inset-y-0 z-10 md:inset-x-[20%]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: 55, scale: 0.92, rotateY: -8 }}
                  animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, x: -55, scale: 0.94, rotateY: 8 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.72, ease: LUXURY_EASE }}
                  className="relative flex h-full items-center justify-center overflow-hidden border border-[#D4AF37]/30 bg-[#0b0508] shadow-[0_35px_90px_-25px_rgba(0,0,0,.95)]"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {currentImage && <>
                    <motion.img
                      data-image-atmosphere
                      src={currentImage}
                      alt=""
                      aria-hidden
                      className="absolute -inset-[12%] h-[124%] w-[124%] object-cover blur-3xl opacity-45"
                      initial={prefersReducedMotion ? false : { scale: 1.08, opacity: 0.2 }}
                      animate={prefersReducedMotion ? { scale: 1.08, opacity: 0.42 } : { scale: [1.08, 1.14, 1.08], opacity: 0.42 }}
                      transition={prefersReducedMotion ? { duration: 0 } : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div data-image-atmosphere className="absolute inset-0 bg-[#12070d]/38" />
                    <div data-image-atmosphere className="absolute inset-0 bg-gradient-to-t from-[#12070d]/35 via-transparent to-[#12070d]/16" />
                    <motion.img
                      src={currentImage}
                      alt={current.name}
                      className="relative z-10 max-h-[92%] max-w-[92%] object-contain p-4 md:p-8 drop-shadow-[0_18px_32px_rgba(0,0,0,.45)]"
                      loading="lazy"
                      onLoad={(event) => applyImageFrameColor(event.currentTarget, event.currentTarget.parentElement)}
                      initial={prefersReducedMotion ? false : { scale: 0.965, opacity: 0.72 }}
                      animate={prefersReducedMotion ? { scale: 1, opacity: 1 } : { scale: [0.985, 1.018, 0.985], opacity: 1 }}
                      transition={prefersReducedMotion ? { duration: 0 } : { duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </>}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={`copy-${current.id}`} initial={prefersReducedMotion ? false : { opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} exit={prefersReducedMotion ? undefined : { opacity: 0, y: -18 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.55, ease: LUXURY_EASE }} className="min-w-0">
              <div className="text-xs uppercase tracking-[0.26em] text-[#BF9972]">{current.category}</div>
              <h3 className="mt-4 max-w-xl font-serif text-3xl leading-[1.08] text-white sm:text-4xl lg:text-5xl">{current.name}</h3>
              <div className="mt-6 text-[#D4AF37]">
                {price.onRequest ? <span className="font-serif text-xl">Price on request</span> : <><span className="mr-2 text-xs uppercase tracking-[0.22em] text-[#BF9972]">{price.label}</span><span className="font-serif text-2xl">{price.primary}</span></>}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={productPath(current)} className="inline-flex items-center gap-2 bg-[#D4AF37] px-7 py-3.5 text-xs uppercase tracking-[0.22em] text-black hover:bg-[#B5952F]">View product <ArrowUpRight size={14} /></Link>
                {items.length > 1 && <div className="flex gap-2">
                  <button type="button" onClick={() => go(-1)} aria-label="Previous seasonal product" className="flex h-12 w-12 items-center justify-center border border-white/20 bg-black/20 text-white/80 hover:border-[#D4AF37] hover:text-[#D4AF37]"><ArrowLeft size={18} /></button>
                  <button type="button" onClick={() => go(1)} aria-label="Next seasonal product" className="flex h-12 w-12 items-center justify-center border border-white/20 bg-black/20 text-white/80 hover:border-[#D4AF37] hover:text-[#D4AF37]"><ArrowRight size={18} /></button>
                </div>}
              </div>
              {items.length > 1 && <div className="mt-8 max-w-md" aria-label={`Product ${currentIndex + 1} of ${items.length}`}>
                <div className="h-1.5 overflow-hidden bg-white/20"><div className="h-full bg-[#D4AF37] transition-[width] duration-500" style={{ width: `${progress * 100}%` }} /></div>
              </div>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
