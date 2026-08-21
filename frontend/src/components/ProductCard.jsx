import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, ArrowUpRight, Sparkles } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { useSettings } from "../context/SettingsContext";
import { api, formatProductPrice } from "../lib/api";
import { imgGuardProps, imgGuardStyle, containerGuardProps, containerGuardStyle } from "../lib/imageGuard";
import { productPath } from "../lib/productUrl";
import { toast } from "sonner";

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
        <div className="text-[10px] uppercase tracking-[0.36em] text-[#BF9972]/70">Image forthcoming</div>
        {name && <div className="mt-1 text-xs text-white/40 italic px-4 truncate">{name}</div>}
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
      {badge && (
        <div
          data-testid={`product-badge-${product.id}`}
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 border border-[#BF9972]/50 bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-[#D4AF37]"
        >
          <span className="w-1 h-1 rounded-full bg-[#D4AF37]"></span>
          {badge}
        </div>
      )}

      <button
        onClick={(e) => { e.preventDefault(); toggleFavorite(product); }}
        aria-label={fav ? "Remove favorite" : "Add favorite"}
        data-testid={`favorite-toggle-${product.id}`}
        className={`absolute top-4 right-4 z-10 h-10 w-10 rounded-full flex items-center justify-center border backdrop-blur-md transition-all ${
          fav
            ? "border-[#D4AF37]/70 bg-black/80 text-[#D4AF37]"
            : "border-white/25 bg-black/70 text-white/80 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
        }`}
      >
        <Heart size={17} fill={fav ? "#D4AF37" : "none"} strokeWidth={1.6} />
      </button>

      <Link to={productPath(product)} className="block" data-testid={`product-link-${product.id}`}>
        <div
          className="aspect-[4/5] overflow-hidden bg-[#0e0510] flex items-center justify-center relative p-4"
          {...containerGuardProps}
          style={containerGuardStyle}
        >
          {img ? (
            <img
              src={img}
              alt={product.name}
              className="product-image max-w-full max-h-full w-auto h-auto object-contain object-center opacity-95 group-hover:opacity-100"
              loading="lazy"
              {...imgGuardProps}
              style={imgGuardStyle}
            />
          ) : (
            <ProductPlaceholder name={product.name} />
          )}
          {projectCount > 0 && (
            <div
              data-testid={`product-projects-badge-${product.id}`}
              className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 border border-[#D4AF37]/40 bg-black/70 backdrop-blur-sm px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]"
              title={`Featured in ${projectCount} real installation${projectCount === 1 ? "" : "s"}`}
            >
              <Sparkles size={10} strokeWidth={1.6} />
              Featured in {projectCount} project{projectCount === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-5">
        <div className="eyebrow truncate mb-2">{product.category}</div>
        <Link to={productPath(product)} className="font-serif text-lg leading-snug text-white hover:text-[#D4AF37] transition-colors line-clamp-2 min-h-[3.5rem]">
          {product.name}
        </Link>
        <div className="flex items-baseline justify-between pt-3 min-h-[2.1rem]">
          <div className="flex items-baseline gap-2 min-w-0">
            {(() => {
              const p = formatProductPrice(product);
              if (p.onRequest) {
                return (
                  <span
                    data-testid={`product-price-${product.id}`}
                    className="text-[#D4AF37] font-serif text-base font-medium truncate"
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
                      <span className="text-[10px] uppercase tracking-[0.22em] text-[#BF9972] mr-1 font-sans not-italic">
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
            to={productPath(product)}
            data-testid={`view-btn-${product.id}`}
            className="inline-flex items-center justify-center gap-1 bg-[#D4AF37] text-black px-3 py-2.5 text-[11px] uppercase tracking-[0.16em] hover:bg-[#B5952F] transition-colors"
          >
            View <ArrowUpRight size={12} />
          </Link>
          <button
            onClick={handleAdd}
            data-testid={`quick-add-${product.id}`}
            className="inline-flex items-center justify-center gap-1 border border-[#D4AF37]/60 text-[#D4AF37] hover:bg-[#D4AF37]/10 px-3 py-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors"
          >
            <ShoppingBag size={12} /> Inquire
          </button>
        </div>
      </div>
    </div>
  );
}
