import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, ArrowUpRight, Sparkles, Sun, Moon } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { useSettings } from "../context/SettingsContext";
import { api, formatProductPrice } from "../lib/api";
import { imgGuardProps, imgGuardStyle, containerGuardProps, containerGuardStyle } from "../lib/imageGuard";
import { applyImageFrameColor } from "../lib/imageFrame";
import { productPath } from "../lib/productUrl";
import {
  CATALOGUE_LIGHT_MODE_EVENT,
  getCatalogueLightImages,
  readCatalogueLightMode,
  writeCatalogueLightMode,
} from "../lib/catalogueLighting";
import { toast } from "sonner";

function ProductPlaceholder({ name }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#0a0510] overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 40%, rgba(212,175,55,0.35), transparent 60%)" }} />
      <span aria-hidden="true" className="font-serif italic text-[#D4AF37]/12 select-none" style={{ fontSize: "12rem", lineHeight: 1, letterSpacing: "-0.06em" }}>S</span>
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
  const navigate = useNavigate();
  const fav = isFavorite(product.id);
  const [lightMode, setLightMode] = useState(readCatalogueLightMode);
  const lightImages = useMemo(() => getCatalogueLightImages(product), [product]);
  const selectedImage = lightMode === "on" ? lightImages.on : lightImages.off;
  const img = api.resolveImage(selectedImage);
  const [mediaAspect, setMediaAspect] = useState(4 / 5);

  useEffect(() => {
    const syncMode = (event) => setLightMode(event?.detail === "on" ? "on" : "off");
    window.addEventListener(CATALOGUE_LIGHT_MODE_EVENT, syncMode);
    return () => window.removeEventListener(CATALOGUE_LIGHT_MODE_EVENT, syncMode);
  }, []);

  const projectCount = useMemo(() => {
    const items = hp?.gallery?.items || [];
    return items.reduce((n, it) => n + ((it.products || []).includes(product.id) ? 1 : 0), 0);
  }, [hp, product.id]);

  const handleImageLoad = (event) => {
    const naturalWidth = event.currentTarget?.naturalWidth || 0;
    const naturalHeight = event.currentTarget?.naturalHeight || 0;
    if (!naturalWidth || !naturalHeight) return;
    const sourceAspect = naturalWidth / naturalHeight;
    const controlledAspect = Math.min(1.15, Math.max(0.68, sourceAspect));
    setMediaAspect((current) => Math.abs(current - controlledAspect) > 0.01 ? controlledAspect : current);
    applyImageFrameColor(event.currentTarget, event.currentTarget.parentElement);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} added to inquiry`, {
      duration: 5000,
      action: { label: "View basket", onClick: () => navigate("/cart") },
    });
  };

  const badge = (product.badge || "").trim();

  const card = (
    <div data-testid={`product-card-${product.id}`} className="group relative flex flex-col border border-white/8 hover:border-[#D4AF37]/50 bg-[#1a0a17]/60 transition-all duration-500 fade-up h-full" style={{ animationDelay: `${index * 60}ms` }}>
      {badge && <div data-testid={`product-badge-${product.id}`} className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 inline-flex items-center gap-1 border border-[#BF9972]/50 bg-black/60 backdrop-blur-sm px-2 py-1 text-[8px] sm:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[#D4AF37]"><span className="w-1 h-1 rounded-full bg-[#D4AF37]"></span>{badge}</div>}
      <button onClick={(e) => { e.preventDefault(); toggleFavorite(product); }} aria-label={fav ? "Remove favorite" : "Add favorite"} data-testid={`favorite-toggle-${product.id}`} className={`absolute top-2 right-2 sm:top-4 sm:right-4 z-10 h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center border backdrop-blur-md transition-all ${fav ? "border-[#D4AF37]/70 bg-black/80 text-[#D4AF37]" : "border-white/25 bg-black/70 text-white/80 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"}`}>
        <Heart size={15} className="sm:hidden" fill={fav ? "#D4AF37" : "none"} strokeWidth={1.6} />
        <Heart size={17} className="hidden sm:block" fill={fav ? "#D4AF37" : "none"} strokeWidth={1.6} />
      </button>
      <Link to={productPath(product)} className="block" data-testid={`product-link-${product.id}`}>
        <div className="overflow-hidden bg-[#0e0510] flex items-center justify-center relative transition-[aspect-ratio] duration-500" {...containerGuardProps} style={{ ...containerGuardStyle, aspectRatio: mediaAspect }}>
          {img ? <img src={img} alt={product.name} className="product-image block h-full w-full object-contain object-center p-1.5 opacity-95 group-hover:opacity-100 sm:p-3" loading="lazy" onLoad={handleImageLoad} {...imgGuardProps} style={imgGuardStyle} /> : <ProductPlaceholder name={product.name} />}
          {projectCount > 0 && <div data-testid={`product-projects-badge-${product.id}`} className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 inline-flex items-center gap-1 border border-[#D4AF37]/40 bg-black/70 backdrop-blur-sm px-2 py-1 text-[8px] sm:text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.2em] text-[#D4AF37]" title={`Featured in ${projectCount} real installation${projectCount === 1 ? "" : "s"}`}><Sparkles size={9} strokeWidth={1.6} /><span className="hidden sm:inline">Featured in </span>{projectCount} project{projectCount === 1 ? "" : "s"}</div>}
        </div>
      </Link>
      <div className="flex flex-col flex-1 p-3 sm:p-5">
        <div className="eyebrow truncate mb-1.5 sm:mb-2 text-[9px] sm:text-[10px]">{product.category}</div>
        <Link to={productPath(product)} className="font-serif text-[15px] sm:text-lg leading-snug text-white hover:text-[#D4AF37] transition-colors min-h-[3.9rem] sm:min-h-[3.5rem] break-words line-clamp-3 sm:line-clamp-none">{product.name}</Link>
        <div className="flex items-baseline justify-between pt-2 sm:pt-3 min-h-[2rem] sm:min-h-[2.1rem]">
          <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0">{(() => {
            const p = formatProductPrice(product);
            if (p.onRequest) return <span data-testid={`product-price-${product.id}`} className="text-[#D4AF37] font-serif text-[13px] sm:text-base font-medium truncate">Price on request</span>;
            return <><span data-testid={`product-price-${product.id}`} className="text-[#D4AF37] font-serif text-[15px] sm:text-lg truncate">{p.label && <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[#BF9972] mr-1 font-sans not-italic">{p.label}</span>}{p.primary}</span>{p.compareAt && <span data-testid={`product-mrp-${product.id}`} className="hidden sm:inline text-white/40 line-through text-xs flex-shrink-0">{p.compareAt}</span>}</>;
          })()}</div>
        </div>
        <div className="pt-2.5 sm:pt-3 mt-auto grid grid-cols-2 gap-1.5 sm:gap-2">
          <Link to={productPath(product)} data-testid={`view-btn-${product.id}`} className="inline-flex items-center justify-center gap-1 bg-[#D4AF37] text-black px-2 sm:px-3 py-2.5 text-[9px] sm:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.16em] hover:bg-[#B5952F] transition-colors">View <ArrowUpRight size={10} className="sm:hidden" /><ArrowUpRight size={12} className="hidden sm:block" /></Link>
          <button onClick={handleAdd} data-testid={`quick-add-${product.id}`} className="inline-flex items-center justify-center gap-1 border border-[#D4AF37]/60 text-[#D4AF37] hover:bg-[#D4AF37]/10 px-2 sm:px-3 py-2.5 text-[9px] sm:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.16em] transition-colors"><ShoppingBag size={10} className="sm:hidden" /><ShoppingBag size={12} className="hidden sm:block" /> Inquire</button>
        </div>
      </div>
    </div>
  );

  if (index !== 0) return card;

  return (
    <>
      <div className="col-span-full mb-1 flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-[#11070e]/70 p-3 no-print sm:p-4" data-testid="catalogue-light-toggle-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.26em] text-[#BF9972]">Lighting preview</div>
          <div className="mt-1 text-xs text-white/45">Compare the same piece unlit or illuminated.</div>
        </div>
        <div className="inline-flex border border-white/15 bg-black/30 p-1" role="group" aria-label="Catalogue lighting preview">
          <button
            type="button"
            data-testid="catalogue-lights-off"
            aria-pressed={lightMode === "off"}
            onClick={() => setLightMode(writeCatalogueLightMode("off"))}
            className={`inline-flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors ${lightMode === "off" ? "bg-[#D4AF37] text-black" : "text-white/65 hover:text-white"}`}
          >
            <Sun size={13} /> Lights Off
          </button>
          <button
            type="button"
            data-testid="catalogue-lights-on"
            aria-pressed={lightMode === "on"}
            onClick={() => setLightMode(writeCatalogueLightMode("on"))}
            className={`inline-flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors ${lightMode === "on" ? "bg-[#D4AF37] text-black" : "text-white/65 hover:text-white"}`}
          >
            <Moon size={13} /> Lights On
          </button>
        </div>
      </div>
      {card}
    </>
  );
}
