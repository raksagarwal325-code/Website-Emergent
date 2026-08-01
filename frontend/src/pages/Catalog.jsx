import React from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import CatalogueBrowser from "../components/CatalogueBrowser";
import { CATEGORIES, getCategoryByDbName, NAV_CATEGORIES } from "../lib/categories";

/**
 * Catalog page.
 *
 * Two responsibilities beyond the shared `CatalogueBrowser`:
 *   1. Legacy-URL fallback: if a visitor lands on /catalog?category=<db_name>
 *      that maps to one of our six SEO categories, redirect them to the
 *      clean permanent URL. This is a client-side <Navigate replace> — a
 *      *true* HTTP 301 is a follow-up infrastructure task (ingress rule).
 *   2. Render the "Browse by category" strip so category pages are
 *      crawlable from the main catalogue too.
 */
export default function Catalog() {
  const [searchParams] = useSearchParams();
  const legacyCategory = searchParams.get("category");
  const mapped = legacyCategory ? getCategoryByDbName(legacyCategory) : null;
  if (mapped) {
    return <Navigate to={`/category/${mapped.slug}`} replace />;
  }

  return (
    <div data-testid="page-catalog" className="max-w-7xl mx-auto px-6 py-16">
      <SEO
        title="Catalog · Chandeliers, Pendants & Decorative Lighting · Samrat Glass Emporium"
        description="Browse 1000+ handcrafted chandeliers, crystal hurricanes, pendant lights, wall sconces and table lamps — made in Firozabad since 1981."
        path="/catalog"
      />
      <div className="mb-12 fade-up">
        <div className="eyebrow mb-3">The Collection</div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl">Catalog</h1>
        <p className="mt-6 text-white/60 max-w-xl">
          Browse, filter, and enquire on any piece. Add favorites for later or send us your inquiry basket.
        </p>
      </div>

      {/* Crawlable category strip — reads from the single-source
          NAV_CATEGORIES so it always matches the left filter, the
          homepage grid and the footer strip. Wraps on desktop; scrolls
          horizontally on narrower widths so 8+ items never truncate. */}
      <nav
        aria-label="Browse by category"
        data-testid="catalog-category-strip"
        className="mb-12 -mx-6 px-6 md:mx-0 md:px-0 overflow-x-auto md:overflow-visible"
      >
        <div className="flex md:flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.24em] whitespace-nowrap md:whitespace-normal">
          <span className="text-white/40">Browse by category:</span>
          {NAV_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              data-testid={`catalog-strip-${c.slug}`}
              className="text-white/70 hover:text-[#D4AF37] link-underline"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </nav>

      <CatalogueBrowser />
    </div>
  );
}
