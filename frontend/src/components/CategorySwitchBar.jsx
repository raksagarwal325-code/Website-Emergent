import React from "react";
import { Link } from "react-router-dom";

export default function CategorySwitchBar({ categories = [], activeSlug = null }) {
  return (
    <nav
      aria-label="Browse product categories"
      data-testid="catalog-category-switcher"
      className="sticky top-20 z-40 -mx-6 mb-10 border-y border-white/10 bg-[#16070f]/95 px-6 py-3 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          to="/catalog"
          className={`shrink-0 border px-4 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors ${
            activeSlug == null
              ? "border-[#D4AF37] bg-[#D4AF37] text-black"
              : "border-white/10 text-white/65 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
          }`}
        >
          All
        </Link>
        {categories.map((category) => {
          const active = category.slug === activeSlug;
          return (
            <Link
              key={category.slug || category.db_name}
              to={`/category/${category.slug}`}
              data-testid={`category-switch-${category.slug || category.db_name}`}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 border px-4 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors ${
                active
                  ? "border-[#D4AF37] bg-[#D4AF37] text-black"
                  : "border-white/10 text-white/65 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
              }`}
            >
              {category.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
