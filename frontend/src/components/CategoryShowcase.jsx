import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { NAV_CATEGORIES as CATEGORIES } from "../lib/categories";
import { BRAND_PLACEHOLDER } from "../lib/placeholders";
import { editorialGroup, editorialItem, LUXURY_EASE } from "../lib/motion";

const FALLBACK_IMG = BRAND_PLACEHOLDER;

export default function CategoryShowcase() {
  const [images, setImages] = useState({});
  const [shouldLoadMedia, setShouldLoadMedia] = useState(false);
  const sectionRef = useRef(null);
  const railRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoadMedia(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadMedia(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadMedia) return undefined;
    let alive = true;
    Promise.all([
      api.getCategoryFeaturedImages().catch(() => ({})),
      Promise.all(
        CATEGORIES.map((c) =>
          api
            .listProducts({ category: c.db_name, sort: "newest", limit: 1 })
            .then((res) => {
              const first = (res?.items || [])[0];
              const raw = first?.images?.[0];
              return [c.db_name, raw ? api.resolveImage(raw) : null];
            })
            .catch(() => [c.db_name, null]),
        ),
      ),
    ]).then(([overrides, fallbackPairs]) => {
      if (!alive) return;
      const fallbackMap = Object.fromEntries(fallbackPairs);
      const resolved = {};
      for (const c of CATEGORIES) {
        const override = overrides?.[c.db_name];
        resolved[c.db_name] = override ? api.resolveImage(override) : fallbackMap[c.db_name] ?? null;
      }
      setImages(resolved);
    });
    return () => { alive = false; };
  }, [shouldLoadMedia]);

  const scrollRail = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector("[data-category-card]");
    const amount = card ? card.getBoundingClientRect().width + 16 : rail.clientWidth * 0.72;
    rail.scrollBy({ left: direction * amount, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  return (
    <section ref={sectionRef} data-testid="home-category-showcase" className="relative z-10 border-t border-white/10 bg-[#16070f] md:-mt-6">
      <div aria-hidden className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle at 15% 20%, rgba(163,99,80,0.14), transparent 55%), radial-gradient(circle at 85% 90%, rgba(212,175,55,0.06), transparent 60%)" }} />
      <div className="relative mx-auto max-w-[1500px] px-6 py-10 md:py-12">
        <motion.div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between" initial={prefersReducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={editorialGroup}>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="max-w-2xl">
            <div className="eyebrow mb-2">The Collection</div>
            <h2 className="font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl">Shop by <span className="italic brand-gradient-text">Category</span></h2>
            <p className="mt-3 max-w-xl text-sm text-white/58 md:text-base">Browse the complete collection sideways — more choice, less page length.</p>
          </motion.div>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="flex items-center gap-3">
            <Link to="/catalog" data-testid="category-showcase-view-all" className="mr-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37] link-underline hover:text-[#E0C15D]">View full catalog <ArrowUpRight size={14} /></Link>
            <button type="button" aria-label="Previous categories" onClick={() => scrollRail(-1)} className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/70 transition hover:border-[#D4AF37]/70 hover:text-[#D4AF37] md:flex"><ChevronLeft size={17} /></button>
            <button type="button" aria-label="Next categories" onClick={() => scrollRail(1)} className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-black/30 text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black md:flex"><ChevronRight size={17} /></button>
          </motion.div>
        </motion.div>

        <motion.div className="relative" initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.16 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.75, ease: LUXURY_EASE }}>
          <div ref={railRef} data-testid="home-category-horizontal-rail" className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 pr-[14vw] md:pr-[7vw]" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {CATEGORIES.map((c, i) => <CategoryCard key={c.db_name} category={c} imageUrl={images[c.db_name]} index={i} reducedMotion={prefersReducedMotion} />)}
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[#16070f] to-transparent md:w-20" />
        </motion.div>
      </div>
    </section>
  );
}

function CategoryCard({ category, imageUrl, index, reducedMotion }) {
  const href = `/category/${category.slug}`;
  return (
    <motion.div data-category-card className="w-[68vw] max-w-[270px] shrink-0 snap-start sm:w-[38vw] md:w-[26vw] lg:w-[18vw] xl:w-[16vw]" initial={reducedMotion ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={reducedMotion ? { duration: 0 } : { duration: 0.6, delay: Math.min(0.04 * index, 0.2), ease: LUXURY_EASE }}>
      <Link to={href} data-testid={`category-card-${category.db_name.toLowerCase().replace(/\s+/g, "-")}`} className="group relative block overflow-hidden border border-[#BF9972]/20 bg-[#1a0a12] transition-colors duration-500 hover:border-[#D4AF37]/60">
        <div className="relative aspect-[4/3] overflow-hidden">
          {imageUrl === undefined ? <div className="h-full w-full animate-pulse bg-white/[0.03]" /> : <img src={imageUrl || FALLBACK_IMG} alt={`${category.label} at Samrat Glass Emporium`} loading="lazy" fetchPriority="low" decoding="async" className="h-full w-full scale-[1.02] object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.065]" />}
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(22,7,15,0.02) 28%, rgba(22,7,15,0.4) 64%, rgba(22,7,15,0.92) 100%)" }} />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="font-serif text-lg leading-tight text-white md:text-xl">{category.label}</div>
          <span className="mt-2 inline-flex w-fit items-center gap-1.5 border-b border-[#D4AF37]/40 pb-1 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] transition-colors group-hover:border-[#D4AF37]">Explore <ArrowUpRight size={12} className="transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" /></span>
        </div>
      </Link>
    </motion.div>
  );
}
