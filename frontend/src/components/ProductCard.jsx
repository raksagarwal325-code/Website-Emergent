import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { api, formatPrice } from "../lib/api";

export default function ProductCard({ product, index = 0 }) {
  const { toggleFavorite, isFavorite } = useCatalog();
  const fav = isFavorite(product.id);
  const img = api.resolveImage(product.images?.[0]);

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className="group relative border border-white/5 hover:border-white/25 bg-transparent transition-all duration-500 fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button
        onClick={(e) => { e.preventDefault(); toggleFavorite(product); }}
        aria-label={fav ? "Remove favorite" : "Add favorite"}
        data-testid={`favorite-toggle-${product.id}`}
        className={`absolute top-4 right-4 z-10 h-9 w-9 flex items-center justify-center border border-white/10 backdrop-blur bg-black/40 transition-colors ${fav ? "text-[#D4AF37]" : "text-white/60 hover:text-white"}`}
      >
        <Heart size={16} fill={fav ? "#D4AF37" : "none"} strokeWidth={1.5} />
      </button>

      <Link to={`/product/${product.id}`} className="block">
        <div className="aspect-[4/5] overflow-hidden bg-[#0a0a0a]">
          {img ? (
            <img src={img} alt={product.name} className="product-image w-full h-full object-cover opacity-90 group-hover:opacity-100" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30 text-xs uppercase tracking-widest">No image</div>
          )}
        </div>
        <div className="p-5 space-y-2">
          <div className="eyebrow">{product.category}</div>
          <div className="font-serif text-xl leading-snug">{product.name}</div>
          <div className="flex items-baseline justify-between pt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-white">{formatPrice(product.price)}</span>
              {product.compare_at_price && (
                <span className="text-white/40 line-through text-sm">{formatPrice(product.compare_at_price)}</span>
              )}
            </div>
            {product.rating > 0 && (
              <span className="text-xs text-white/50">★ {product.rating.toFixed(1)}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
