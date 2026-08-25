import React, { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { buildProjectSlugs } from "../lib/slug";
import { editorialGroup, editorialItem, LUXURY_EASE } from "../lib/motion";

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

  const railRef = useRef(null);
  const [active, setActive] = useState(0);

  const scrollToIndex = useCallback((index) => {
    if (!ordered.length) return;
    const next = Math.max(0, Math.min(index, ordered.length - 1));
    const rail = railRef.current;
    const card = rail?.children?.[next];
    if (rail && card) {
      rail.scrollTo({ left: card.offsetLeft - rail.offsetLeft, behavior: prefersReducedMotion ? "auto" : "smooth" });
    }
    setActive(next);
  }, [ordered.length, prefersReducedMotion]);

  const go = useCallback((delta) => {
    const next = (active + delta + ordered.length) % ordered.length;
    scrollToIndex(next);
  }, [active, ordered.length, scrollToIndex]);

  const onScroll = () => {
    const rail = railRef.current;
    if (!rail || !rail.children.length) return;
    const left = rail.scrollLeft;
    let best = 0;
    let bestDistance = Infinity;
    Array.from(rail.children).forEach((node, index) => {
      const distance = Math.abs(node.offsetLeft - rail.offsetLeft - left);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    if (best !== active) setActive(best);
  };

  if (ordered.length === 0) return null;
  const total = ordered.length;

  return (
    <section data-testid="home-gallery-preview" className="relative isolate overflow-hidden border-t border-[#BF9972]/15 bg-[#16070f] px-6 py-16 md:py-20">
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "radial-gradient(ellipse at 12% 35%, rgba(163,99,80,0.34), transparent 50%), radial-gradient(ellipse at 88% 72%, rgba(212,175,55,0.08), transparent 48%)" }} />
      <div className="relative mx-auto max-w-[1500px]">
        <motion.div className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between" initial={prefersReducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.35 }} variants={editorialGroup}>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="max-w-4xl">
            <div className="eyebrow mb-3">{g.eyebrow || "Installations"}</div>
            <h2 className="font-serif text-4xl leading-[1.04] text-balance md:text-5xl lg:text-6xl">{g.title_pre || "Our Work"} <span className="brand-gradient-text italic">{g.title_highlight || "in the wild."}</span></h2>
          </motion.div>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="flex items-center gap-3">
            <Link to="/gallery" data-testid="home-gallery-view-all" className="mr-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37] transition-colors hover:text-[#E0C15D]">View full gallery <ArrowUpRight size={14} /></Link>
            {total > 1 && <><button type="button" aria-label="Previous projects" onClick={() => go(-1)} data-testid="home-gallery-prev" className="hidden h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/70 transition hover:border-[#D4AF37]/70 hover:text-[#D4AF37] md:flex"><ChevronLeft size={18} /></button><button type="button" aria-label="Next projects" onClick={() => go(1)} data-testid="home-gallery-next" className="hidden h-11 w-11 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-black/40 text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black md:flex"><ChevronRight size={18} /></button></>}
          </motion.div>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.85, ease: LUXURY_EASE }}
          className="relative"
        >
          <div
            ref={railRef}
            onScroll={onScroll}
            data-testid="home-gallery-carousel"
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 pr-[14vw] md:gap-6 md:pr-[10vw] lg:pr-[7vw]"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {ordered.map((p, index) => {
              const cover = (p.images || []).filter(Boolean)[0];
              return (
                <article key={`${p.__idx}-${p.__slug}`} data-testid={`home-gallery-card-${index}`} className="group w-[84vw] max-w-[430px] shrink-0 snap-start border border-white/8 bg-[#0e0510] transition-all duration-700 hover:border-[#D4AF37]/50 sm:w-[56vw] md:w-[39vw] lg:w-[30vw] xl:w-[28vw]">
                  <Link to={`/gallery/${p.__slug}`} className="block">
                    <div className="aspect-[5/4] overflow-hidden bg-black">{cover ? <img src={api.resolveImage(cover)} alt={p.title || "Project"} loading="lazy" className="h-full w-full object-cover opacity-90 scale-[1.015] transition-all duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045] group-hover:opacity-100" /> : <div className="flex h-full w-full items-center justify-center font-serif italic text-white/25">Image pending</div>}</div>
                    <div className="min-h-[110px] p-5 md:p-6">{p.location && <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#BF9972]"><MapPin size={12} strokeWidth={1.5} /> {p.location}</div>}<h3 className="line-clamp-2 font-serif text-lg leading-snug text-white transition-colors group-hover:text-[#D4AF37] md:text-xl">{p.title}</h3></div>
                  </Link>
                </article>
              );
            })}
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#16070f] to-transparent md:w-24" />
        </motion.div>

        {total > 1 && <div className="mt-5"><div className="h-px overflow-hidden bg-white/10"><div className="h-px bg-[#D4AF37] transition-[width] duration-300" style={{ width: `${((active + 1) / total) * 100}%` }} /></div><div className="mt-3 flex items-center justify-between"><div className="text-[10px] uppercase tracking-[0.28em] text-white/35">Swipe or drag to explore</div><div className="text-[10px] uppercase tracking-[0.28em] text-white/35">{String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div></div></div>}
      </div>
    </section>
  );
}
