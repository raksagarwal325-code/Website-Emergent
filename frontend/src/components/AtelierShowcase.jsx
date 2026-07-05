import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api, formatProductPrice } from "../lib/api";

const INQUIRY_LEAD = "Hi Rakshit ji, I am interested in this product. Please share details.";

function buildWaLink(phone, product) {
  const raw = (phone || "").replace(/\D/g, "");
  if (!raw || !product) return null;
  const priceInfo = formatProductPrice(product);
  const priceLine = priceInfo.onRequest
    ? "Price: Price on request"
    : `Price: ${priceInfo.label ? priceInfo.label + " " : ""}${priceInfo.primary}`;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/product/${product.id}`;
  const msg = [
    INQUIRY_LEAD,
    "",
    `• Product: ${product.name}`,
    `• Reference Code: ${product.sku}`,
    `• ${priceLine}`,
    `• Link: ${link}`,
  ].join("\n");
  return `https://wa.me/${raw}?text=${encodeURIComponent(msg)}`;
}

export default function AtelierShowcase() {
  const { hp, settings } = useSettings();
  const A = hp.atelier || {};
  const rawSlides = A.images || [];

  const [products, setProducts] = useState([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    api.listProducts()
      .then((rows) => { if (alive) { setProducts(rows); setProductsLoaded(true); } })
      .catch(() => { if (alive) setProductsLoaded(true); });
    return () => { alive = false; };
  }, []);

  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  // Filter rules (from spec):
  //   - Slide with `product_id` set → keep only if that product still exists.
  //   - Slide without `product_id` → keep as informational (no CTA row) — until products load, keep everything.
  const slides = useMemo(() => {
    return rawSlides
      .map((s) => {
        const p = s?.product_id ? byId[s.product_id] : null;
        // If products haven't loaded yet, don't drop anything — otherwise the
        // section flashes empty for a beat while catalog fetch is in flight.
        if (!productsLoaded && s?.product_id) return { ...s, product: null };
        return { ...s, product: p || null };
      })
      .filter((s) => {
        // Require either an image, a linked product, or (if unlinked) a caption.
        if (s?.product_id && !s.product && productsLoaded) return false;
        return !!(s.src || s.product);
      });
  }, [rawSlides, byId, productsLoaded]);

  const [active, setActive] = useState(0);
  useEffect(() => { if (active >= slides.length) setActive(0); }, [slides.length, active]);
  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const current = slides[active] || slides[0];
  const activeProduct = current?.product || null;
  const activeCaption = current?.caption || activeProduct?.name || "";
  const activeImg = current?.src || activeProduct?.images?.[0] || "";
  const productHref = activeProduct ? `/product/${activeProduct.id}` : null;
  const waLink = buildWaLink(settings?.whatsapp_number, activeProduct);

  const HeroWrap = productHref ? Link : "div";
  const heroWrapProps = productHref
    ? { to: productHref, "aria-label": `View ${activeProduct.name}` }
    : {};

  return (
    <section data-testid="atelier-section" className="max-w-7xl mx-auto px-6 py-16 md:py-20">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        {/* Cross-fade showcase */}
        <div className="md:col-span-7">
          <HeroWrap
            {...heroWrapProps}
            data-testid="atelier-hero-frame"
            className={`relative block w-full bg-black border border-[#D4AF37]/25 overflow-hidden ${productHref ? "cursor-pointer group" : ""}`}
            style={{
              aspectRatio: "1 / 1",
              maxHeight: "560px",
              boxShadow: "0 0 0 1px rgba(191,153,114,0.15), 0 24px 60px -12px rgba(0,0,0,0.7), 0 0 80px -20px rgba(212,175,55,0.25)",
            }}
          >
            {slides.map((s, i) => {
              const src = s.src || s.product?.images?.[0];
              if (!src) return null;
              return (
                <img
                  key={`${src}-${i}`}
                  src={api.resolveImage(src)}
                  alt={`Samrat Glass Emporium — ${s.caption || s.product?.name || ""}`}
                  className={`absolute inset-0 w-full h-full object-contain transition-all duration-1000 ${productHref && i === active ? "group-hover:scale-[1.02]" : ""}`}
                  style={{ opacity: i === active ? 1 : 0 }}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              );
            })}

            {/* Warm gold ambient glow */}
            <div className="absolute inset-0 pointer-events-none mix-blend-screen"
              style={{ background: "radial-gradient(circle at 50% 60%, rgba(212,175,55,0.16), transparent 55%)" }} />
            <div className="absolute inset-x-6 top-4 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
            <div className="absolute inset-x-6 bottom-4 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

            {/* Caption chip + progress dots */}
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4 pointer-events-none">
              <div className="text-[10px] uppercase tracking-[0.28em] text-[#BF9972]/90 backdrop-blur bg-black/40 px-2 py-1 max-w-[70%] truncate">
                {activeCaption}
              </div>
              <div className="flex gap-1.5 pointer-events-auto">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    data-testid={`atelier-dot-${i}`}
                    aria-label={`View slide ${i + 1}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActive(i); }}
                    className={`h-1.5 transition-all ${i === active ? "w-6 bg-[#D4AF37]" : "w-1.5 bg-white/25 hover:bg-white/50"}`}
                  />
                ))}
              </div>
            </div>
          </HeroWrap>

          {/* Mini showcase strip */}
          {slides.length > 1 && (
            <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${slides.length}, minmax(0, 1fr))` }}>
              {slides.map((s, i) => {
                const thumbSrc = s.src || s.product?.images?.[0];
                return (
                  <button
                    key={`${thumbSrc}-${i}`}
                    data-testid={`atelier-thumb-${i}`}
                    onClick={() => setActive(i)}
                    aria-label={`Show ${s.caption || s.product?.name || `slide ${i + 1}`}`}
                    className={`relative aspect-square bg-black overflow-hidden border transition-all ${i === active ? "border-[#D4AF37]" : "border-white/10 hover:border-[#BF9972]/60"}`}
                  >
                    {thumbSrc && (
                      <img src={api.resolveImage(thumbSrc)} alt="" className="absolute inset-0 w-full h-full object-contain opacity-90" loading="lazy" />
                    )}
                    {i === active && <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 20px rgba(212,175,55,0.35)" }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Copy + CTAs */}
        <div className="md:col-span-5">
          <div className="eyebrow mb-3">{A.eyebrow}</div>
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight">{A.headline}</h2>
          <p className="mt-6 text-white/70 leading-relaxed whitespace-pre-wrap">{A.paragraph}</p>

          {activeProduct ? (
            <>
              {/* Currently featured product name — updates as the slider advances */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="text-[10px] uppercase tracking-[0.28em] text-[#BF9972] mb-2">Currently featured</div>
                <Link
                  to={productHref}
                  data-testid="atelier-active-product-name"
                  className="font-serif text-xl text-white hover:text-[#D4AF37] transition-colors leading-snug block"
                >
                  {activeProduct.name}
                </Link>
                <div className="mt-3 text-sm text-white/60">
                  {(() => {
                    const fp = formatProductPrice(activeProduct);
                    if (fp.onRequest) return <span className="italic text-[#BF9972]">Price on request</span>;
                    return (
                      <>
                        {fp.label && <span className="text-[10px] uppercase tracking-[0.24em] text-[#BF9972] mr-1">{fp.label}</span>}
                        <span className="text-[#D4AF37] font-serif text-base">{fp.primary}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={productHref}
                  data-testid="atelier-view-product"
                  className="inline-flex items-center gap-2 bg-[#D4AF37] text-black hover:bg-[#B5952F] px-6 py-3 uppercase text-xs tracking-[0.28em]"
                >
                  View Product <ArrowUpRight size={14} />
                </Link>
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="atelier-inquire-wa"
                    className="inline-flex items-center gap-2 border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-black px-6 py-3 uppercase text-xs tracking-[0.28em] transition-colors"
                  >
                    <MessageCircle size={14} /> Inquire on WhatsApp
                  </a>
                )}
              </div>
            </>
          ) : (
            <Link to={A.cta_link || "/catalog"} className="mt-8 inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#B5952F] text-xs uppercase tracking-[0.28em] link-underline">
              {A.cta_text || "Discover the Collection"} <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
