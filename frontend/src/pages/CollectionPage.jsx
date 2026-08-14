import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, MessageCircle } from "lucide-react";
import ProductCard from "../components/ProductCard";
import SEO from "../components/SEO";
import { api } from "../lib/api";
import {
  filterCollectionProducts,
  getCollection,
  groupCollectionProducts,
} from "../constants/collections";

const CATEGORY_ORDER = [
  "Chandelier",
  "Floor Chandelier",
  "Table Chandelier",
  "Hanging Light",
  "Wall Light",
  "Floor Lamp",
  "Table Lamp",
  "Candle Stand",
];

export default function CollectionPage() {
  const { slug } = useParams();
  const collection = getCollection(slug);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProducts([]);

    if (!collection) {
      setLoading(false);
      return () => { active = false; };
    }

    api.listAllProducts({ limit: 48 })
      .then((items) => {
        if (!active) return;
        setProducts(filterCollectionProducts(items, collection));
      })
      .catch(() => {
        if (active) setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [collection]);

  const groups = useMemo(() => groupCollectionProducts(products), [products]);
  const categories = useMemo(() => {
    const found = Object.keys(groups);
    return found.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      const ar = ai === -1 ? 999 : ai;
      const br = bi === -1 ? 999 : bi;
      return ar - br || a.localeCompare(b);
    });
  }, [groups]);

  if (!collection) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="eyebrow mb-4">Collection not found</div>
        <h1 className="font-serif text-4xl">This collection is not available yet.</h1>
        <Link to="/catalog" className="inline-flex items-center gap-2 mt-8 text-[#D4AF37] link-underline">
          <ArrowLeft size={14} /> Browse catalogue
        </Link>
      </div>
    );
  }

  return (
    <div data-testid={`collection-page-${collection.slug}`} className="max-w-7xl mx-auto px-6 py-16 md:py-20">
      <SEO
        title={`${collection.title} · Samrat Glass Emporium`}
        description={collection.description}
        path={`/collection/${collection.slug}`}
      />

      <Link to="/catalog" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-white mb-12 link-underline">
        <ArrowLeft size={14} /> Back to catalogue
      </Link>

      <header className="border-b border-white/10 pb-12 md:pb-16">
        <div className="eyebrow text-[#D4AF37] mb-4">{collection.eyebrow}</div>
        <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] max-w-4xl">{collection.title}</h1>
        <p className="text-white/60 leading-relaxed mt-6 max-w-2xl text-base md:text-lg">
          {collection.description}
        </p>
        {!loading && products.length > 0 && (
          <div className="mt-7 text-xs uppercase tracking-[0.24em] text-[#BF9972]">
            {products.length} confirmed pieces · {categories.length} {categories.length === 1 ? "category" : "categories"}
          </div>
        )}
      </header>

      {loading ? (
        <div className="py-20 text-white/40">Loading collection…</div>
      ) : products.length === 0 ? (
        <div className="py-20 text-white/50">Collection pieces are being prepared.</div>
      ) : (
        <div className="space-y-20 md:space-y-24 py-16 md:py-20">
          {categories.map((category) => (
            <section key={category} data-testid={`collection-category-${category.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-end justify-between gap-4 mb-8 md:mb-10 border-b border-white/10 pb-5">
                <div>
                  <div className="eyebrow text-[#D4AF37] mb-2">{collection.name}</div>
                  <h2 className="font-serif text-3xl md:text-4xl">{category}</h2>
                </div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                  {groups[category].length} {groups[category].length === 1 ? "piece" : "pieces"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
                {groups[category].map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="border border-[#D4AF37]/35 bg-white/[0.02] p-7 md:p-10 mt-4 md:mt-8">
        <div className="eyebrow text-[#D4AF37] mb-3">Plan the full look</div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl md:text-4xl">Enquire for the complete {collection.name} collection</h2>
            <p className="text-white/55 mt-3 leading-relaxed">
              Tell us your room, preferred glass colours and the pieces you need. We can help coordinate a complete set across the confirmed collection.
            </p>
          </div>
          <Link
            to="/contact?type=general"
            className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] text-black px-7 py-4 uppercase text-xs tracking-[0.24em] hover:bg-[#B5952F] transition-colors shrink-0"
          >
            <MessageCircle size={14} /> Enquire for collection <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
