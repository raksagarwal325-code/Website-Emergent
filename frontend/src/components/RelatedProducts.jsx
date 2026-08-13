import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { api } from "../lib/api";

const GENERIC_NAME_TOKENS = new Set([
  "and", "the", "with", "for", "from", "floor", "table", "wall", "hanging",
  "light", "lights", "lamp", "lamps", "chandelier", "chandeliers", "glass",
  "crystal", "lighting", "single", "double", "triple", "two", "three", "four",
  "five", "six", "seven", "eight", "nine", "ten",
]);

const RELEVANT_SPEC_KEYS = [
  "Material",
  "Glass",
  "Crystal",
  "Finish",
  "Lights",
  "Number of Lights",
  "Holder",
  "Wattage",
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function nameTokens(name) {
  return new Set(
    (normalizeText(name).match(/[a-z0-9]+/g) || [])
      .filter((token) => token.length > 2 && !GENERIC_NAME_TOKENS.has(token))
  );
}

function normalizedSet(values) {
  return new Set((values || []).map(normalizeText).filter(Boolean));
}

function overlapCount(a, b) {
  let count = 0;
  for (const value of a) {
    if (b.has(value)) count += 1;
  }
  return count;
}

function usablePrice(product) {
  const value = Number(product?.price);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function scoreRelatedProduct(currentProduct, candidate) {
  if (!currentProduct || !candidate) return 0;

  let score = 0;

  // Shared curated tags are the strongest available editorial signal.
  score += overlapCount(
    normalizedSet(currentProduct.tags),
    normalizedSet(candidate.tags)
  ) * 8;

  // Product names often carry family/style terms (e.g. Rajdarbar, Tulip, Etched).
  // Generic category/material words are stripped so they do not dominate ranking.
  score += overlapCount(
    nameTokens(currentProduct.name),
    nameTokens(candidate.name)
  ) * 4;

  // Only compare populated structured fields. Missing data contributes zero.
  for (const key of RELEVANT_SPEC_KEYS) {
    const currentValue = normalizeText(currentProduct.specs?.[key]);
    const candidateValue = normalizeText(candidate.specs?.[key]);
    if (currentValue && candidateValue && currentValue === candidateValue) {
      score += 3;
    }
  }

  // Price is a soft signal only when both products have a real numeric price.
  const currentPrice = usablePrice(currentProduct);
  const candidatePrice = usablePrice(candidate);
  if (currentPrice && candidatePrice) {
    const difference = Math.abs(currentPrice - candidatePrice) / Math.max(currentPrice, candidatePrice);
    if (difference <= 0.15) score += 4;
    else if (difference <= 0.30) score += 2;
    else if (difference <= 0.50) score += 1;
  }

  return score;
}

export function selectRelatedProducts(items, currentProduct, limit = 4) {
  if (!currentProduct?.id || !currentProduct?.category) return [];
  const currentCategory = normalizeText(currentProduct.category);

  return (items || [])
    .filter((candidate) =>
      candidate?.id &&
      candidate.id !== currentProduct.id &&
      normalizeText(candidate.category) === currentCategory
    )
    .map((candidate) => ({
      candidate,
      score: scoreRelatedProduct(currentProduct, candidate),
      hasImage: Boolean((candidate.images || []).filter(Boolean).length),
    }))
    .sort((a, b) =>
      b.score - a.score ||
      Number(b.hasImage) - Number(a.hasImage) ||
      normalizeText(a.candidate.name).localeCompare(normalizeText(b.candidate.name)) ||
      String(a.candidate.id).localeCompare(String(b.candidate.id))
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
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
      .then(async (product) => {
        if (!active || !product?.category) return null;
        setCategory(product.category);
        const items = await api.listAllProducts({ category: product.category, limit: 48 });
        return { product, items };
      })
      .then((result) => {
        if (!active || !result) return;
        setProducts(selectRelatedProducts(result.items, result.product, 4));
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
          Related handcrafted pieces from our {category} collection.
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
