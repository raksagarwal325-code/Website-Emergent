import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "../components/SEO";
import SchemaLD from "../components/SchemaLD";
import CatalogueBrowser from "../components/CatalogueBrowser";
import CategorySwitchBar from "../components/CategorySwitchBar";
import NotFound from "./NotFound";
import { getCategoryBySlug, resolveCategoryBySlug, NAV_CATEGORIES, SITE_ORIGIN } from "../lib/categories";
import { buildItemList, CATALOG_PAGE_SIZE } from "../lib/listingSchema";
import { api } from "../lib/api";

const CATEGORY_CONTEXT_LINKS = {
  chandeliers: [
    { label: "How to choose the right chandelier size", path: "/guides/choose-chandelier-size-room" },
    { label: "Chandeliers for double-height living rooms", path: "/guides/chandelier-double-height-living-room" },
    { label: "How high should a chandelier hang?", path: "/guides/how-high-should-chandelier-hang" },
    { label: "What hand-blown glass means in decorative lighting", path: "/guides/what-is-hand-blown-glass-luxury-lighting" },
    { label: "Can a chandelier be custom-made?", path: "/guides/can-chandelier-be-custom-made" },
    { label: "Decorative lighting for wedding banquet halls", path: "/guides/decorative-lighting-wedding-banquet-hall" },
    { label: "See real chandelier installations", path: "/gallery" },
    { label: "Discuss custom lighting", path: "/custom-lighting-bulk-orders" },
  ],
  "hanging-lights": [
    { label: "How high should decorative lighting hang?", path: "/guides/how-high-should-chandelier-hang" },
    { label: "Plan layered lighting for a living room", path: "/guides/choose-lighting-living-room" },
    { label: "Handcrafted glass lighting directions for Indian homes", path: "/guides/handcrafted-glass-lighting-trends-indian-homes" },
    { label: "Decorative lighting guidance for event planners", path: "/guides/event-planner-decorative-lighting-guide" },
    { label: "See hanging lights in real installations", path: "/gallery" },
    { label: "Discuss custom pendant or cluster requirements", path: "/custom-lighting-bulk-orders" },
  ],
  "wall-lights": [
    { label: "How to choose wall lights and installation height", path: "/guides/wall-light-installation-height" },
    { label: "Plan layered lighting for a living room", path: "/guides/choose-lighting-living-room" },
    { label: "Handcrafted glass lighting directions for Indian homes", path: "/guides/handcrafted-glass-lighting-trends-indian-homes" },
    { label: "See wall lights in real installations", path: "/gallery" },
    { label: "Discuss coordinated project lighting", path: "/custom-lighting-bulk-orders" },
  ],
  "table-lamps": [
    { label: "How to layer lighting in a living room", path: "/guides/choose-lighting-living-room" },
    { label: "Handcrafted glass lighting directions for Indian homes", path: "/guides/handcrafted-glass-lighting-trends-indian-homes" },
    { label: "What hand-blown glass means in decorative lighting", path: "/guides/what-is-hand-blown-glass-luxury-lighting" },
    { label: "See real residential and hospitality projects", path: "/gallery" },
    { label: "Explore handcrafted lighting in Firozabad", path: "/craft" },
  ],
  "floor-lamps": [
    { label: "How to layer lighting in a living room", path: "/guides/choose-lighting-living-room" },
    { label: "Handcrafted glass lighting directions for Indian homes", path: "/guides/handcrafted-glass-lighting-trends-indian-homes" },
    { label: "Lighting guidance for architects and interiors", path: "/guides/lighting-for-architects-interior-projects" },
    { label: "Discuss project or custom requirements", path: "/custom-lighting-bulk-orders" },
  ],
  "floor-chandeliers": [
    { label: "How to choose scale for statement lighting", path: "/guides/choose-chandelier-size-room" },
    { label: "Lighting guidance for large interior volumes", path: "/guides/chandelier-double-height-living-room" },
    { label: "Decorative lighting for wedding banquet halls", path: "/guides/decorative-lighting-wedding-banquet-hall" },
    { label: "See statement pieces in real projects", path: "/gallery" },
    { label: "Discuss a custom statement piece", path: "/custom-lighting-bulk-orders" },
  ],
  "table-chandeliers": [
    { label: "How to plan layered decorative lighting", path: "/guides/choose-lighting-living-room" },
    { label: "Decorative lighting for wedding banquet halls", path: "/guides/decorative-lighting-wedding-banquet-hall" },
    { label: "Decorative lighting guidance for event planners", path: "/guides/event-planner-decorative-lighting-guide" },
    { label: "See real project installations", path: "/gallery" },
    { label: "Discuss banquet, hospitality or custom quantities", path: "/custom-lighting-bulk-orders" },
  ],
  "ceiling-lights": [
    { label: "How to plan layered lighting for a living room", path: "/guides/choose-lighting-living-room" },
    { label: "Lighting guidance for architects and interior projects", path: "/guides/lighting-for-architects-interior-projects" },
    { label: "Discuss coordinated project lighting", path: "/custom-lighting-bulk-orders" },
  ],
  "gate-lights": [
    { label: "Lighting guidance for architects and interior projects", path: "/guides/lighting-for-architects-interior-projects" },
    { label: "See completed Samrat Glass projects", path: "/gallery" },
    { label: "Discuss quantities, finishes or project requirements", path: "/custom-lighting-bulk-orders" },
  ],
  "candle-stands": [
    { label: "Decorative lighting guidance for event planners", path: "/guides/event-planner-decorative-lighting-guide" },
    { label: "Decorative lighting for wedding banquet halls", path: "/guides/decorative-lighting-wedding-banquet-hall" },
    { label: "Explore the Samrat Glass craft story", path: "/craft" },
    { label: "See decorative lighting in real interiors", path: "/gallery" },
    { label: "Discuss custom or hospitality quantities", path: "/custom-lighting-bulk-orders" },
  ],
};

