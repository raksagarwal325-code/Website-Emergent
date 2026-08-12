import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import SchemaLD from "../components/SchemaLD";
import CatalogueBrowser from "../components/CatalogueBrowser";
import { CATEGORIES, getCategoryByDbName, NAV_CATEGORIES, mergeDynamicCategories } from "../lib/categories";
import { buildItemList, CATALOG_PAGE_SIZE } from "../lib/listingSchema";
import { api } from "../lib/api";

/**
 * Main catalogue page.
 *
 * Two responsibilities beyond the shared `CatalogueBrowser`:
 *   1. Legacy-URL fallback: if a visitor lands on /catalog?category=<db_name>
 *      that maps to one of our six SEO categories, redirect them to the
 *      clean permanent URL. This is a client-side <Navigate replace> — a
 *      *true* HTTP 301 is a follow-up infrastructure task (ingress rule).
 *   2. Render the "Browse by category" strip so category pages are
 *      crawlable from the main catalogue too. This strip is DYNAMIC —
 *      it merges the curated registry with categories that appear on
 *      currently-published products (fetched from
 *      `/api/products/categories`), so a fresh admin who publishes a
 *      product with a new `category` value sees it in the strip
 *      without a code deploy.
 */
export default function Catalog() {
  const [searchParams] = useSearchParams();
  const [dynamicCats, setDynamicCats] = useState(NAV_CATEGORIES);
  const [listing, setListing] = useState(null);
  useEffect(() => {
    let alive = true;
    api
      .categories()
      .then((dbNames) => { if (alive) setDynamicCats(mergeDynamicCategories(dbNames)); })
      .catch(() => { /* fall back to curated NAV_CATEGORIES already set */ });
    return () => { alive = false; };
  }, []);

  const handleListingChange = useCallback((nextListing) => {
    setListing(nextListing);
  }, []);

  const legacyCategory = searchParams.get("category");
  const mapped = legacyCategory
    ? getCategoryByDbName(legacyCategory)
    : null;

  if (mapped) {
    return <Navigate to={`/category/${mapped.slug}`} replace />;
  }

  const itemListSchema = listing ? {
    "@context": "https://schema.org",
    ...buildItemList(listing.products, {
      page: listing.page,
      pageSize: CATALOG_PAGE_SIZE,
    }),
  } : null;

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
      <SchemaLD id="catalog-item-list" data={itemListSchema} />

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

      {/* Crawlable category strip — DYNAMIC: merges the curated registry
          with every published-product category returned by
          /api/products/categories. Unknown categories get a safe
          fallback slug (see mergeDynamicCategories in lib/categories.js).
          Wraps on desktop; scrolls horizontally on narrower widths so
          8+ items never truncate. */}
      <nav
        aria-label="Browse by category"
        data-testid="catalog-category-strip"
        className="mb-12 -mx-6 px-6 md:mx-0 md:px-0 overflow-x-auto md:overflow-visible"
      >
        <div className="flex md:flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.24em] whitespace-nowrap md:whitespace-normal">
          <span className="text-white/40">Browse by category:</span>
          {dynamicCats.map((c) => (
            <Link
              key={c.slug || c.db_name}
              to={`/category/${c.slug}`}
              data-testid={`catalog-strip-${c.slug || c.db_name.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-white/70 hover:text-[#D4AF37] link-underline"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </nav>

      <CatalogueBrowser
        dynamicCategories={dynamicCats}
        onListingChange={handleListingChange}
      />
    </div>
  );
}