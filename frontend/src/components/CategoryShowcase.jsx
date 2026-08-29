import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { NAV_CATEGORIES as CATEGORIES } from "../lib/categories";
import { BRAND_PLACEHOLDER } from "../lib/placeholders";
import { editorialGroup, editorialItem, LUXURY_EASE } from "../lib/motion";
import { imageVariantSrcSet, imageVariantUrl } from "../lib/imageVariants";

const FALLBACK_IMG = BRAND_PLACEHOLDER;

export default function CategoryShowcase() {
  const [images, setImages] = useState({});
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [shouldLoadMedia, setShouldLoadMedia] = useState(false);
  const [keyboardActive, setKeyboardActive] = useState(false);
  const sectionRef = useRef(null);
  const swipeStartRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoadMedia(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoadMedia(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setKeyboardActive(entry.isIntersecting && entry.intersectionRatio >= 0.42);
    }, { threshold: [0, 0.42, 0.7] });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadMedia) return undefined;
    let alive = true;
    Promise.all([
      api.getCategoryFeaturedImages().catch(() => ({})),
      Promise.all(CATEGORIES.map((c) => api.listProducts({ category: c.db_name, sort: "newest", limit: 1 }).then((res) => {
        const first = (res?.items || [])[0];
        const raw = first?.images?.[0];
        return [c.db_name, raw ? api.resolveImage(raw) : null];
      }).catch(() => [c.db_name, null]))),
    ]).then(([overrides, fallbackPairs]) => {
      if (!alive) return;
      const fallbackMap = Object.fromEntries(fallbackPairs);
      const resolved = {};
      CATEGORIES.forEach((c) => { resolved[c.db_name] = overrides?.[c.db_name] ? api.resolveImage(overrides[c.db_name]) : fallbackMap[c.db_name] ?? null; });
      setImages(resolved);
    });
    return () => { alive = false; };
  }, [shouldLoadMedia]);

  const total = CATEGORIES.length;
  const go = useCallback((delta) => {
    setDirection(delta > 0 ? 1 : -1);
    setActive((current) => (current + delta + total) % total);
  }, [total]);

  useEffect(() => {
    if (!keyboardActive) return undefined;
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, keyboardActive]);

  const handleSwipeStart = (event) => {
    const touch = event.touches?.[0];
    if (touch) swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleSwipeEnd = (event) => {
    const start = swipeStartRef.current;
    const touch = event.changedTouches?.[0];
    swipeStartRef.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
    go(dx < 0 ? 1 : -1);
  };

  const choose = (index) => {
    if (index === active) return;
    setDirection(index > active ? 1 : -1);
    setActive(index);
  };

  const visible = useMemo(() => [-1, 0, 1].map((offset) => ({
    offset,
    index: (active + offset + total) % total,
    category: CATEGORIES[(active + offset + total) % total],
  })), [active, total]);

  const handleImageError = (event, original) => {
    const node = event.currentTarget;
    if (original && node.dataset.fallbackStage !== "master") {
      node.dataset.fallbackStage = "master";
      node.removeAttribute("srcset");
      node.src = original;
      return;
    }
    node.onerror = null;
    node.removeAttribute("srcset");
    node.src = FALLBACK_IMG;
  };

  return (
    <section ref={sectionRef} data-testid="home-category-showcase" className="relative z-10 overflow-hidden border-t border-white/10 bg-[#16070f] md:-mt-6">
      <div aria-hidden className="absolute inset-0 opacity-45 pointer-events-none" style={{ background: "radial-gradient(circle at 18% 18%, rgba(163,99,80,.22), transparent 42%), radial-gradient(circle at 82% 82%, rgba(212,175,55,.08), transparent 38%)" }} />
      <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16">
        <motion.div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between" initial={prefersReducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={editorialGroup}>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="max-w-2xl">
            <div className="eyebrow mb-2">The Collection</div>
            <h2 className="font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">Shop by <span className="italic brand-gradient-text">Category</span></h2>
            <p className="mt-3 max-w-xl text-sm text-white/58 md:text-base">One collection takes the stage; the next remains visible at the edge so browsing feels continuous.</p>
          </motion.div>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="flex items-center gap-3">
            <Link to="/catalog" data-testid="category-showcase-view-all" className="mr-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37] link-underline hover:text-[#E0C15D]">View full catalog <ArrowUpRight size={14} /></Link>
            <button type="button" aria-label="Previous categories" onClick={() => go(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/70 transition hover:border-[#D4AF37]/70 hover:text-[#D4AF37]"><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Next categories" onClick={() => go(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-black/30 text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"><ChevronRight size={18} /></button>
          </motion.div>
        </motion.div>

        <motion.div className="relative h-[390px] overflow-hidden md:h-[470px] lg:h-[510px]" style={{ touchAction: "pan-y", overscrollBehaviorX: "contain" }} onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd} initial={prefersReducedMotion ? false : { opacity: 0, y: 34, scale: .985 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.18 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: .9, ease: LUXURY_EASE }}>
          <AnimatePresence initial={false} custom={direction}>
            <motion.div key={active} className="absolute inset-0" initial={prefersReducedMotion ? false : { opacity: 0, x: direction * 150, scale: .96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={prefersReducedMotion ? undefined : { opacity: 0, x: direction * -150, scale: .96 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: .78, ease: LUXURY_EASE }}>
              <div className="absolute inset-0 flex items-center justify-center gap-5 md:gap-7">
                {visible.map(({ offset, index, category }) => {
                  const isActive = offset === 0;
                  const img = images[category.db_name];
                  const cardClass = `group relative overflow-hidden border text-left ${isActive ? "z-20 w-[64%] border-[#D4AF37]/50" : "z-10 hidden w-[18%] border-white/10 md:block"}`;
                  const cardContent = (
                    <div className={`relative overflow-hidden bg-black ${isActive ? "h-[330px] md:h-[405px] lg:h-[445px]" : "h-[300px] md:h-[340px] lg:h-[365px]"}`}>
                      <motion.img
                        src={img ? imageVariantUrl(img, 640) : FALLBACK_IMG}
                        srcSet={img ? imageVariantSrcSet(img, [320, 640, 960, 1280]) : undefined}
                        sizes={isActive ? "(max-width: 767px) 64vw, 46vw" : "18vw"}
                        alt={`${category.label} at Samrat Glass Emporium`}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => handleImageError(event, img)}
                        className="h-full w-full object-contain"
                        initial={prefersReducedMotion ? false : { scale: isActive ? .92 : 1.02 }}
                        animate={{ scale: isActive ? 1 : .96 }}
                        transition={{ duration: 1, ease: LUXURY_EASE }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#16070f]/86 via-transparent to-transparent" />
                      <motion.div className="absolute inset-x-0 bottom-0 p-5 md:p-7" initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18, duration: .6, ease: LUXURY_EASE }}>
                        <div className={`font-serif leading-none text-white ${isActive ? "text-3xl md:text-5xl" : "text-lg md:text-xl"}`}>{category.label}</div>
                        {isActive && <div className="mt-4 flex items-center justify-between gap-4"><span className="text-xs font-medium uppercase tracking-[0.2em] text-[#D4AF37] drop-shadow-[0_1px_8px_rgba(0,0,0,.9)]">Explore collection</span><ArrowUpRight size={15} className="text-[#D4AF37]" /></div>}
                      </motion.div>
                    </div>
                  );
                  return isActive ? (
                    <motion.div key={`${category.db_name}-${offset}`} className={cardClass} initial={prefersReducedMotion ? false : { opacity: 0, x: offset * 55, y: 22 }} animate={{ opacity: 1, x: 0, y: 0, scale: 1 }} transition={{ duration: .72, delay: .05, ease: LUXURY_EASE }}>
                      <Link to={`/category/${category.slug}`} className="block" aria-label={`Open ${category.label}`}>{cardContent}</Link>
                    </motion.div>
                  ) : (
                    <motion.button type="button" key={`${category.db_name}-${offset}`} onClick={() => choose(index)} className={cardClass} initial={prefersReducedMotion ? false : { opacity: 0, x: offset * 55, y: 22 }} animate={{ opacity: .5, x: 0, y: 18, scale: .9 }} transition={{ duration: .72, delay: .12, ease: LUXURY_EASE }}>
                      {cardContent}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="mt-5 h-1.5 overflow-hidden bg-white/15" aria-label={`Category ${active + 1} of ${total}`}>
          <motion.div className="h-full bg-[#D4AF37]" animate={{ width: `${((active + 1) / total) * 100}%` }} transition={{ duration: .5, ease: LUXURY_EASE }} />
        </div>
      </div>
    </section>
  );
}
