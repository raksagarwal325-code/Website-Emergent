import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import ProductCard from "./ProductCard";
import { api } from "../lib/api";
import { filterCollectionProducts, getCollectionForProduct, selectDiverseCollectionPreview } from "../constants/collections";
import { getRegisteredCollections } from "../constants/collectionsRegistry";

export default function CompleteCollection({ productId }) {
  const [state, setState] = useState({ collection: null, products: [] });
  useEffect(() => {
    let active = true;
    setState({ collection: null, products: [] });
    if (!productId) return () => { active = false; };
    Promise.all([api.getProduct(productId), api.listAllProducts({ limit: 48 }), api.getSettings()])
      .then(([product, items, settings]) => {
        if (!active) return;
        const registry = getRegisteredCollections(settings);
        const collection = getCollectionForProduct(items, product, registry);
        if (!collection) return;
        const matches = filterCollectionProducts(items, collection);
        const preview = selectDiverseCollectionPreview(matches, product.sku, 5, collection.featuredSkus);
        setState({ collection, products: preview });
      })
      .catch(() => { if (active) setState({ collection: null, products: [] }); });
    return () => { active = false; };
  }, [productId]);
  const { collection, products } = state;
  if (!collection || products.length === 0) return null;
  const categoryCount = new Set(products.map((product) => product.category)).size;
  return <section data-testid="complete-collection" className="mt-20 md:mt-24 border-t border-white/10 pt-14 md:pt-16">
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 md:mb-10"><div className="max-w-2xl"><div className="eyebrow mb-3 text-[#D4AF37]">Designed to coordinate</div><h2 className="font-serif text-3xl md:text-4xl">Complete the {collection.name} Collection</h2><p className="text-white/50 text-sm mt-3 leading-relaxed">Explore confirmed {collection.name} pieces across as many lighting categories as are currently available, then see the full family on its dedicated collection page.</p></div><Link to={`/collection/${collection.slug}`} data-testid="view-full-collection" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-[#D4AF37] hover:text-white link-underline shrink-0">View full collection <ArrowUpRight size={14} /></Link></div>
    <div className="mb-5 text-[10px] uppercase tracking-[0.22em] text-white/35">{categoryCount} {categoryCount === 1 ? "category" : "categories"} represented in this preview</div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 md:gap-6">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
  </section>;
}
