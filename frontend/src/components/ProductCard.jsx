import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, ArrowUpRight, Sparkles } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { useSettings } from "../context/SettingsContext";
import { api, formatPrice, formatProductPrice } from "../lib/api";
import { toast } from "sonner";

// Elegant fallback: a subtle gold "S" monogram on solid black
function ProductPlaceholder({ name }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#0a0510] overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 40%, rgba(212,175,55,0.35), transparent 60%)" }}
      />
      <span
        aria-hidden="true"
        className="font-serif italic text-[#D4AF37]/12 select-none"
        style={{ fontSize: "12rem", lineHeight: 1, letterSpacing: "-0.06em" }}
      >
        S
      </span>
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <div className="text-[9px] uppercase tracking-[0.42em] text-[#BF9972]/70">Image forthcoming</div>
        {name && <div className="mt-1 text-[10px] text-white/40 italic px-4 truncate">{name}</div>}
      </div>
    </div>
  );
}

export default function ProductCard({ product, index = 0 }) {
  const { toggleFavorite, isFavorite, addToCart } = useCatalog();
  const { hp } = useSettings();
  const fav = isFavorite(product.id);
  const img = api.resolveImage(product.images?.[0]);

  const projectCount = useMemo(() => {
    const items = hp?.gallery?.items || [];
    return items.reduce(
      (n, it) => n + ((it.products || []).includes(product.id) ? 1 : 0),
      0
    );
  }, [hp, product.id]);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} added to inquiry`);
  };

  const badge = (product.badge || "").trim();

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className="group relative flex flex-col border border-white/8 hover:border-[#D4AF37]/50 bg-[#1a0a17]/60 transition-all duration-500 fade-up h-full"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Signature badge (top-left, over the image) */}
      {badge && (
        <div
          data-testid={`product-badge-${product.id}`}
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 border border-[#BF9972]/50 bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[9px] uppercase tracking-[0.24em] text-[#D4AF37]"
        >
          <span className="w-1 h-1 rounded-full bg-[#D4AF37]"></span>
          {badge}
        </div>
      )}

      <button
        onClick={(e) => { e.preventDefault(); toggleFavorite(product); }}
        aria-label={fav ? "Remove favorite" : "Add favorite"}
        data-testid={`favorite-toggle-${product.id}`}
        className={`absolute top-4 right-4 z-10 h-9 w-9 flex items-center justify-center border border-white/10 backdrop-blur bg-black/50 transition-colors ${fav ? "text-[#D4AF37]" : "text-white/60 hover:text-white"}`}
      >
        <Heart size={15} fill={fav ? "#D4AF37" : "none"} strokeWidth={1.5} />
      </button>

      <Link to={`/product/${product.id}`} className="block" data-testid={`product-link-${product.id}`}>
        <div className="aspect-[4/5] overflow-hidden bg-[#0e0510] flex items-center justify-center relative">
          {img ? (
            <img src={img} alt={product.name} className="product-image w-full h-full object-cover opacity-95 group-hover:opacity-100" loading="lazy" />
          ) : (
            <ProductPlaceholder name={product.name} />
          )}
          {projectCount > 0 && (
            <div
              data-testid={`product-projects-badge-${product.id}`}
              className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 border border-[#D4AF37]/40 bg-black/70 backdrop-blur-sm px-2.5 py-1 text-[9px] uppercase tracking-[0.22em] text-[#D4AF37]"
              title={`Featured in ${projectCount} real installation${projectCount === 1 ? "" : "s"}`}
            >
              <Sparkles size={10} strokeWidth={1.6} />
              Featured in {projectCount} project{projectCount === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-5 space-y-2">
        <div className="eyebrow truncate">{product.category}</div>
        <Link to={`/product/${product.id}`} className="font-serif text-lg leading-snug text-white hover:text-[#D4AF37] transition-colors line-clamp-2 min-h-[3.5rem]">
          {product.name}
        </Link>
        <div className="text-[10px] uppercase tracking-widest text-white/40">SKU · {product.sku}</div>
        <div className="flex items-baseline justify-between pt-1">
          <div className="flex items-baseline gap-2 min-w-0">
            {(() => {
              const p = formatProductPrice(product);
              if (p.onRequest) {
                return (
                  <span
                    data-testid={`product-price-${product.id}`}
                    className="text-[#D4AF37] font-serif text-base italic truncate"
                  >
                    Price on request
                  </span>
                );
              }
              return (
                <>
                  <span
                    data-testid={`product-price-${product.id}`}
                    className="text-[#D4AF37] font-serif text-lg truncate"
                  >
                    {p.label && (
                      <span className="text-[10px] uppercase tracking-[0.24em] text-[#BF9972] mr-1 font-sans not-italic">
                        {p.label}
                      </span>
                    )}
                    {p.primary}
                  </span>
                  {p.compareAt && (
                    <span
                      data-testid={`product-mrp-${product.id}`}
                      className="text-white/40 line-through text-xs flex-shrink-0"
                    >
                      {p.compareAt}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        </div>
        <div className="pt-3 mt-auto grid grid-cols-2 gap-2">
          <Link
            to={`/product/${product.id}`}
            data-testid={`view-btn-${product.id}`}
            className="inline-flex items-center justify-center gap-1 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 px-2 py-2.5 text-[10px] uppercase tracking-[0.16em] transition-colors"
          >
            View <ArrowUpRight size={11} />
          </Link>
          <button
            onClick={handleAdd}
            data-testid={`quick-add-${product.id}`}
            className="inline-flex items-center justify-center gap-1 bg-[#D4AF37] text-black px-2 py-2.5 text-[10px] uppercase tracking-[0.16em] hover:bg-[#B5952F] transition-colors"
          >
            <ShoppingBag size={11} /> Inquire
          </button>
        </div>
      </div>
    </div>
  );
}
