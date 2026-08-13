import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { api } from "../lib/api";

export function selectRelatedProducts(items, currentProductId, limit = 4) {
  return (items || [])
    .filter((p) => p?.id && p.id !== currentProductId)
    .sort((a, b) => {
      const aHasImage = Boolean((a.images || []).filter(Boolean).length);
      const bHasImage = Boolean((b.images || []).filter(Boolean).length);
      return Number(bHasImage) - Number(aHasImage);
    })
    .slice(0, limit);
}

export default function RelatedProducts({ productId }) {
  const [category, setCategory] = useState("");
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let active = true;
    setCategory("");
    setProducts([]);

    if (!productId) return () => { active = false; };

    api.getProduct(productId)
      .then((product) => {
        if (!active || !product?.category) return null;
        setCategory(product.category);
        return api.listProducts({ category: product.category, page: 1, limit: 12 });
      })
      .then((result) => {
        if (!active || !result) return;
        setProducts(selectRelatedProducts(result.items, productId, 4));
      })
      .catch(() => {
        if (active) setProducts([]);
      });

    return () => { active = false; };
  }, [productId]);

  if (products.length < 4) return null;

  return (
    <section
      data-testid="related-products"
      className="mt-20 md:mt-24 border-t border-white/10 pt-14 md:pt-16"
    >
      <div className="mb-8 md:mb-10">
        <div className="eyebrow mb-3 text-[#D4AF37]">Explore more</div>
        <h2 className="font-serif text-3xl md:text-4xl">You may also like</h2>
        <p className="text-white/50 text-sm mt-2 max-w-xl">
          More handcrafted pieces from our {category} collection.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {products.map((related, index) => (
          <ProductCard key={related.id} product={related} index={index} />
        ))}
      </div>
    </section>
  );
}
