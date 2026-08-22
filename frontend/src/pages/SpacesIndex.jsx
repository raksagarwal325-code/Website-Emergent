import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import SchemaLD from "../components/SchemaLD";
import { SHOP_BY_SPACE, spaceCatalogHref } from "../lib/spaces";

export default function SpacesIndex() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Shop decorative lighting by space",
    "numberOfItems": SHOP_BY_SPACE.length,
    "itemListElement": SHOP_BY_SPACE.map((space, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": space.label,
      "url": `https://samratglass.com${spaceCatalogHref(space)}`,
    })),
  };

  return (
    <div data-testid="spaces-index" className="max-w-7xl mx-auto px-6 py-16 md:py-20">
      <SEO
        title="Shop Lighting by Space · Living Room, Dining, Staircase & Hospitality · Samrat Glass"
        description="Explore handcrafted decorative lighting by room and project type, including living rooms, dining rooms, double-height spaces, foyers, hotels, restaurants and showrooms."
        path="/spaces"
      />
      <SchemaLD id="spaces-item-list" data={itemList} />

      <header className="max-w-4xl mb-12 md:mb-16">
        <div className="eyebrow text-[#D4AF37] mb-4">Lighting by application</div>
        <h1 className="font-serif text-5xl md:text-7xl leading-[0.95]">Shop by Space</h1>
        <p className="text-white/55 mt-6 max-w-3xl text-base md:text-lg leading-relaxed">
          Start with the room or project you are lighting. These shortcuts use the existing Samrat Glass catalogue search so you can immediately narrow relevant pieces further by category, price and sort order.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {SHOP_BY_SPACE.map((space) => (
          <Link
            key={space.slug}
            to={spaceCatalogHref(space)}
            data-testid={`space-index-card-${space.slug}`}
            className="group border border-white/10 bg-white/[0.02] hover:border-[#D4AF37]/50 transition-colors p-7 md:p-8 min-h-[220px] flex flex-col justify-between"
          >
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#D4AF37] mb-4">Explore by space</div>
              <h2 className="font-serif text-3xl md:text-4xl">{space.label}</h2>
              <p className="text-white/50 text-sm leading-relaxed mt-4">{space.description}</p>
            </div>
            <div className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/65 group-hover:text-[#D4AF37]">
              Browse catalogue <ArrowUpRight size={14} />
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-14 md:mt-18 border-t border-white/10 pt-10 md:pt-12 max-w-4xl">
        <h2 className="font-serif text-3xl md:text-4xl">Need a size or configuration made for your project?</h2>
        <p className="mt-4 text-white/55 leading-relaxed">
          Samrat Glass also works on custom decorative lighting for residences, hospitality projects, showrooms and large spaces. Requirements are reviewed before a configuration is proposed.
        </p>
        <Link
          to="/custom-lighting-bulk-orders"
          className="mt-6 inline-flex items-center gap-2 text-[#D4AF37] text-xs uppercase tracking-[0.22em] link-underline"
        >
          Explore custom lighting <ArrowUpRight size={14} />
        </Link>
      </section>
    </div>
  );
}
