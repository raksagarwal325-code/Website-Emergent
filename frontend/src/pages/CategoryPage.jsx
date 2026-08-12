import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "../components/SEO";
import SchemaLD from "../components/SchemaLD";
import CatalogueBrowser from "../components/CatalogueBrowser";
import NotFound from "./NotFound";
import {
  getCategoryBySlug,
  resolveCategoryBySlug,
  NAV_CATEGORIES,
  SITE_ORIGIN,
} from "../lib/categories";
import { buildItemList, CATALOG_PAGE_SIZE } from "../lib/listingSchema";
import { api } from "../lib/api";

/**
 * SEO landing page for one category. Behaviour:
 *   * Curated slug (from categories.data.json) → resolves instantly with
 *     hand-written H1, intro and SEO copy.
 *   * Dynamic slug — one that came from `mergeDynamicCategories` because a
 *     published product uses a category not (yet) in the curated
 *     registry — resolves asynchronously against
 *     `/api/products/categories` (which the backend restricts to
 *     `status=published` for anon callers, so a draft-only category can
 *     never be reached this way). Renders with generic-but-sensible
 *     fallback H1 / intro / SEO copy.
 *   * Slug matching neither source → real 404 UI.
 *
 * We deliberately reuse `CatalogueBrowser` so search, sort, price,
 * pagination and the stale-response guard behave identically to the
 * catalogue page — the only thing that changes is that category is locked.
 */
export default function CategoryPage() {
  const { slug } = useParams();
  // Curated hit is synchronous — no loading flash for canonical slugs.
  const curated = getCategoryBySlug(slug);
  // For unknown slugs we probe the dynamic list. `undefined` = still
  // resolving, `null` = resolved to "not found".
  const [dynamicResolved, setDynamicResolved] = useState(
    curated ? curated : undefined,
  );
  // Structured data is driven by the exact accepted result that
  // CatalogueBrowser renders. No separate schema-only product request.
  const [listing, setListing] = useState(null);

  // Resolve unknown slugs against /api/products/categories exactly like
  // the Catalog page does. Depending on `slug` also handles direct
  // navigation between /category/<a> → /category/<b>.
  useEffect(() => {
    if (curated) {
      setDynamicResolved(curated);
      return;
    }
    let alive = true;
    setDynamicResolved(undefined);
    api
      .categories()
      .then((dbNames) => {
        if (!alive) return;
        setDynamicResolved(resolveCategoryBySlug(slug, dbNames) || null);
      })
      .catch(() => {
        if (alive) setDynamicResolved(null);
      });
    return () => {
      alive = false;
    };
  }, [slug, curated]);

  const category = dynamicResolved;

  // Do not let a previous category's runtime ItemList survive while a newly
  // locked category is loading. CatalogueBrowser will report the new accepted
  // visible result as soon as it settles.
  useEffect(() => {
    setListing(null);
  }, [category?.db_name]);

  const handleListingChange = useCallback((nextListing) => {
    setListing(nextListing);
  }, []);

  // Resolving — render a minimal shell instead of flashing NotFound.
  if (category === undefined) {
    return (
      <div
        data-testid="page-category-loading"
        className="max-w-7xl mx-auto px-6 py-16 text-white/40 text-sm"
      >
        Loading…
      </div>
    );
  }

  if (category === null) {
    return <NotFound />;
  }

  const path = `/category/${category.slug}`;
  const canonical = `${SITE_ORIGIN}${path}`;
  const categorySchemaId = `category-${category.slug}`;
  const breadcrumbSchemaId = `category-breadcrumb-${category.slug}`;

  const collectionSchema = listing ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    "url": canonical,
    "name": category.h1,
    "description": category.metaDescription,
    "isPartOf": { "@id": `${SITE_ORIGIN}/#website` },
    "about": category.label,
    "mainEntity": buildItemList(listing.products, {
      page: listing.page,
      pageSize: CATALOG_PAGE_SIZE,
    }),
  } : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${SITE_ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Catalog",
        "item": `${SITE_ORIGIN}/catalog`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": category.label,
        "item": canonical,
      },
    ],
  };

  return (
    <div data-testid={`page-category-${category.slug}`} className="max-w-7xl mx-auto px-6 py-16">
      <SEO
        title={category.seoTitle}
        description={category.metaDescription}
        image={listing?.products?.[0] ? api.resolveImage(listing.products[0].images?.[0]) : undefined}
        path={path}
        type="website"
      />
      <SchemaLD id={categorySchemaId} data={collectionSchema} />
      <SchemaLD id={breadcrumbSchemaId} data={breadcrumbSchema} />

      <nav
        aria-label="Breadcrumb"
        className="mb-8 text-xs uppercase tracking-[0.24em] text-white/40"
        data-testid="category-breadcrumb"
      >
        <Link to="/" className="hover:text-white">Home</Link>
        <span className="mx-2">·</span>
        <Link to="/catalog" className="hover:text-white">Catalog</Link>
        <span className="mx-2">·</span>
        <span className="text-white/70">{category.label}</span>
      </nav>

      <div className="mb-10 fade-up">
        <div className="eyebrow mb-3">The Collection</div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl" data-testid={`category-h1-${category.slug}`}>
          {category.h1}
        </h1>
        <p
          className="mt-6 text-white/60 max-w-3xl leading-relaxed"
          data-testid={`category-intro-${category.slug}`}
        >
          {category.intro}
        </p>
      </div>

      <CatalogueBrowser
        lockedCategory={category.db_name}
        onListingChange={handleListingChange}
      />

      {/* Crawlable strip pointing at every other category — keeps internal
          link equity flowing without introducing a new visual element. */}
      <nav
        aria-label="More categories"
        data-testid="category-cross-links"
        className="mt-16 pt-10 border-t border-white/10 -mx-6 px-6 md:mx-0 md:px-0 overflow-x-auto md:overflow-visible"
      >
        <div className="flex md:flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.24em] whitespace-nowrap md:whitespace-normal">
          <span className="text-white/40">Explore more:</span>
          {NAV_CATEGORIES.filter((c) => c.slug !== category.slug).map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="text-white/70 hover:text-[#D4AF37] link-underline"
              data-testid={`category-cross-${c.slug}`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