export default function CategoryPage() {
  const { slug } = useParams();
  const curated = getCategoryBySlug(slug);
  const [dynamicResolved, setDynamicResolved] = useState(curated ? curated : undefined);
  const [listing, setListing] = useState(null);

  useEffect(() => {
    if (curated) {
      setDynamicResolved(curated);
      return;
    }
    let alive = true;
    setDynamicResolved(undefined);
    api.categories()
      .then((dbNames) => { if (alive) setDynamicResolved(resolveCategoryBySlug(slug, dbNames) || null); })
      .catch(() => { if (alive) setDynamicResolved(null); });
    return () => { alive = false; };
  }, [slug, curated]);

  const category = dynamicResolved;
  useEffect(() => { setListing(null); }, [category?.db_name]);
  const handleListingChange = useCallback((nextListing) => setListing(nextListing), []);

  if (category === undefined) {
    return <div data-testid="page-category-loading" className="max-w-7xl mx-auto px-6 py-16 text-white/40 text-sm">Loading…</div>;
  }
  if (category === null) return <NotFound />;

  const path = `/category/${category.slug}`;
  const canonical = `${SITE_ORIGIN}${path}`;
  const contextLinks = CATEGORY_CONTEXT_LINKS[category.slug] || [
    { label: "Browse practical lighting guides", path: "/guides" },
    { label: "See real Samrat Glass installations", path: "/gallery" },
    { label: "Discuss custom or bulk lighting", path: "/custom-lighting-bulk-orders" },
  ];
  const collectionSchema = listing ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    "url": canonical,
    "name": category.h1,
    "description": category.metaDescription,
    "isPartOf": { "@id": `${SITE_ORIGIN}/#website` },
    "about": category.label,
    "mainEntity": buildItemList(listing.products, { page: listing.page, pageSize: CATALOG_PAGE_SIZE }),
  } : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_ORIGIN}/` },
      { "@type": "ListItem", "position": 2, "name": "Catalog", "item": `${SITE_ORIGIN}/catalog` },
      { "@type": "ListItem", "position": 3, "name": category.label, "item": canonical },
    ],
  };

  return (
    <div data-testid={`page-category-${category.slug}`} className="max-w-7xl mx-auto px-6 py-16">
      <SEO title={category.seoTitle} description={category.metaDescription} image={listing?.products?.[0] ? api.resolveImage(listing.products[0].images?.[0]) : undefined} path={path} type="website" />
      <SchemaLD id={`category-${category.slug}`} data={collectionSchema} />
      <SchemaLD id={`category-breadcrumb-${category.slug}`} data={breadcrumbSchema} />

      <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-[0.24em] text-white/40" data-testid="category-breadcrumb">
        <Link to="/" className="hover:text-white">Home</Link>
        <span className="mx-2">·</span>
        <Link to="/catalog" className="hover:text-white">Catalog</Link>
        <span className="mx-2">·</span>
        <span className="text-white/70">{category.label}</span>
      </nav>

      <div className="mb-10 fade-up">
        <div className="eyebrow mb-3">The Collection</div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl" data-testid={`category-h1-${category.slug}`}>{category.h1}</h1>
        <p className="mt-6 text-white/60 max-w-3xl leading-relaxed" data-testid={`category-intro-${category.slug}`}>{category.intro}</p>
      </div>

      <CategorySwitchBar categories={NAV_CATEGORIES} activeSlug={category.slug} />

      {category.slug === "chandeliers" && (
        <aside data-testid="chandelier-manufacturer-authority-link" className="mb-10 border-l border-[#D4AF37]/50 bg-[#0d0510] px-6 py-5 max-w-4xl">
          <p className="text-sm text-white/60 leading-relaxed">Looking beyond the collection itself? Read how Samrat Glass Emporium approaches chandelier making, customisation and Firozabad glass craftsmanship as a decorative lighting manufacturer established in 1981.</p>
          <Link to="/chandelier-manufacturer-india" className="inline-block mt-3 text-xs uppercase tracking-[0.22em] text-[#D4AF37] hover:text-white link-underline">Chandelier manufacturer in India — our Firozabad story</Link>
        </aside>
      )}

      <CatalogueBrowser lockedCategory={category.db_name} onListingChange={handleListingChange} />

      <aside
        data-testid={`category-context-links-${category.slug}`}
        aria-labelledby={`category-context-links-heading-${category.slug}`}
        className="mt-14 md:mt-20 border-t border-white/10 pt-8 max-w-5xl"
      >
        <div className="eyebrow mb-3">Plan the right piece</div>
        <h2 id={`category-context-links-heading-${category.slug}`} className="font-serif text-2xl sm:text-3xl leading-tight">
          Useful guidance and real-world examples
        </h2>
        <p className="mt-3 text-sm text-white/55 leading-relaxed max-w-3xl">
          Compare scale, placement and project requirements before you enquire. These related Samrat Glass resources connect this collection with practical guidance, completed installations and custom work.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
          {contextLinks.map((item) => (
            <Link
              key={`${category.slug}-${item.path}-${item.label}`}
              to={item.path}
              className="text-sm text-[#BF9972] hover:text-[#D4AF37] border-b border-white/10 hover:border-[#D4AF37] pb-1 transition-colors"
            >
              {item.label} →
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}
