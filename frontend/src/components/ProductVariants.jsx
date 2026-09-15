import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Layers3 } from "lucide-react";
import { api } from "../lib/api";
import { productPath } from "../lib/productUrl";
import { variantAxes } from "../constants/variantFamilies";

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

const GLASS_COLOUR_PATTERNS = [
  ["emerald-green", /\bemerald(?:\s+green)?\b/],
  ["ruby-red", /\bruby(?:\s+red)?\b/],
  ["cobalt-blue", /\bcobalt(?:\s+blue)?\b/],
  ["blush-pink", /\bblush(?:\s+pink)?\b/],
  ["crystal-clear", /\b(?:crystal\s+)?clear\b/],
  ["smoky", /\bsmok(?:e|y)\b/],
  ["multicolour", /\bmulti(?:colour|color)\b/],
  ["amber", /\bamber\b/],
  ["green", /\bgreen\b/],
  ["blue", /\bblue\b/],
  ["red", /\bred\b/],
  ["pink", /\bpink\b/],
  ["white", /\bwhite\b/],
  ["yellow", /\byellow\b/],
];

function glassColourKey(product) {
  const specs = product?.specs || {};
  const savedColour = specs["Glass Colour"] || specs["Glass Color"] || specs.Colour || specs.Color || "";
  const searchable = normalized(`${savedColour} ${product?.name || ""}`).replace(/[^a-z0-9]+/g, " ");
  return GLASS_COLOUR_PATTERNS.find(([, pattern]) => pattern.test(searchable))?.[0] || "";
}

function meaningfulSpec(value) {
  const text = String(value ?? "").trim();
  return /^(?:|n\/?a|unknown|none|null|-|—)$/i.test(text) ? "" : text;
}

function firstSpec(product, keys) {
  for (const key of keys) {
    const value = meaningfulSpec(product?.specs?.[key]);
    if (value) return value;
  }
  return "";
}

