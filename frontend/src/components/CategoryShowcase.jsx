import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { api } from "../lib/api";

/**
 * "Shop by Category" — editorial category grid sitting directly under the
 * hero. Each tile deep-links into the catalog with the category filter
 * pre-applied via ?category=<db-name>.
 *
 *  - `db_name`   : exact value stored on products (singular, used as filter).
 *  - `label`     : plural marketing label shown to shoppers.
 *  - Image source: newest published product for that category. A future
 *    admin override lets us pin a specific `featured_image` per category.
 *  - All below-the-fold images are `loading="lazy"` / `decoding="async"`.
 */
const CATEGORIES = [
  { db_name: "Chandelier",   label: "Chandeliers"   },
  { db_name: "Hanging Light", label: "Hanging Lights" },
  { db_name: "Wall Light",   label: "Wall Lights"   },
  { db_name: "Table Lamp",   label: "Table Lamps"   },
  { db_name: "Floor Lamp",   label: "Floor Lamps"   },
  { db_name: "Candle Stand", label: "Candle Stands" },
];

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1200&q=70";

export default function CategoryShowcase() {
  // Map of db_name -> resolved image url (or null while loading).
  const [images, setImages] = useState({});

  useEffect(() => {
    let alive = true;
    // One request per category (6 in parallel). Newest first, published only
    // via the public /products endpoint. If a category has zero items the
    // tile gracefully falls back to a stock hero image.
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
    ).then((pairs) => {
      if (!alive) return;
      setImages(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section
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
          className="mb-12 md:mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-4"
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
          </div>
          <Link
            to="/catalog"
            data-testid="category-showcase-view-all"
            className="hidden md:inline-flex items-center gap-2 text-white/70 hover:text-white text-xs uppercase tracking-[0.28em] link-underline self-end"
          >
            View full catalog <ArrowUpRight size={14} />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
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
  const href = `/catalog?category=${encodeURIComponent(category.db_name)}`;
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
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-7 flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-2 text-[#BF9972]/90">Category</div>
            <div className="font-serif text-2xl md:text-[26px] leading-tight text-white">
              {category.label}
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#D4AF37] whitespace-nowrap pb-1">
            Explore Collection
            <ArrowUpRight
              size={14}
              className="transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
