import React from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import CatalogueBrowser from "../components/CatalogueBrowser";
import { CATEGORIES, getCategoryByDbName } from "../lib/categories";

/**
 * Main catalogue page.
 *
 * Redirects recognized legacy category-query URLs to their clean category
 * routes and exposes crawlable links to every category page.
 */
export default function Catalog() {
  const [searchParams] = useSearchParams();
  const legacyCategory = searchParams.get("category");
  const mapped = legacyCategory
    ? getCategoryByDbName(legacyCategory)
    : null;

  if (mapped) {
    return <Navigate to={`/category/${mapped.slug}`} replace />;
  }

  return (
    <div
      data-testid="page-catalog"
      className="max-w-7xl mx-auto px-6 py-16"
    >
      <SEO
        title="Catalog · Chandeliers, Pendants & Decorative Lighting · Samrat Glass Emporium"
        description="Browse 1000+ handcrafted chandeliers, crystal hurricanes, pendant lights, wall sconces and table lamps — made in Firozabad since 1981."
        path="/catalog"
      />

      <div className="mb-12 fade-up">
        <div className="eyebrow mb-3">The Collection</div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl">
          Catalog
        </h1>
        <p className="mt-6 text-white/60 max-w-xl">
          Browse, filter, and enquire on any piece. Add favorites for later or
          send us your inquiry basket.
        </p>
      </div>

      <nav
        aria-label="Browse by category"
        data-testid="catalog-category-strip"
        className="mb-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.24em]"
      >
        <span className="text-white/40">Browse by category:</span>

        {CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            to={`/category/${category.slug}`}
            data-testid={`catalog-strip-${category.slug}`}
            className="text-white/70 hover:text-[#D4AF37] link-underline"
          >
            {category.label}
          </Link>
        ))}
      </nav>

      <CatalogueBrowser />
    </div>
  );
} 