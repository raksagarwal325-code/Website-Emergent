import React, { useState } from "react";
import { Link } from "react-router-dom";

const CATEGORY_OVERVIEWS = {
  "chandeliers": "Statement chandeliers, multi-light glass forms and grand decorative centrepieces.",
  "hanging-lights": "Single pendants, clustered hanging lights, lanterns and suspended glass forms.",
  "wall-lights": "Decorative wall sconces, glass wall lamps and architectural accent lighting.",
  "table-lamps": "Handcrafted glass table lamps for bedside, console and ambient lighting.",
  "floor-lamps": "Tall decorative floor lamps designed as sculptural ambient pieces.",
  "candle-stands": "Decorative candle stands and heritage-inspired tabletop accents.",
  "floor-chandeliers": "Large standing statement lights with chandelier-like presence and detailing.",
  "table-chandeliers": "Compact chandelier forms created for tables, consoles and display surfaces.",
  "ceiling-lights": "Close-to-ceiling decorative fixtures for spaces needing a lower profile.",
  "gate-lights": "Decorative exterior and entrance lighting for gates, porches and façades.",
};

export default function CategorySwitchBar({ categories = [], activeSlug = null }) {
  const [preview, setPreview] = useState(null);
  const links = [{ slug: null, label: "All", href: "/catalog" }, ...categories.map((category) => ({
    slug: category.slug,
    label: category.label,
    href: `/category/${category.slug}`,
    key: category.slug || category.db_name,
  }))];

  const overviewText = preview?.slug
    ? CATEGORY_OVERVIEWS[preview.slug] || `Explore the ${preview.label} collection.`
    : "Browse the complete Samrat Glass collection across every lighting category.";

  return (
    <nav
      aria-label="Browse product categories"
      data-testid="catalog-category-switcher"
      className="sticky top-20 z-40 -mx-6 mb-6 border-y border-white/10 bg-[#16070f]/28 px-6 py-2.5 backdrop-blur-[3px]"
      onMouseLeave={() => setPreview(null)}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-1.5 hidden items-center gap-3 md:flex">
          <span className="text-[9px] uppercase tracking-[0.3em] text-[#BF9972]">Browse collection</span>
          <span className="h-px flex-1 bg-gradient-to-r from-[#D4AF37]/24 to-transparent" aria-hidden="true" />
        </div>

        <div className="flex gap-x-5 gap-y-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible md:whitespace-normal">
          {links.map((item) => {
            const active = item.slug === activeSlug;
            return (
              <Link
                key={item.key || "all"}
                to={item.href}
                data-testid={item.slug ? `category-switch-${item.slug}` : "category-switch-all"}
                aria-current={active ? "page" : undefined}
                onMouseEnter={() => setPreview(item)}
                onFocus={() => setPreview(item)}
                className={`relative shrink-0 py-1 text-[10px] uppercase tracking-[0.18em] transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:transition-transform ${
                  active
                    ? "text-[#E5C453] after:scale-x-100 after:bg-[#D4AF37]"
                    : "text-white/72 hover:text-white after:scale-x-0 after:bg-[#D4AF37] hover:after:scale-x-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 top-full border-b border-[#D4AF37]/20 bg-[#12070d]/88 px-6 transition-all duration-200 ${preview ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}`}
        aria-hidden={!preview}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 py-3">
          <div>
            <div className="text-[9px] uppercase tracking-[0.28em] text-[#D4AF37]">{preview?.label || "Collection overview"}</div>
            <div className="mt-1 max-w-3xl text-xs leading-relaxed text-white/70">{overviewText}</div>
          </div>
          <div className="hidden text-[9px] uppercase tracking-[0.24em] text-white/35 md:block">Open category to browse all pieces</div>
        </div>
      </div>
    </nav>
  );
}
