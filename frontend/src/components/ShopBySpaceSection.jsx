import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SHOP_BY_SPACE, spaceCatalogHref } from "../lib/spaces";

export default function ShopBySpaceSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16 md:py-20" data-testid="shop-by-space-section">
      <div className="flex items-end justify-between gap-6 mb-10">
        <div>
          <div className="eyebrow mb-3">Find lighting for your setting</div>
          <h2 className="font-serif text-3xl sm:text-4xl">Shop by Space</h2>
          <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-white/55">
            Explore decorative lighting by the room or project it is intended for, then refine the catalogue by category, price or search.
          </p>
        </div>
        <Link
          to="/spaces"
          className="hidden sm:inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#E0C15D] text-sm font-medium uppercase tracking-[0.22em] link-underline"
        >
          View all spaces <ArrowUpRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {SHOP_BY_SPACE.slice(0, 6).map((space) => (
          <Link
            key={space.slug}
            to={spaceCatalogHref(space)}
            data-testid={`space-card-${space.slug}`}
            className="group border border-white/10 bg-white/[0.02] hover:border-[#D4AF37]/50 transition-colors p-6 md:p-7 min-h-[180px] flex flex-col justify-between"
          >
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#D4AF37] mb-3">By space</div>
              <h3 className="font-serif text-2xl md:text-3xl">{space.label}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/50">{space.description}</p>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/65 group-hover:text-[#D4AF37]">
              Explore lighting <ArrowUpRight size={14} />
            </div>
          </Link>
        ))}
      </div>

      <Link
        to="/spaces"
        className="sm:hidden mt-8 inline-flex items-center gap-2 text-[#D4AF37] text-xs uppercase tracking-[0.22em] link-underline"
      >
        View all spaces <ArrowUpRight size={14} />
      </Link>
    </section>
  );
}
