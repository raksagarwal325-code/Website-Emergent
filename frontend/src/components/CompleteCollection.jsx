import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { api } from "../lib/api";

const GULZAR_ANCHOR_SKU = "SGE-FL-015";
const GULZAR_MEMBER_SKUS = new Set([
  "SGE-TL-017",
  "SGE-TL-018",
  "SGE-TL-019",
  "SGE-TL-020",
  "SGE-TL-021",
]);

export function selectGulzarCollection(items = []) {
  return items.filter((product) => GULZAR_MEMBER_SKUS.has(product?.sku));
}

export default function CompleteCollection({ productId }) {
  const [products, setProducts] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    setProducts([]);
    setVisible(false);

    if (!productId) return () => { active = false; };

    api.getProduct(productId)
      .then(async (product) => {
        if (!active || product?.sku !== GULZAR_ANCHOR_SKU) return null;
        const items = await api.listAllProducts({ category: "Table Lamp", limit: 100 });
        return selectGulzarCollection(items);
      })
      .then((matches) => {
        if (!active || !matches) return;
        setProducts(matches);
        setVisible(matches.length > 0);
      })
      .catch(() => {
        if (!active) return;
        setProducts([]);
        setVisible(false);
      });

    return () => { active = false; };
  }, [productId]);

  if (!visible) return null;

  return (
    <section
      data-testid="complete-gulzar-collection"
      className="mt-20 md:mt-24 border-t border-white/10 pt-14 md:pt-16"
    >
      <div className="mb-8 md:mb-10 max-w-2xl">
        <div className="eyebrow mb-3 text-[#D4AF37]">Designed to coordinate</div>
        <h2 className="font-serif text-3xl md:text-4xl">Complete the Gulzar Collection</h2>
        <p className="text-white/50 text-sm mt-3 leading-relaxed">
          Pair this statement piece with coordinated Gulzar table lamps in complementary glass colours for a more considered, collected interior.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 md:gap-6">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </section>
  );
}
