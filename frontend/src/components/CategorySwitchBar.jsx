import React from "react";
import { Link } from "react-router-dom";

export default function CategorySwitchBar({ categories = [], activeSlug = null }) {
  const links = [{ slug: null, label: "All", href: "/catalog" }, ...categories.map((category) => ({
    slug: category.slug,
    label: category.label,
    href: `/category/${category.slug}`,
    key: category.slug || category.db_name,
  }))];

  return (
    <nav
      aria-label="Browse product categories"
      data-testid="catalog-category-switcher"
      className="sticky top-20 z-40 -mx-6 mb-10 border-y border-white/10 bg-[#16070f]/96 px-6 py-4 backdrop-blur-xl"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 hidden items-center gap-3 md:flex">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#BF9972]">Browse collection</span>
          <span className="h-px flex-1 bg-gradient-to-r from-[#D4AF37]/35 to-transparent" aria-hidden="true" />
        </div>

        <div className="flex gap-x-6 gap-y-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible md:whitespace-normal">
          {links.map((item, index) => {
            const active = item.slug === activeSlug;
            return (
              <React.Fragment key={item.key || "all"}>
                <Link
                  to={item.href}
                  data-testid={item.slug ? `category-switch-${item.slug}` : "category-switch-all"}
                  aria-current={active ? "page" : undefined}
                  className={`relative shrink-0 py-1.5 text-[11px] uppercase tracking-[0.2em] transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:transition-transform ${
                    active
                      ? "text-[#E5C453] after:scale-x-100 after:bg-[#D4AF37]"
                      : "text-white/58 hover:text-white after:scale-x-0 after:bg-[#D4AF37] hover:after:scale-x-100"
                  }`}
                >
                  {item.label}
                </Link>
                {index < links.length - 1 && (
                  <span aria-hidden="true" className="hidden text-[#D4AF37]/30 md:inline">·</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
