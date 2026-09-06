import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import SEO from "../components/SEO";
import SchemaLD from "../components/SchemaLD";
import ProductCard from "../components/ProductCard";
import { api } from "../lib/api";
import { getSpaceBySlug, spaceTag } from "../lib/spaces";
import guides from "../data/guides.json";

const SPACE_GUIDE_MAP = {
  "living-room": ["choose-lighting-living-room", "choose-chandelier-size-room", "how-high-should-chandelier-hang"],
  "dining-room": ["choose-chandelier-size-room", "how-high-should-chandelier-hang", "glass-vs-crystal-chandelier"],
  "double-height-staircase": ["chandelier-double-height-living-room", "how-high-should-chandelier-hang", "choose-chandelier-size-room"],
  "foyer-entrance": ["choose-chandelier-size-room", "how-high-should-chandelier-hang", "glass-vs-crystal-chandelier"],
  "bedroom": ["wall-light-installation-height", "choose-chandelier-size-room", "glass-vs-crystal-chandelier"],
  "hotel-hospitality": ["lighting-for-architects-interior-projects", "can-chandelier-be-custom-made", "pack-transport-glass-chandeliers"],
  "restaurant": ["lighting-for-architects-interior-projects", "how-high-should-chandelier-hang", "can-chandelier-be-custom-made"],
  "retail-showroom": ["lighting-for-architects-interior-projects", "can-chandelier-be-custom-made", "glass-vs-crystal-chandelier"],
  "banquet-event-space": ["can-chandelier-be-custom-made", "lighting-for-architects-interior-projects", "pack-transport-glass-chandeliers"],
};

const GUIDE_BY_SLUG = new Map(guides.map((guide) => [guide.slug, guide]));

export default function SpacePage() {
  const { slug } = useParams();
  const space = getSpaceBySlug(slug);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!space) return;
    let active = true;
    setLoading(true);
    const tag = spaceTag(space);
    api.listAllProducts({ tag, limit: 48 })
      .then((items) => {
        if (!active) return;
        setProducts(items || []);
      })
      .catch(() => { if (active) setProducts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [space]);

  const itemList = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": space ? `${space.label} decorative lighting` : "Decorative lighting by space",
    "numberOfItems": products.length,
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": product.name,
      "url": `https://samratglass.com/product/${product.id}`,
    })),
  }), [products, space]);

  if (!space) return <Navigate to="/spaces" replace />;

  const relatedGuides = (SPACE_GUIDE_MAP[space.slug] || [])
    .map((guideSlug) => GUIDE_BY_SLUG.get(guideSlug))
    .filter(Boolean);

  return (
    <div data-testid="space-page" className="max-w-7xl mx-auto px-6 py-16 md:py-20">
      <SEO
        title={`${space.label} Lighting · Handcrafted Decorative Lighting · Samrat Glass`}
        description={`${space.description} Explore pieces explicitly selected for ${space.label.toLowerCase()} applications.`}
        path={`/space/${space.slug}`}
      />
      <SchemaLD id={`space-${space.slug}-items`} data={itemList} />

      <Link to="/spaces" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/55 hover:text-[#D4AF37]">
        <ArrowLeft size={14} /> All spaces
      </Link>

      <header className="max-w-4xl mt-8 mb-12 md:mb-16">
        <div className="eyebrow text-[#D4AF37] mb-4">Shop by Space</div>
        <h1 className="font-serif text-5xl md:text-7xl leading-[0.95]">{space.label}</h1>
        <p className="text-white/55 mt-6 max-w-3xl text-base md:text-lg leading-relaxed">{space.description}</p>
      </header>

      {relatedGuides.length > 0 && (
        <section className="mb-12 md:mb-16 border-y border-white/10 py-7 md:py-8" data-testid="space-related-guides">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-sm">
              <div className="eyebrow mb-2">Need help choosing?</div>
              <h2 className="font-serif text-2xl md:text-3xl">Helpful lighting guides for this space.</h2>
            </div>
            <div className="grid flex-1 gap-3 md:grid-cols-3 lg:max-w-4xl">
              {relatedGuides.map((guide) => (
                <Link
                  key={guide.slug}
                  to={`/guides/${guide.slug}`}
                  className="group border border-white/10 p-4 transition-colors hover:border-[#D4AF37]/55"
                >
                  <span className="block text-sm leading-snug text-white/75 group-hover:text-white">{guide.title}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-[#D4AF37]">
                    Read guide <ArrowUpRight size={11} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="py-20 text-white/40">Loading selected pieces…</div>
      ) : products.length === 0 ? (
        <div className="border border-white/10 p-8 md:p-10 max-w-3xl">
          <h2 className="font-serif text-2xl md:text-3xl">No pieces have been assigned to this space yet.</h2>
          <p className="text-white/50 mt-3 leading-relaxed">
            Space collections are curated manually so products are shown only when their application has been verified.
          </p>
          <Link to="/catalog" className="mt-6 inline-flex items-center gap-2 text-[#D4AF37] text-xs uppercase tracking-[0.22em] link-underline">
            Browse full catalogue <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 text-xs uppercase tracking-[0.22em] text-white/45">
            {products.length} verified {products.length === 1 ? "piece" : "pieces"}
          </div>
          <style>{`.space-product-grid [data-testid="catalogue-light-toggle-wrap"] { position: static; top: auto; }`}</style>
          <div className="space-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
