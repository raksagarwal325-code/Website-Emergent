import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Layers3 } from "lucide-react";
import { api } from "../lib/api";
import { productPath } from "../lib/productUrl";
import { variantAxes } from "../constants/variantFamilies";

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function closestProduct(items, axes, currentIndex, axisIndex, wantedValue) {
  const candidates = items.map((item, index) => ({ item, index }))
    .filter(({ index }) => normalized(axes[axisIndex].values[index]) === normalized(wantedValue));
  if (!candidates.length) return null;
  return candidates.sort((a, b) => {
    const score = ({ index }) => axes.reduce((total, axis, i) => {
      if (i === axisIndex) return total;
      return total + (normalized(axis.values[index]) === normalized(axis.values[currentIndex]) ? 1 : 0);
    }, 0);
    return score(b) - score(a);
  })[0].item;
}

export default function ProductVariants({ product }) {
  const [data, setData] = useState({ family: null, items: [] });

  useEffect(() => {
    let active = true;
    setData({ family: null, items: [] });
    if (!product?.id || typeof api.getProductVariants !== "function") {
      return () => { active = false; };
    }
    api.getProductVariants(product.id)
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setData({ family: null, items: [] }); });
    return () => { active = false; };
  }, [product?.id]);

  const items = data.items || [];
  const axes = useMemo(() => variantAxes(items), [items]);
  const currentIndex = items.findIndex((item) => item.id === product?.id);
  if (!data.family || items.length < 2 || currentIndex < 0) return null;

  return (
    <section data-testid="product-variants" className="border border-[#D4AF37]/35 bg-[#D4AF37]/[0.035] p-5 md:p-6">
      <div className="flex items-start gap-3">
        <Layers3 size={17} className="text-[#D4AF37] mt-0.5 shrink-0" />
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-[#D4AF37]">Choose your configuration</div>
          <div className="font-serif text-xl mt-1">{data.family.name}</div>
          <p className="text-xs text-white/45 mt-1">Each option opens its exact catalogue product and reference code.</p>
        </div>
      </div>

      {axes.length > 0 ? (
        <div className="mt-5 space-y-4">
          {axes.map((axis, axisIndex) => {
            const values = Array.from(new Map(axis.values.filter(Boolean).map((value) => [normalized(value), value])).values());
            return (
              <div key={axis.key}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2">{axis.label}</div>
                <div className="flex flex-wrap gap-2">
                  {values.map((value) => {
                    const selected = normalized(axis.values[currentIndex]) === normalized(value);
                    const target = closestProduct(items, axes, currentIndex, axisIndex, value);
                    if (!target) return null;
                    return selected ? (
                      <span key={value} data-testid={`variant-${axis.key}-selected`} className="inline-flex items-center gap-1.5 border border-[#D4AF37] bg-[#D4AF37] text-black px-3 py-2 text-xs">
                        <Check size={12} /> {value}
                      </span>
                    ) : (
                      <Link key={value} to={productPath(target)} data-testid={`variant-${axis.key}-${normalized(value).replace(/[^a-z0-9]+/g, "-")}`} className="border border-white/20 hover:border-[#D4AF37] px-3 py-2 text-xs text-white/75 hover:text-white transition-colors">
                        {value}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          {items.map((item) => item.id === product.id ? (
            <span key={item.id} className="border border-[#D4AF37] bg-[#D4AF37] text-black px-3 py-2 text-xs">{item.sku}</span>
          ) : (
            <Link key={item.id} to={productPath(item)} className="border border-white/20 hover:border-[#D4AF37] px-3 py-2 text-xs">{item.sku}</Link>
          ))}
        </div>
      )}
    </section>
  );
}
