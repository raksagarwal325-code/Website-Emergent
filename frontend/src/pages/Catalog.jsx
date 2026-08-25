import React, { useCallback, useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import SchemaLD from "../components/SchemaLD";
import CatalogueBrowser from "../components/CatalogueBrowser";
import CategorySwitchBar from "../components/CategorySwitchBar";
import { getCategoryByDbName, NAV_CATEGORIES, mergeDynamicCategories } from "../lib/categories";
import { buildItemList, CATALOG_PAGE_SIZE } from "../lib/listingSchema";
import { api } from "../lib/api";

export default function Catalog() {
  const [searchParams] = useSearchParams();
  const [dynamicCats, setDynamicCats] = useState(NAV_CATEGORIES);
  const [listing, setListing] = useState(null);

  useEffect(() => {
    let alive = true;
    api.categories()
      .then((dbNames) => { if (alive) setDynamicCats(mergeDynamicCategories(dbNames)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const handleListingChange = useCallback((nextListing) => setListing(nextListing), []);
  const legacyCategory = searchParams.get("category");
  const mapped = legacyCategory ? getCategoryByDbName(legacyCategory) : null;
  if (mapped) return <Navigate to={`/category/${mapped.slug}`} replace />;

  const itemListSchema = listing ? {
    "@context": "https://schema.org",
    ...buildItemList(listing.products, { page: listing.page, pageSize: CATALOG_PAGE_SIZE }),
  } : null;

  return (
    <div data-testid="page-catalog" className="max-w-7xl mx-auto px-6 py-16">
      <SEO title="Catalog · Chandeliers, Pendants & Decorative Lighting · Samrat Glass Emporium" description="Browse 1000+ handcrafted chandeliers, crystal hurricanes, pendant lights, wall sconces and table lamps — made in Firozabad since 1981." path="/catalog" />
      <SchemaLD id="catalog-item-list" data={itemListSchema} />

      <div className="mb-10 fade-up">
        <div className="eyebrow mb-3">The Collection</div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl">Catalog</h1>
        <p className="mt-6 text-white/60 max-w-xl">Browse, filter, and enquire on any piece. Add favorites for later or send us your inquiry basket.</p>
      </div>

      <CategorySwitchBar categories={dynamicCats} />

      <CatalogueBrowser dynamicCategories={dynamicCats} onListingChange={handleListingChange} />
    </div>
  );
}
