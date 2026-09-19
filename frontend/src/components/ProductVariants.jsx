import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Layers3 } from "lucide-react";
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
  const glassCut = firstSpec(product, ["Glass Cut / Design", "Glass Cut", "Glass Type", "Cut Design", "Glass Design", "Glass Pattern"]);
  const lights = firstSpec(product, ["Number of Lights", "Lights", "Light Count"]);
  const directSize = firstSpec(product, ["Dimensions", "Size"]);
  const height = firstSpec(product, ["Height"]);
  const width = firstSpec(product, ["Width"]);
  const diameter = firstSpec(product, ["Diameter"]);
  const size = directSize || [height && `H ${height}`, width && `W ${width}`, diameter && `Dia ${diameter}`].filter(Boolean).join(" · ");
  const finish = firstSpec(product, ["Metal Finish", "Finish"]);
  return [
    glassColour && { label: "Glass", value: glassColour },
    glassCut && { label: "Cut", value: glassCut },
    lights && { label: "Lights", value: lights },
    size && { label: "Size", value: size },
    finish && { label: "Finish", value: finish },
  ].filter((detail) => detail && detail.value.length <= 40);
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
  const navigate = useNavigate();
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
  const currentItem = items[currentIndex];
  const currentImage = currentItem.images?.[0] ? api.resolveImage(currentItem.images[0]) : "";
  const currentDetails = matchingPieceDetails(currentItem);
  const matchingAxes = allAxes.filter((axis) => axis.key !== "use" && axis.key !== "product_type");
  const selectClassName = "w-full appearance-none border border-white/20 bg-[#070b0a] px-3 py-3 pr-10 text-sm text-white outline-none transition-colors hover:border-[#D4AF37]/70 focus:border-[#D4AF37]";

  const openProduct = (target) => {
    if (target?.id && target.id !== product.id) navigate(productPath(target));
  };

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

      {(matchingCategories.length > 0 || sameCategoryAxes.length > 0) && (
        <div id={matchingCategories.length > 0 ? "matching-pieces" : undefined} data-testid="configuration-dropdowns" className="mt-5 border-t border-white/10 pt-5 scroll-mt-40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matchingCategories.length > 0 && (
              <label className="block">
                <span className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2">Product type</span>
                <span className="relative block">
                  <select aria-label="Product type" value={product.category} onChange={(event) => openProduct(closestCategoryProduct(items, matchingAxes, currentIndex, event.target.value))} className={selectClassName}>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
                </span>
              </label>
            )}
            {sameCategoryAxes.map((axis, axisIndex) => {
              const values = Array.from(new Map(axis.values.filter(Boolean).map((value) => [normalized(value), value])).values());
              const selectedValue = axis.values[sameCategoryCurrentIndex] || "";
              return (
                <label key={axis.key} className="block">
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2">{axis.label}</span>
                  <span className="relative block">
                    <select aria-label={axis.label} value={selectedValue} onChange={(event) => openProduct(closestProduct(sameCategoryItems, sameCategoryAxes, sameCategoryCurrentIndex, axisIndex, event.target.value))} className={selectClassName}>
                      {values.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-[72px_1fr] gap-3 border border-white/10 bg-black/15 p-3" data-testid="selected-configuration">
            <span className="w-[72px] h-[84px] bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">{currentImage ? <img src={currentImage} alt="" loading="lazy" decoding="async" className="w-full h-full object-contain" /> : <Layers3 size={20} className="text-white/20" />}</span>
            <span className="min-w-0 self-center">
              <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-[#D4AF37]"><Check size={11} /> Selected configuration</span>
              <span className="block font-serif text-sm leading-snug text-white mt-1.5">{currentItem.name}</span>
              <span className="block text-[9px] uppercase tracking-[0.14em] text-white/40 mt-1">{currentItem.sku}</span>
              {currentDetails.length > 0 && <span className="flex flex-wrap gap-x-3 gap-y-1 mt-2">{currentDetails.map((detail) => <span key={detail.label} className="text-[9px] text-white/55"><span className="text-white/30">{detail.label}</span> · {detail.value}</span>)}</span>}
            </span>
          </div>
        </div>
      )}

      {matchingCategories.length === 0 && sameCategoryAxes.length === 0 && sameCategoryItems.length > 1 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {sameCategoryItems.map((item) => item.id === product.id ? (
            <span key={item.id} className="border border-[#D4AF37] bg-[#D4AF37] text-black px-3 py-2 text-xs">{item.sku}</span>
          ) : (
            <button key={item.id} type="button" onClick={() => openProduct(item)} className="border border-white/20 hover:border-[#D4AF37] px-3 py-2 text-xs">{item.sku}</button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
