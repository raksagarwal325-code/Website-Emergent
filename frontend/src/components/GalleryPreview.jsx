import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const sectionRef = useRef(null);
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

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;

      const node = sectionRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const isActiveZone = rect.top <= viewportHeight * 0.65 && rect.bottom >= viewportHeight * 0.35;
      if (!isActiveZone) return;

      event.preventDefault();
      go(event.key === "ArrowLeft" ? -1 : 1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go]);

  if (!total) return null;
  const project = ordered[active];
  const prev = ordered[(active - 1 + total) % total];
  const next = ordered[(active + 1) % total];
  const cover = (project.images || []).filter(Boolean)[0];
  const prevCover = (prev.images || []).filter(Boolean)[0];
  const nextCover = (next.images || []).filter(Boolean)[0];
  const resolvedCover = cover ? api.resolveImage(cover) : null;

  return (
    <section ref={sectionRef} data-testid="home-gallery-preview" className="relative isolate overflow-hidden border-t border-[#BF9972]/15 bg-[#16070f] py-12 md:py-16">
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "radial-gradient(ellipse at 12% 35%, rgba(163,99,80,.30), transparent 48%), radial-gradient(ellipse at 88% 72%, rgba(212,175,55,.08), transparent 45%)" }} />
      <div className="relative mx-auto max-w-7xl px-6">
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

        <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 36, scale: .985 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: .14 }} transition={{ duration: .9, ease: LUXURY_EASE }} drag={prefersReducedMotion ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.08} onDragEnd={(_, info) => { if (info.offset.x < -80) go(1); if (info.offset.x > 80) go(-1); }} className="relative grid gap-5 md:grid-cols-[.22fr_1fr_.22fr] md:items-center">
          <motion.button type="button" onClick={() => go(-1)} className="group relative hidden h-[300px] overflow-hidden border border-white/10 bg-black opacity-[.42] transition hover:opacity-75 md:block" whileHover={prefersReducedMotion ? undefined : { x: -6, scale: .985 }} transition={{ duration: .35 }}>
            {prevCover && <img src={api.resolveImage(prevCover)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
            <div className="absolute inset-0 bg-[#16070f]/38" />
          </motion.button>

          <div className="relative overflow-hidden border border-[#BF9972]/20 bg-[#0b0508]">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.article key={`${project.__idx}-${project.__slug}`} data-testid={`home-gallery-card-${active}`} initial={prefersReducedMotion ? false : { opacity: 0, x: direction * 150, scale: .96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={prefersReducedMotion ? undefined : { opacity: 0, x: direction * -150, scale: .96 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: .8, ease: LUXURY_EASE }}>
                <Link to={`/gallery/${project.__slug}`} className="block">
                  <div className="relative flex h-[360px] items-center justify-center overflow-hidden bg-[#090507] md:h-[430px] lg:h-[500px]">
                    {resolvedCover ? (
                      <>
                        <motion.img
                          aria-hidden
                          src={resolvedCover}
                          alt=""
                          loading="lazy"
                          className="absolute inset-[-8%] h-[116%] w-[116%] object-cover opacity-40 blur-[34px] saturate-[.8]"
                          initial={prefersReducedMotion ? false : { scale: 1.08, opacity: .24 }}
                          animate={prefersReducedMotion ? { opacity: .4 } : { scale: 1.16, opacity: .4 }}
                          transition={prefersReducedMotion ? { duration: 0 } : { duration: 10, ease: "linear" }}
                        />
                        <div aria-hidden className="absolute inset-0 bg-[#16070f]/28" />
                        <motion.img
                          src={resolvedCover}
                          alt={project.title || "Project"}
                          loading="lazy"
                          className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,.28)]"
                          initial={prefersReducedMotion ? false : { scale: .94, opacity: .58, y: 10 }}
                          animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1.025, opacity: 1, y: 0 }}
                          transition={prefersReducedMotion ? { duration: 0 } : { duration: 8.5, ease: LUXURY_EASE }}
                        />
                      </>
                    ) : <div className="flex h-full items-center justify-center font-serif italic text-white/25">Image pending</div>}
                    <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-[#10060c]/34 via-transparent to-[#10060c]/10" />
                    <div className="absolute inset-x-[8%] bottom-0 z-20 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/35 to-transparent" />
                  </div>
                  <motion.div className="grid gap-4 border-t border-white/8 bg-[#11070c]/96 p-5 md:grid-cols-[1fr_auto] md:items-end md:p-7" initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2, duration: .62, ease: LUXURY_EASE }}>
                    <div>{project.location && <div className="mb-2 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] text-[#BF9972]"><MapPin size={11} strokeWidth={1.5} /> {project.location}</div>}<h3 className="max-w-3xl font-serif text-2xl leading-[1.06] text-white md:text-3xl lg:text-[2.1rem]">{project.title}</h3></div>
                    <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#D4AF37]">View project <ArrowUpRight size={13} /></span>
                  </motion.div>
                </Link>
              </motion.article>
            </AnimatePresence>
          </div>

          <motion.button type="button" onClick={() => go(1)} className="group relative hidden h-[300px] overflow-hidden border border-[#D4AF37]/20 bg-black opacity-[.48] transition hover:opacity-[.82] md:block" whileHover={prefersReducedMotion ? undefined : { x: 6, scale: .985 }} transition={{ duration: .35 }}>
            {nextCover && <img src={api.resolveImage(nextCover)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
            <div className="absolute inset-0 bg-[#16070f]/34" />
          </motion.button>
        </motion.div>

        <div className="mt-5 h-px overflow-hidden bg-white/10"><motion.div className="h-px bg-[#D4AF37]" animate={{ width: `${((active + 1) / total) * 100}%` }} transition={{ duration: .5, ease: LUXURY_EASE }} /></div>
      </div>
    </section>
  );
}
