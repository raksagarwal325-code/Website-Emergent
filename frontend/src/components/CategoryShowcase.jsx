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
        resolved[c.db_name] = override
          ? api.resolveImage(override)
          : fallbackMap[c.db_name] ?? null;
      }
      setImages(resolved);
    });
    return () => {
      alive = false;
    };
  }, [shouldLoadMedia]);

  const scrollRail = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector("[data-category-card]");
    const amount = card ? card.getBoundingClientRect().width + 20 : rail.clientWidth * 0.78;
    rail.scrollBy({ left: direction * amount, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      data-testid="home-category-showcase"
      className="relative z-10 border-t border-white/10 bg-[#16070f] md:-mt-10"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, rgba(163,99,80,0.18), transparent 55%), radial-gradient(circle at 85% 90%, rgba(212,175,55,0.08), transparent 60%)",
        }}
      />
      <div className="relative max-w-[1500px] mx-auto px-6 py-16 md:py-20">
        <motion.div
          className="mb-8 md:mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={editorialGroup}
        >
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="max-w-2xl">
            <div className="eyebrow mb-3">The Collection</div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight">
              Shop by <span className="italic brand-gradient-text">Category</span>
            </h2>
            <p className="mt-4 text-white/60 max-w-md text-sm md:text-base">
              From soaring crystal chandeliers to intimate candle stands — move sideways through the collection without lengthening the page.
            </p>
          </motion.div>

          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="flex items-center gap-3">
            <Link
              to="/catalog"
              data-testid="category-showcase-view-all"
              className="mr-2 inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#E0C15D] text-xs font-medium uppercase tracking-[0.22em] link-underline"
            >
              View full catalog <ArrowUpRight size={14} />
            </Link>
            <button type="button" aria-label="Previous categories" onClick={() => scrollRail(-1)} className="hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/70 transition hover:border-[#D4AF37]/70 hover:text-[#D4AF37]"><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Next categories" onClick={() => scrollRail(1)} className="hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-black/30 text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"><ChevronRight size={18} /></button>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.16 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.9, ease: LUXURY_EASE }}
        >
          <div
            ref={railRef}
            data-testid="home-category-horizontal-rail"
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 pr-[12vw] md:gap-5 md:pr-[8vw] lg:pr-[5vw]"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {CATEGORIES.map((c, i) => (
              <CategoryCard
                key={c.db_name}
                category={c}
                imageUrl={images[c.db_name]}
                index={i}
                reducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#16070f] to-transparent md:w-24" />
        </motion.div>
      </div>
    </section>
  );
}

function CategoryCard({ category, imageUrl, index, reducedMotion }) {
  const href = `/category/${category.slug}`;
  return (
    <motion.div
      data-category-card
      className="w-[82vw] max-w-[330px] shrink-0 snap-start sm:w-[44vw] md:w-[31vw] lg:w-[22vw] xl:w-[19vw]"
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={reducedMotion ? { duration: 0 } : {
        duration: 0.7,
        delay: Math.min(0.045 * index, 0.24),
        ease: LUXURY_EASE,
      }}
    >
      <Link
        to={href}
        data-testid={`category-card-${category.db_name.toLowerCase().replace(/\s+/g, "-")}`}
        className="group relative block overflow-hidden border border-[#BF9972]/20 bg-[#1a0a12] hover:border-[#D4AF37]/60 transition-colors duration-500"
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          {imageUrl === undefined ? (
            <div className="w-full h-full bg-white/[0.03] animate-pulse" />
          ) : (
            <img
              src={imageUrl || FALLBACK_IMG}
              alt={`${category.label} at Samrat Glass Emporium`}
              loading="lazy"
              fetchPriority="low"
              decoding="async"
              className="w-full h-full object-cover scale-[1.025] transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]"
            />
          )}
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(22,7,15,0.02) 35%, rgba(22,7,15,0.58) 72%, rgba(22,7,15,0.94) 100%)" }} />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 flex flex-col justify-end min-h-[8rem]">
          <div className="font-serif text-xl md:text-2xl leading-tight text-white mb-3 min-h-[3.25rem] flex items-end">
            {category.label}
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 text-xs uppercase tracking-[0.24em] text-[#D4AF37] whitespace-nowrap pb-1 border-b border-[#D4AF37]/40 group-hover:border-[#D4AF37] transition-colors">
            Explore Collection
            <ArrowUpRight size={13} className="transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
