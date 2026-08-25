import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MapPin, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { buildProjectSlugs } from "../lib/slug";
import { editorialGroup, editorialItem, LUXURY_EASE } from "../lib/motion";

const SWIPE_THRESHOLD = 40;

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function GalleryPreview() {
  const { hp } = useSettings();
  const g = hp?.gallery || {};
  const prefersReducedMotion = useReducedMotion();
  const rawItems = g.items || [];
  const slugsAll = useMemo(() => buildProjectSlugs(rawItems), [rawItems]);
  const enriched = useMemo(() => rawItems.map((p, idx) => ({ ...p, __idx: idx, __slug: slugsAll[idx] })).filter((p) => (p.title || "").trim() || (p.images || []).some(Boolean)), [rawItems, slugsAll]);
  const randomize = g.home_randomize !== false;
  const featured = Array.isArray(g.home_featured_indices) ? g.home_featured_indices : [];

  const pool = useMemo(() => {
    if (featured.length > 0) {
      const byIdx = new Map(enriched.map((p) => [p.__idx, p]));
      return featured.map((i) => byIdx.get(i)).filter(Boolean);
    }
    return enriched;
  }, [featured, enriched]);

  const ordered = useMemo(() => {
    if (pool.length === 0) return [];
    const copy = pool.slice();
    if (randomize) shuffleInPlace(copy);
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length, randomize]);

  const desktopSlides = useMemo(() => {
    const out = [];
    for (let i = 0; i < ordered.length; i += 3) out.push(ordered.slice(i, i + 3));
    return out;
  }, [ordered]);
  const mobileSlides = useMemo(() => ordered.map((p) => [p]), [ordered]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  const slides = isMobile ? mobileSlides : desktopSlides;
  const total = slides.length;
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [isMobile, total]);

  const touchStartX = useRef(null);
  const go = useCallback((delta) => setActive((i) => total ? (i + delta + total) % total : 0), [total]);
  const jumpTo = useCallback((i) => setActive(i), []);
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    go(dx < 0 ? 1 : -1);
  };

  if (pool.length === 0) return null;
  const slide = slides[active] || [];

  return (
    <section data-testid="home-gallery-preview" className="relative isolate overflow-hidden border-t border-[#BF9972]/15 bg-[#16070f] px-6 py-20 md:py-28">
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "radial-gradient(ellipse at 12% 35%, rgba(163,99,80,0.34), transparent 50%), radial-gradient(ellipse at 88% 72%, rgba(212,175,55,0.08), transparent 48%)" }} />
      <div className="relative mx-auto max-w-7xl">
        <motion.div className="mb-10 max-w-4xl" initial={prefersReducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.35 }} variants={editorialGroup}>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem}>
            <div className="eyebrow mb-3">{g.eyebrow || "Installations"}</div>
            <h2 className="font-serif text-4xl leading-[1.04] text-balance md:text-5xl lg:text-6xl">{g.title_pre || "Our Work"} <span className="brand-gradient-text italic">{g.title_highlight || "in the wild."}</span></h2>
            <div className="mt-5"><Link to="/gallery" data-testid="home-gallery-view-all" className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.22em] text-[#D4AF37] transition-colors hover:text-[#E0C15D]">View full gallery <ArrowUpRight size={15} /></Link></div>
          </motion.div>
        </motion.div>

        <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} data-testid="home-gallery-carousel">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8"
              initial={prefersReducedMotion ? false : { opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -28 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.65, ease: LUXURY_EASE }}
            >
              {slide.map((p, i) => {
                const cover = (p.images || []).filter(Boolean)[0];
                return <div key={`${active}-${p.__idx}-${i}`} data-testid={`home-gallery-card-${active}-${i}`} className="group min-w-0 border border-white/8 bg-[#0e0510] transition-all duration-700 hover:border-[#D4AF37]/50">
                  <Link to={`/gallery/${p.__slug}`} className="block">
                    <div className="aspect-[4/5] overflow-hidden bg-black md:aspect-[5/4]">{cover ? <img src={api.resolveImage(cover)} alt={p.title || "Project"} loading="lazy" className="h-full w-full object-cover opacity-90 scale-[1.015] transition-all duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045] group-hover:opacity-100" /> : <div className="flex h-full w-full items-center justify-center font-serif italic text-white/25">Image pending</div>}</div>
                    <div className="min-h-[116px] p-5 md:p-6">{p.location && <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#BF9972]"><MapPin size={12} strokeWidth={1.5} /> {p.location}</div>}<h3 className="line-clamp-2 font-serif text-lg leading-snug text-white transition-colors group-hover:text-[#D4AF37] md:text-xl">{p.title}</h3></div>
                  </Link>
                </div>;
              })}
            </motion.div>
          </AnimatePresence>

          {total > 1 && <><button type="button" aria-label="Previous projects" onClick={() => go(-1)} data-testid="home-gallery-prev" className="absolute -left-4 top-[40%] z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4AF37]/50 bg-black/75 text-[#D4AF37] backdrop-blur transition-colors hover:bg-[#D4AF37] hover:text-black md:flex"><ChevronLeft size={20} /></button><button type="button" aria-label="Next projects" onClick={() => go(1)} data-testid="home-gallery-next" className="absolute -right-4 top-[40%] z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4AF37]/50 bg-black/75 text-[#D4AF37] backdrop-blur transition-colors hover:bg-[#D4AF37] hover:text-black md:flex"><ChevronRight size={20} /></button></>}
        </div>

        {total > 1 && <div className="mt-7"><div className="h-px overflow-hidden bg-white/10"><div className="h-px bg-[#D4AF37] transition-[width] duration-500" style={{ width: `${((active + 1) / total) * 100}%` }} /></div><div className="mt-4 flex items-center justify-between"><div className="flex items-center gap-2" data-testid="home-gallery-dots">{slides.map((_, i) => <button key={i} type="button" aria-label={`Go to slide ${i + 1}`} onClick={() => jumpTo(i)} data-testid={`home-gallery-dot-${i}`} className={`h-2 rounded-full transition-all ${i === active ? "w-10 bg-[#D4AF37]" : "w-4 bg-white/30 hover:bg-white/55"}`} />)}</div><div className="text-[10px] uppercase tracking-[0.28em] text-white/35">{String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div></div></div>}
      </div>
    </section>
  );
}
