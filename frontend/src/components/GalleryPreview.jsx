import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
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
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const headingX = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const progressScale = useTransform(scrollYProgress, [0.05, 0.95], [0, 1]);

  const rawItems = g.items || [];
  const slugsAll = useMemo(() => buildProjectSlugs(rawItems), [rawItems]);
  const enriched = useMemo(() => rawItems.map((p, idx) => ({ ...p, __idx: idx, __slug: slugsAll[idx] })).filter((p) => (p.title || "").trim() || (p.images || []).some(Boolean)), [rawItems, slugsAll]);
  const perView = [3, 6, 9].includes(Number(g.home_per_view)) ? Number(g.home_per_view) : 3;
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
    for (let i = 0; i < ordered.length; i += perView) out.push(ordered.slice(i, i + perView));
    return out;
  }, [ordered, perView]);
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

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (prefersReducedMotion || isMobile || total <= 1) return;
    const normalized = Math.max(0, Math.min(0.999, (latest - 0.08) / 0.84));
    const next = Math.min(total - 1, Math.floor(normalized * total));
    setActive((current) => current === next ? current : next);
  });

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
  const gridCols = "md:grid-cols-3";

  return (
    <section ref={sectionRef} data-testid="home-gallery-preview" className="relative isolate h-auto md:h-[240vh] border-t border-[#BF9972]/15 bg-[#16070f]">
      <div className="relative md:sticky md:top-20 md:h-[calc(100vh-5rem)] overflow-hidden flex items-center py-24 md:py-8">
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "radial-gradient(ellipse at 12% 35%, rgba(163,99,80,0.34), transparent 50%), radial-gradient(ellipse at 88% 72%, rgba(212,175,55,0.08), transparent 48%)" }} />
        <div className="relative max-w-7xl mx-auto px-6 w-full min-w-0">
          <motion.div className="mb-8 md:mb-10 max-w-4xl" style={{ x: prefersReducedMotion || isMobile ? 0 : headingX }} initial={prefersReducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.35 }} variants={editorialGroup}>
            <motion.div variants={prefersReducedMotion ? undefined : editorialItem}>
              <div className="eyebrow mb-3">{g.eyebrow || "Installations"}</div>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.04] text-balance">{g.title_pre || "Our Work"} <span className="brand-gradient-text italic">{g.title_highlight || "in the wild."}</span></h2>
              <div className="mt-5 flex flex-wrap items-center gap-5"><Link to="/gallery" data-testid="home-gallery-view-all" className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.22em] text-[#D4AF37] hover:text-[#E0C15D] transition-colors">View full gallery <ArrowUpRight size={15} /></Link><span className="hidden md:inline text-[10px] uppercase tracking-[0.28em] text-white/35">Scroll to travel through projects</span></div>
            </motion.div>
          </motion.div>

          <motion.div className="relative px-5 lg:px-7" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} data-testid="home-gallery-carousel" initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.18 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.9, ease: LUXURY_EASE }}>
            <div className="overflow-hidden py-4 md:py-6">
              <motion.div className="flex" animate={{ x: `-${active * (100 / Math.max(1, total))}%` }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.9, ease: LUXURY_EASE }} style={{ width: `${Math.max(1, total) * 100}%` }}>
                {slides.map((slide, sIdx) => <div key={sIdx} className="shrink-0" style={{ width: `${100 / Math.max(1, total)}%` }} aria-hidden={sIdx !== active}>
                  <div className={`grid grid-cols-1 ${gridCols} gap-5 md:gap-8 ${perView === 6 ? "md:grid-rows-2" : perView === 9 ? "md:grid-rows-3" : ""}`}>
                    {slide.map((p, i) => {
                      const cover = (p.images || []).filter(Boolean)[0];
                      const offsetClass = i % 3 === 1 ? "md:translate-y-6" : i % 3 === 2 ? "md:-translate-y-3" : "";
                      return <div key={`${sIdx}-${p.__idx}-${i}`} data-testid={`home-gallery-card-${sIdx}-${i}`} className={`group border border-white/8 hover:border-[#D4AF37]/50 transition-all duration-700 bg-[#0e0510] ${offsetClass}`}>
                        <Link to={`/gallery/${p.__slug}`} className="block" tabIndex={sIdx === active ? 0 : -1} aria-hidden={sIdx === active ? undefined : true}>
                          <div className="aspect-[4/5] overflow-hidden bg-black">{cover ? <img src={api.resolveImage(cover)} alt={p.title || "Project"} loading="lazy" className="w-full h-full object-cover opacity-90 scale-[1.025] group-hover:opacity-100 group-hover:scale-[1.075] transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]" /> : <div className="w-full h-full flex items-center justify-center text-white/25 font-serif italic">Image pending</div>}</div>
                          <div className="p-5 md:p-6">{p.location && <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.24em] text-[#BF9972] mb-3"><MapPin size={12} strokeWidth={1.5} /> {p.location}</div>}<h3 className="font-serif text-lg md:text-xl leading-snug text-white group-hover:text-[#D4AF37] transition-colors line-clamp-2">{p.title}</h3></div>
                        </Link>
                      </div>;
                    })}
                  </div>
                </div>)}
              </motion.div>
            </div>

            {total > 1 && <><button type="button" aria-label="Previous projects" onClick={() => go(-1)} data-testid="home-gallery-prev" className="hidden md:flex absolute left-0 top-[48%] -translate-y-1/2 items-center justify-center w-12 h-12 rounded-full bg-black/75 backdrop-blur border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors z-10"><ChevronLeft size={20} /></button><button type="button" aria-label="Next projects" onClick={() => go(1)} data-testid="home-gallery-next" className="hidden md:flex absolute right-0 top-[48%] -translate-y-1/2 items-center justify-center w-12 h-12 rounded-full bg-black/75 backdrop-blur border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors z-10"><ChevronRight size={20} /></button></>}
          </motion.div>

          {total > 1 && <div className="mt-7"><div className="h-px bg-white/10 overflow-hidden"><motion.div className="h-px bg-[#D4AF37] origin-left" style={{ scaleX: prefersReducedMotion || isMobile ? (active + 1) / total : progressScale }} /></div><div className="flex items-center justify-between mt-4"><div className="flex items-center gap-2" data-testid="home-gallery-dots">{slides.map((_, i) => <button key={i} type="button" aria-label={`Go to slide ${i + 1}`} onClick={() => jumpTo(i)} data-testid={`home-gallery-dot-${i}`} className={`h-2 rounded-full transition-all ${i === active ? "w-12 bg-[#D4AF37]" : "w-5 bg-white/30 hover:bg-white/55"}`} />)}</div><div className="text-[10px] uppercase tracking-[0.28em] text-white/35">{String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div></div></div>}
        </div>
      </div>
    </section>
  );
}
