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
    if (rail && card) rail.scrollTo({ left: Math.max(0, card.offsetLeft - rail.offsetLeft - 2), behavior: prefersReducedMotion ? "auto" : "smooth" });
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
      if (distance < bestDistance) { bestDistance = distance; best = index; }
    });
    if (best !== active) setActive(best);
  };

  if (ordered.length === 0) return null;
  const total = ordered.length;

  return (
    <section data-testid="home-gallery-preview" className="relative isolate overflow-hidden border-t border-[#BF9972]/15 bg-[#16070f] py-12 md:py-14">
      <div className="absolute inset-0 pointer-events-none opacity-24" style={{ background: "radial-gradient(ellipse at 12% 35%, rgba(163,99,80,0.28), transparent 50%), radial-gradient(ellipse at 88% 72%, rgba(212,175,55,0.06), transparent 48%)" }} />
      <div className="relative mx-auto max-w-[1500px] px-6">
        <motion.div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between" initial={prefersReducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.35 }} variants={editorialGroup}>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="max-w-4xl">
            <div className="eyebrow mb-2">{g.eyebrow || "Installations"}</div>
            <h2 className="font-serif text-3xl leading-[1.04] text-balance md:text-4xl lg:text-5xl">{g.title_pre || "Our Work"} <span className="brand-gradient-text italic">{g.title_highlight || "in the wild."}</span></h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">Real installations, arranged like an editorial portfolio rather than a grid.</p>
          </motion.div>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="flex items-center gap-3">
            <Link to="/gallery" data-testid="home-gallery-view-all" className="mr-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37] transition-colors hover:text-[#E0C15D]">View full gallery <ArrowUpRight size={14} /></Link>
            {total > 1 && <><button type="button" aria-label="Previous projects" onClick={() => go(-1)} data-testid="home-gallery-prev" className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/70 transition hover:border-[#D4AF37]/70 hover:text-[#D4AF37] md:flex"><ChevronLeft size={17} /></button><button type="button" aria-label="Next projects" onClick={() => go(1)} data-testid="home-gallery-next" className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-black/40 text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black md:flex"><ChevronRight size={17} /></button></>}
          </motion.div>
        </motion.div>
      </div>

      <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.7, ease: LUXURY_EASE }} className="relative mx-auto max-w-[1500px] overflow-hidden px-6">
        <div ref={railRef} onScroll={onScroll} data-testid="home-gallery-carousel" className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 pr-[16vw] md:gap-5 md:pr-[10vw]" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {ordered.map((p, index) => {
            const cover = (p.images || []).filter(Boolean)[0];
            const featuredCard = index % 5 === 0;
            return (
              <article key={`${p.__idx}-${p.__slug}`} data-testid={`home-gallery-card-${index}`} className={`group shrink-0 snap-start overflow-hidden border border-white/10 bg-[#0e0510] transition-all duration-700 hover:border-[#D4AF37]/55 ${featuredCard ? "w-[84vw] sm:w-[58vw] md:w-[42vw] lg:w-[32vw]" : "w-[72vw] sm:w-[44vw] md:w-[31vw] lg:w-[23vw]"}`}>
                <Link to={`/gallery/${p.__slug}`} className="block">
                  <div className={featuredCard ? "aspect-[16/10] overflow-hidden bg-black" : "aspect-[4/3] overflow-hidden bg-black"}>{cover ? <img src={api.resolveImage(cover)} alt={p.title || "Project"} loading="lazy" className="h-full w-full scale-[1.01] object-cover opacity-90 transition-all duration-[950ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] group-hover:opacity-100" /> : <div className="flex h-full w-full items-center justify-center font-serif italic text-white/25">Image pending</div>}</div>
                  <div className="min-h-[96px] p-4 md:p-5">{p.location && <div className="mb-1.5 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-[#BF9972]"><MapPin size={11} strokeWidth={1.5} /> {p.location}</div>}<h3 className={`line-clamp-2 font-serif leading-snug text-white transition-colors group-hover:text-[#D4AF37] ${featuredCard ? "text-xl md:text-2xl" : "text-base md:text-lg"}`}>{p.title}</h3></div>
                </Link>
              </article>
            );
          })}
        </div>
      </motion.div>

      {total > 1 && <div className="mx-auto mt-4 max-w-[1500px] px-6"><div className="flex items-center gap-5"><div className="h-px flex-1 overflow-hidden bg-white/10"><div className="h-px bg-[#D4AF37] transition-[width] duration-300" style={{ width: `${((active + 1) / total) * 100}%` }} /></div><div className="shrink-0 text-[9px] uppercase tracking-[0.24em] text-white/38">{String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div></div></div>}
    </section>
  );
}