function matchingPieceDetails(product) {
  const glassColour = firstSpec(product, ["Glass Colour", "Glass Color", "Colour", "Color"]);
  const lights = firstSpec(product, ["Number of Lights", "Lights", "Light Count"]);
  const directSize = firstSpec(product, ["Dimensions", "Size"]);
  const height = firstSpec(product, ["Height"]);
  const width = firstSpec(product, ["Width"]);
  const diameter = firstSpec(product, ["Diameter"]);
  const size = directSize || [height && `H ${height}`, width && `W ${width}`, diameter && `Dia ${diameter}`].filter(Boolean).join(" · ");
  const finish = firstSpec(product, ["Metal Finish", "Finish"]);
  return [
    glassColour && { label: "Glass", value: glassColour },
    lights && { label: "Lights", value: lights },
    size && { label: "Size", value: size },
    finish && { label: "Finish", value: finish },
  ].filter(Boolean);
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

function closestCategoryProduct(items, axes, currentIndex, wantedCategory) {
  const candidates = items.map((item, index) => ({ item, index }))
    .filter(({ item }) => normalized(item.category) === normalized(wantedCategory));
  if (!candidates.length) return null;
  const currentColour = glassColourKey(items[currentIndex]);
  return candidates.sort((a, b) => {
    const score = ({ item, index }) => axes.reduce((total, axis) => (
      total + (normalized(axis.values[index]) === normalized(axis.values[currentIndex]) ? 1 : 0)
    ), currentColour && glassColourKey(item) === currentColour ? 100 : 0);
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
  const approvedAxes = Array.isArray(data.family?.axes) ? data.family.axes : [];
  const allAxes = useMemo(() => {
    const detected = variantAxes(items);
    return approvedAxes.length ? detected.filter((axis) => approvedAxes.includes(axis.key)) : detected;
  }, [items, approvedAxes]);
  useEffect(() => {
    if (items.length < 2 || typeof window === "undefined" || window.location.hash !== "#matching-pieces") return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("matching-pieces")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [items.length, product?.id]);
  const currentIndex = items.findIndex((item) => item.id === product?.id);
  if (!data.family || items.length < 2 || currentIndex < 0) return null;

  const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean)));
  const sameCategoryItems = items.filter((item) => normalized(item.category) === normalized(product.category));
  const sameCategoryAxes = variantAxes(sameCategoryItems)
    .filter((axis) => axis.key !== "product_type" && axis.key !== "use")
    .filter((axis) => !approvedAxes.length || approvedAxes.includes(axis.key));
  const sameCategoryCurrentIndex = sameCategoryItems.findIndex((item) => item.id === product?.id);
  const permitsMatchingTypes = approvedAxes.includes("use") || approvedAxes.includes("product_type");
  const matchingCategories = permitsMatchingTypes
    ? categories.filter((category) => normalized(category) !== normalized(product.category))
    : [];

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

      {matchingCategories.length > 0 && (
        <div id="matching-pieces" data-testid="matching-pieces" className="mt-5 border-t border-white/10 pt-5 scroll-mt-40">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#D4AF37]">Matching pieces</div>
          <p className="text-xs text-white/45 mt-1">The same approved design is also available in these product types.</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matchingCategories.map((category) => {
              const target = closestCategoryProduct(items, allAxes.filter((axis) => axis.key !== "use" && axis.key !== "product_type"), currentIndex, category);
              if (!target) return null;
              const image = target.images?.[0] ? api.resolveImage(target.images[0]) : "";
              const details = matchingPieceDetails(target);
              return <Link key={category} to={productPath(target)} data-testid={`matching-piece-${normalized(category).replace(/[^a-z0-9]+/g, "-")}`} className="group block border border-white/15 hover:border-[#D4AF37] p-3.5 transition-colors">
                <span className="grid grid-cols-[88px_1fr] sm:grid-cols-[104px_1fr] gap-4 items-start">
                  <span className="w-[88px] h-[104px] sm:w-[104px] sm:h-[124px] bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">{image ? <img src={image} alt={`${target.name} — ${target.sku}`} loading="lazy" decoding="async" className="w-full h-full object-contain" /> : <Layers3 size={22} className="text-white/20" />}</span>
                  <span className="min-w-0 self-stretch flex flex-col">
                    <span className="block text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]">Matching {category}</span>
                    <span className="block font-serif text-base leading-snug text-white mt-1.5">{target.name}</span>
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-white/40 mt-1.5">{target.sku}</span>
                    {details.length > 0 && <span className="flex flex-wrap gap-1.5 mt-3">{details.map((detail) => <span key={detail.label} className="border border-white/10 bg-black/20 px-2 py-1 text-[9px] leading-tight text-white/60"><span className="text-white/35">{detail.label}</span> · {detail.value}</span>)}</span>}
                  </span>
                </span>
                <span className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]">
                  View matching {category}
                  <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>;
            })}
          </div>
        </div>
      )}

      {sameCategoryAxes.length > 0 ? (
        <div className="mt-5 space-y-4">
          {sameCategoryAxes.map((axis, axisIndex) => {
            const values = Array.from(new Map(axis.values.filter(Boolean).map((value) => [normalized(value), value])).values());
            return (
              <div key={axis.key}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2">{axis.label}</div>
                <div className="flex flex-wrap gap-2">
                  {values.map((value) => {
                    const selected = normalized(axis.values[sameCategoryCurrentIndex]) === normalized(value);
                    const target = closestProduct(sameCategoryItems, sameCategoryAxes, sameCategoryCurrentIndex, axisIndex, value);
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
      ) : sameCategoryItems.length > 1 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {sameCategoryItems.map((item) => item.id === product.id ? (
            <span key={item.id} className="border border-[#D4AF37] bg-[#D4AF37] text-black px-3 py-2 text-xs">{item.sku}</span>
          ) : (
            <Link key={item.id} to={productPath(item)} className="border border-white/20 hover:border-[#D4AF37] px-3 py-2 text-xs">{item.sku}</Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
