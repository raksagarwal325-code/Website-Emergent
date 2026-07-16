import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { buildProjectSlugs } from "../lib/slug";

const AUTOPLAY_MS = 4500;
const SWIPE_THRESHOLD = 40;

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Home-page carousel of /gallery projects.
 *
 * - Randomized order per page load when `home_randomize` is on (default: true).
 * - Honours an admin-chosen `home_featured_indices` list (indices into
 *   `gallery.items`); when empty, uses every project with content.
 * - Auto-slides every 4.5s (pauses on hover / when the user interacts) and
 *   loops. Includes prev/next arrows, dot indicators and mobile touch swipe.
 * - Desktop shows `home_per_view` (3 / 6 / 9) per slide; mobile always 1.
 * - Never repeats a project inside a single homepage view.
 */
export default function GalleryPreview() {
  const { hp } = useSettings();
  const g = hp?.gallery || {};

  const rawItems = g.items || [];
  const slugsAll = useMemo(() => buildProjectSlugs(rawItems), [rawItems]);

  // Pair items with their global slug so re-ordering never breaks per-project links.
  const enriched = useMemo(
    () =>
      rawItems
        .map((p, idx) => ({ ...p, __idx: idx, __slug: slugsAll[idx] }))
        .filter(
          (p) => (p.title || "").trim() || (p.images || []).some(Boolean)
        ),
    [rawItems, slugsAll]
  );

  const perView = [3, 6, 9].includes(Number(g.home_per_view))
    ? Number(g.home_per_view)
    : 3;
  const randomize = g.home_randomize !== false;
  const autoplay = g.home_autoplay !== false;
  const featured = Array.isArray(g.home_featured_indices) ? g.home_featured_indices : [];

  // Pick the pool: featured (in order) OR everything with content.
  const pool = useMemo(() => {
    if (featured.length > 0) {
      const byIdx = new Map(enriched.map((p) => [p.__idx, p]));
      return featured.map((i) => byIdx.get(i)).filter(Boolean);
    }
    return enriched;
  }, [featured, enriched]);

  // Randomize once per mount when requested. All hooks below are unconditional
  // so React never trips the rules-of-hooks — we bail on render if pool is empty.
  const ordered = useMemo(() => {
    if (pool.length === 0) return [];
    const copy = pool.slice();
    if (randomize) shuffleInPlace(copy);
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length, randomize]);

  // Chunk into slides of `perView` (mobile ignores this; useMediaQuery handles it).
  const desktopSlides = useMemo(() => {
    const out = [];
    for (let i = 0; i < ordered.length; i += perView) {
      out.push(ordered.slice(i, i + perView));
    }
    return out;
  }, [ordered, perView]);

  const mobileSlides = useMemo(() => ordered.map((p) => [p]), [ordered]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
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

  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  const go = useCallback(
    (delta) => setActive((i) => (total ? (i + delta + total) % total : 0)),
    [total]
  );
  const jumpTo = useCallback((i) => setActive(i), []);

  useEffect(() => {
    if (!autoplay || paused || total <= 1) return undefined;
    const t = setInterval(() => setActive((i) => (i + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [autoplay, paused, total]);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    go(dx < 0 ? 1 : -1);
    setPaused(true);
  };

  if (pool.length === 0) return null;

  const gridCols = perView === 3 ? "md:grid-cols-3" : perView === 6 ? "md:grid-cols-3" : "md:grid-cols-3";

  return (
    <section
      data-testid="home-gallery-preview"
      className="relative py-20 md:py-28 border-t border-[#BF9972]/15 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 pointer-events-none opacity-25" style={{ background: "radial-gradient(ellipse at 20% 40%, rgba(163,99,80,0.3), transparent 55%)" }} />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 md:mb-14 gap-4">
          <div>
            <div className="eyebrow mb-3">{g.eyebrow || "Installations"}</div>
            <h2 className="font-serif text-3xl md:text-5xl leading-tight">
              {g.title_pre || "Our Work"}{" "}
              <span className="brand-gradient-text italic">{g.title_highlight || "in the wild."}</span>
            </h2>
          </div>
          <Link
            to="/gallery"
            data-testid="home-gallery-view-all"
            className="inline-flex items-center gap-2 self-start md:self-end text-xs uppercase tracking-[0.28em] text-[#D4AF37] hover:text-[#B5952F] transition-colors flex-shrink-0"
          >
            View full gallery <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Carousel */}
        <div
          className="relative"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          data-testid="home-gallery-carousel"
        >
          <div className="overflow-hidden">
            <motion.div
              className="flex"
              animate={{ x: `-${active * (100 / Math.max(1, total))}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: `${total * 100}%` }}
            >
              {slides.map((slide, sIdx) => (
                <div
                  key={sIdx}
                  className="shrink-0"
                  style={{ width: `${100 / total}%` }}
                  aria-hidden={sIdx !== active}
                >
                  <div
                    className={`grid grid-cols-1 ${gridCols} gap-4 md:gap-6 ${
                      perView === 6 ? "md:grid-rows-2" : perView === 9 ? "md:grid-rows-3" : ""
                    }`}
                  >
                    {slide.map((p, i) => {
                      const cover = (p.images || []).filter(Boolean)[0];
                      return (
                        <motion.div
                          key={`${sIdx}-${p.__idx}-${i}`}
                          initial={{ opacity: 0, y: 24 }}
                          animate={sIdx === active ? { opacity: 1, y: 0 } : { opacity: 0.3, y: 0 }}
                          transition={{ duration: 0.6, delay: sIdx === active ? i * 0.06 : 0, ease: [0.22, 1, 0.36, 1] }}
                          data-testid={`home-gallery-card-${sIdx}-${i}`}
                          className="group border border-white/8 hover:border-[#D4AF37]/50 transition-colors bg-[#0e0510]"
                        >
                          <Link to={`/gallery/${p.__slug}`} className="block">
                            <div className="aspect-[4/5] overflow-hidden bg-black">
                              {cover ? (
                                <img
                                  src={api.resolveImage(cover)}
                                  alt={p.title || "Project"}
                                  loading="lazy"
                                  className="w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/25 font-serif italic">
                                  Image pending
                                </div>
                              )}
                            </div>
                            <div className="p-5 md:p-6">
                              {p.location && (
                                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-[#BF9972] mb-3">
                                  <MapPin size={11} strokeWidth={1.5} /> {p.location}
                                </div>
                              )}
                              <h3 className="font-serif text-lg md:text-xl leading-snug text-white group-hover:text-[#D4AF37] transition-colors line-clamp-2">
                                {p.title}
                              </h3>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Arrows */}
          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous projects"
                onClick={() => { go(-1); setPaused(true); }}
                data-testid="home-gallery-prev"
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-8 items-center justify-center w-11 h-11 rounded-full bg-black/60 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors z-10"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Next projects"
                onClick={() => { go(1); setPaused(true); }}
                data-testid="home-gallery-next"
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-8 items-center justify-center w-11 h-11 rounded-full bg-black/60 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors z-10"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8" data-testid="home-gallery-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => { jumpTo(i); setPaused(true); }}
                data-testid={`home-gallery-dot-${i}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? "w-8 bg-[#D4AF37]" : "w-4 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
