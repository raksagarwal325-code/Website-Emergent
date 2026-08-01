import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "../components/SEO";
import CatalogueBrowser from "../components/CatalogueBrowser";
import NotFound from "./NotFound";
import { getCategoryBySlug, NAV_CATEGORIES, SITE_ORIGIN } from "../lib/categories";
import { api } from "../lib/api";

/**
 * SEO landing page for one category. Behaviour:
 *   * Unknown slug → real 404 UI (server response is limited by SPA host;
 *     see the sitemap for the canonical set of six slugs).
 *   * Known slug → unique H1 + intro + full CatalogueBrowser locked to the
 *     matching DB category, self-referencing canonical, CollectionPage
 *     JSON-LD with an ItemList of the products currently returned by the
 *     public API.
 *
 * We deliberately reuse `CatalogueBrowser` so search, sort, price, load-more,
 * pagination dedupe and the stale-response guard behave identically to the
 * catalogue page — the only thing that changes is that category is locked.
 */
export default function CategoryPage() {
  const { slug } = useParams();
  const category = getCategoryBySlug(slug);
  // Products list for the JSON-LD ItemList. We fetch a small first page so
  // the schema block includes real, published products only. If the fetch
  // fails we still render the page — just without the ItemList payload.
  const [ldProducts, setLdProducts] = useState([]);

  useEffect(() => {
    if (!category) return;
    let alive = true;
    api
      .listProducts({ category: category.db_name, sort: "newest", limit: 24 })
      .then((res) => {
        if (!alive) return;
        setLdProducts((res?.items || []).filter((p) => p?.id && p?.name));
      })
      .catch(() => {
        if (alive) setLdProducts([]);
      });
    return () => { alive = false; };
  }, [category]);

  if (!category) {
    return <NotFound />;
  }

  const path = `/category/${category.slug}`;
  const canonical = `${SITE_ORIGIN}${path}`;

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    "url": canonical,
    "name": category.h1,
    "description": category.metaDescription,
    "isPartOf": { "@id": `${SITE_ORIGIN}/#website` },
    "about": category.label,
    "mainEntity": {
      "@type": "ItemList",
      "itemListOrder": "https://schema.org/ItemListOrderDescending",
      "numberOfItems": ldProducts.length,
      "itemListElement": ldProducts.map((p, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "url": `${SITE_ORIGIN}/product/${p.id}`,
        "name": p.name,
      })),
    },
  };

  return (
    <div data-testid={`page-category-${category.slug}`} className="max-w-7xl mx-auto px-6 py-16">
      <SEO
        title={category.seoTitle}
        description={category.metaDescription}
        image={ldProducts[0] ? api.resolveImage(ldProducts[0].images?.[0]) : undefined}
        path={path}
        type="website"
      />
      {/* JSON-LD is inlined in the head via a plain script tag so the
          prerender pass can serialise a matching block from Node too. */}
      <script
        type="application/ld+json"
        data-testid={`category-jsonld-${category.slug}`}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

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

      <CatalogueBrowser lockedCategory={category.db_name} />

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
