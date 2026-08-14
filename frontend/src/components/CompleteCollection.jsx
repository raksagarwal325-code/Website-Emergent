import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import ProductCard from "./ProductCard";
import { api } from "../lib/api";
import {
  filterCollectionProducts,
  getCollection,
  selectDiverseCollectionPreview,
} from "../constants/collections";

const COLLECTION = getCollection("gulzar");

export default function CompleteCollection({ productId }) {
  const [products, setProducts] = useState([]);
  const [currentSku, setCurrentSku] = useState("");

  useEffect(() => {
    let active = true;
    setProducts([]);
    setCurrentSku("");

    if (!productId || !COLLECTION) return () => { active = false; };

    api.getProduct(productId)
      .then(async (product) => {
        if (!active || !COLLECTION.memberSkus.includes(product?.sku)) return null;
        setCurrentSku(product.sku);
        const items = await api.listAllProducts({ limit: 48 });
        return filterCollectionProducts(items, COLLECTION);
      })
      .then((matches) => {
        if (!active || !matches) return;
        setProducts(selectDiverseCollectionPreview(matches, currentSku || undefined, 5));
      })
      .catch(() => {
        if (active) setProducts([]);
      });

    return () => { active = false; };
  }, [productId, currentSku]);

  if (products.length === 0) return null;

  const categoryCount = new Set(products.map((product) => product.category)).size;

  return (
    <section
      data-testid="complete-gulzar-collection"
      className="mt-20 md:mt-24 border-t border-white/10 pt-14 md:pt-16"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8 md:mb-10">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3 text-[#D4AF37]">Designed to coordinate</div>
          <h2 className="font-serif text-3xl md:text-4xl">Complete the Gulzar Collection</h2>
          <p className="text-white/50 text-sm mt-3 leading-relaxed">
            Explore confirmed Gulzar pieces across as many lighting categories as are currently available, then see the full family on its dedicated collection page.
          </p>
        </div>
        <Link
          to="/collection/gulzar"
          data-testid="view-gulzar-collection"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-[#D4AF37] hover:text-white link-underline shrink-0"
        >
          View full collection <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="mb-5 text-[10px] uppercase tracking-[0.22em] text-white/35">
        {categoryCount} {categoryCount === 1 ? "category" : "categories"} represented in this preview
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 md:gap-6">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </section>
  );
}
