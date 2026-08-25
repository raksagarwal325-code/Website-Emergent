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
    </div>
  );
}
