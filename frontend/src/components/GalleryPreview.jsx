import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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

  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const total = ordered.length;
  const go = useCallback((delta) => {
    if (!total) return;
    setDirection(delta > 0 ? 1 : -1);
    setActive((current) => (current + delta + total) % total);
  }, [total]);

  if (!total) return null;
  const project = ordered[active];
  const prev = ordered[(active - 1 + total) % total];
  const next = ordered[(active + 1) % total];
  const cover = (project.images || []).filter(Boolean)[0];
  const prevCover = (prev.images || []).filter(Boolean)[0];
  const nextCover = (next.images || []).filter(Boolean)[0];

  return (
    <section data-testid="home-gallery-preview" className="relative isolate overflow-hidden border-t border-[#BF9972]/15 bg-[#16070f] py-12 md:py-16">
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "radial-gradient(ellipse at 12% 35%, rgba(163,99,80,.30), transparent 48%), radial-gradient(ellipse at 88% 72%, rgba(212,175,55,.08), transparent 45%)" }} />
      <div className="relative mx-auto max-w-[1500px] px-6">
        <motion.div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between" initial={prefersReducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.35 }} variants={editorialGroup}>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="max-w-4xl">
            <div className="eyebrow mb-2">{g.eyebrow || "Installations"}</div>
            <h2 className="font-serif text-4xl leading-[1.02] text-balance md:text-5xl lg:text-6xl">{g.title_pre || "Our Work"} <span className="brand-gradient-text italic">{g.title_highlight || "in the wild."}</span></h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">One installation takes focus while the next projects remain visible around it.</p>
          </motion.div>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="flex items-center gap-3">
            <Link to="/gallery" data-testid="home-gallery-view-all" className="mr-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37] transition-colors hover:text-[#E0C15D]">View full gallery <ArrowUpRight size={14} /></Link>
            <button type="button" aria-label="Previous projects" onClick={() => go(-1)} data-testid="home-gallery-prev" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/70 transition hover:border-[#D4AF37]/70 hover:text-[#D4AF37]"><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Next projects" onClick={() => go(1)} data-testid="home-gallery-next" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-black/40 text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"><ChevronRight size={18} /></button>
          </motion.div>
        </motion.div>

        <motion.div drag={prefersReducedMotion ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.08} onDragEnd={(_, info) => { if (info.offset.x < -80) go(1); if (info.offset.x > 80) go(-1); }} className="relative grid min-h-[480px] gap-5 md:grid-cols-[.28fr_1fr_.28fr] md:items-center lg:min-h-[560px]">
          <button type="button" onClick={() => go(-1)} className="group relative hidden h-[340px] overflow-hidden border border-white/10 opacity-45 transition hover:opacity-75 md:block">
            {prevCover && <img src={api.resolveImage(prevCover)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
            <div className="absolute inset-0 bg-[#16070f]/35" />
          </button>

          <div className="relative h-full min-h-[460px] overflow-hidden border border-[#BF9972]/20 bg-[#0e0510] lg:min-h-[540px]">
            <AnimatePresence initial={false} custom={direction}>
              <motion.article key={`${project.__idx}-${project.__slug}`} data-testid={`home-gallery-card-${active}`} className="absolute inset-0" initial={prefersReducedMotion ? false : { opacity: 0, x: direction * 90, scale: .985 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={prefersReducedMotion ? undefined : { opacity: 0, x: direction * -90, scale: .985 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: .76, ease: LUXURY_EASE }}>
                <Link to={`/gallery/${project.__slug}`} className="grid h-full md:grid-rows-[1fr_auto]">
                  <div className="relative min-h-[350px] overflow-hidden bg-black">
                    {cover ? <motion.img src={api.resolveImage(cover)} alt={project.title || "Project"} loading="lazy" className="h-full w-full object-cover" initial={prefersReducedMotion ? false : { scale: 1.04 }} animate={{ scale: 1 }} transition={{ duration: 1.05, ease: LUXURY_EASE }} /> : <div className="flex h-full items-center justify-center font-serif italic text-white/25">Image pending</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#10060c]/65 via-transparent to-transparent" />
                    <div aria-hidden className="absolute right-5 top-3 font-serif text-[7rem] leading-none text-white/[0.045] md:text-[9rem]">{String(active + 1).padStart(2, "0")}</div>
                  </div>
                  <motion.div className="grid gap-4 border-t border-white/8 p-5 md:grid-cols-[1fr_auto] md:items-end md:p-7" initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18, duration: .6, ease: LUXURY_EASE }}>
                    <div>{project.location && <div className="mb-2 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] text-[#BF9972]"><MapPin size={11} strokeWidth={1.5} /> {project.location}</div>}<h3 className="max-w-3xl font-serif text-2xl leading-tight text-white md:text-3xl lg:text-4xl">{project.title}</h3></div>
                    <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#D4AF37]">View project <ArrowUpRight size={13} /></span>
                  </motion.div>
                </Link>
              </motion.article>
            </AnimatePresence>
          </div>

          <button type="button" onClick={() => go(1)} className="group relative hidden h-[340px] overflow-hidden border border-[#D4AF37]/20 opacity-52 transition hover:opacity-80 md:block">
            {nextCover && <img src={api.resolveImage(nextCover)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
            <div className="absolute inset-0 bg-[#16070f]/32" />
          </button>
        </motion.div>

        <div className="mt-5 flex items-center gap-5"><div className="h-px flex-1 overflow-hidden bg-white/10"><motion.div className="h-px bg-[#D4AF37]" animate={{ width: `${((active + 1) / total) * 100}%` }} transition={{ duration: .45, ease: LUXURY_EASE }} /></div><div className="text-[10px] uppercase tracking-[0.25em] text-white/42">Drag / {String(active + 1).padStart(2, "0")} of {String(total).padStart(2, "0")}</div></div>
      </div>
    </section>
  );
}
