import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { api } from "../lib/api";
import { NAV_CATEGORIES as CATEGORIES } from "../lib/categories";
import { BRAND_PLACEHOLDER } from "../lib/placeholders";

/**
 * "Shop by Category" — editorial category grid sitting directly under the
 * hero. Each tile links to the clean category page at /category/<slug> so
 * search engines get a permanent, filterable landing page for each category.
 *
 *  - `db_name`   : exact value stored on products (singular, used as filter).
 *  - `label`     : plural marketing label shown to shoppers.
 *  - `slug`      : clean URL segment ("chandeliers", "hanging-lights", …).
 *  - Image source: admin override → newest published product for that
 *    category → neutral branded placeholder (below — no third-party stock).
 *  - Category media is not discovered until this section is close to the
 *    viewport, keeping multi-megabyte product imagery out of the initial
 *    mobile Lighthouse/LCP loading path.
 */

// Branded neutral placeholder shown ONLY when a category has neither an
// admin-override image nor any published product with imagery. Encoded as
// an inline SVG data URI so it renders synchronously with no external
// network fetch (no more Unsplash flash before the real image loads).
const FALLBACK_IMG = BRAND_PLACEHOLDER;

export default function CategoryShowcase() {
  // Map of db_name -> resolved image url (or null while loading).
  const [images, setImages] = useState({});
  const [shouldLoadMedia, setShouldLoadMedia] = useState(false);
  const sectionRef = useRef(null);

  // The section sits below the initial hero. Do not resolve category image
  // URLs during the critical initial render; begin shortly before the shopper
  // scrolls it into view. This is stronger than loading="lazy" alone because
  // the browser cannot queue image requests before `src` exists.
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
    // Load admin overrides + newest-product-per-category in parallel. Admin
    // override always wins; otherwise fall back to the newest product's first
    // image. If a category has neither, the tile shows the stock fallback.
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

  return (
    <section
      ref={sectionRef}
      data-testid="home-category-showcase"
      className="relative border-t border-white/10"
    >
      {/* Subtle radial wash so the section reads as its own "chapter" against
          the dark background without introducing new colour tokens. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, rgba(163,99,80,0.18), transparent 55%), radial-gradient(circle at 85% 90%, rgba(212,175,55,0.08), transparent 60%)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-24">
        <motion.div
          className="mb-12 md:mb-14"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <div className="eyebrow mb-3">The Collection</div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight">
              Shop by <span className="italic brand-gradient-text">Category</span>
            </h2>
            <p className="mt-4 text-white/60 max-w-md text-sm md:text-base">
              From soaring crystal chandeliers to intimate candle stands — a
              curated way to find the piece your space is asking for.
            </p>
            <Link
              to="/catalog"
              data-testid="category-showcase-view-all"
              className="hidden md:inline-flex mt-5 items-center gap-2 text-[#D4AF37] hover:text-[#E0C15D] text-xs uppercase tracking-[0.28em] link-underline"
            >
              View full catalog <ArrowUpRight size={14} />
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-6">
          {CATEGORIES.map((c, i) => (
            <CategoryCard
              key={c.db_name}
              category={c}
              imageUrl={images[c.db_name]}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ category, imageUrl, index }) {
  const href = `/category/${category.slug}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.7,
        delay: 0.05 * index,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        to={href}
        data-testid={`category-card-${category.db_name.toLowerCase().replace(/\s+/g, "-")}`}
        className="group relative block overflow-hidden border border-[#BF9972]/20 bg-[#1a0a12] hover:border-[#D4AF37]/60 transition-colors duration-500"
      >
        {/* Image */}
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
              className="w-full h-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
            />
          )}
          {/* Bottom gradient for legibility */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(22,7,15,0) 40%, rgba(22,7,15,0.55) 72%, rgba(22,7,15,0.92) 100%)",
            }}
          />
          {/* Gold hairline that reveals on hover */}
          <div
            aria-hidden
            className="absolute inset-x-6 bottom-[92px] h-px bg-[#D4AF37]/0 group-hover:bg-[#D4AF37]/60 transition-colors duration-500"
          />
        </div>

        {/* Caption */}
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
          <div className="font-serif text-xl md:text-2xl leading-tight text-white mb-3">
            {category.label}
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[#D4AF37] whitespace-nowrap pb-0.5 border-b border-[#D4AF37]/40 group-hover:border-[#D4AF37] transition-colors">
            Explore Collection
            <ArrowUpRight
              size={13}
              className="transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
