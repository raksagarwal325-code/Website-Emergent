import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api, formatProductPrice } from "../lib/api";
import { buildWaLink, productMessage } from "../lib/whatsapp";
import { productPath } from "../lib/productUrl";
import { LUXURY_EASE } from "../lib/motion";

function buildAtelierWaLink(phone, product) {
  if (!product) return null;
  const priceInfo = formatProductPrice(product);
  const priceLine = priceInfo.onRequest ? "Price: Price on request" : `Price: ${priceInfo.label ? priceInfo.label + " " : ""}${priceInfo.primary}`;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}${productPath(product)}`;
  const base = productMessage(product, link);
  return buildWaLink(phone, `${base}\n\n${priceLine}`);
}

export default function AtelierShowcase() {
  const { hp, settings } = useSettings();
  const A = hp.atelier || {};
  const rawSlides = A.images || [];
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const [products, setProducts] = useState([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    api.listAllProducts().then((rows) => { if (alive) { setProducts(rows); setProductsLoaded(true); } }).catch(() => { if (alive) setProductsLoaded(true); });
    return () => { alive = false; };
  }, []);

  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const slides = useMemo(() => rawSlides.map((s) => {
    const p = s?.product_id ? byId[s.product_id] : null;
    if (!productsLoaded && s?.product_id) return { ...s, product: null };
    return { ...s, product: p || null };
  }).filter((s) => {
    if (s?.product_id && !s.product && productsLoaded) return false;
    return !!(s.src || s.product);
  }), [rawSlides, byId, productsLoaded]);

  const [active, setActive] = useState(0);
  useEffect(() => { if (active >= slides.length) setActive(0); }, [slides.length, active]);

  if (slides.length === 0) return null;

  const current = slides[active] || slides[0];
  const activeProduct = current?.product || null;
  const activeCaption = current?.caption || activeProduct?.name || "";
  const productHref = activeProduct ? productPath(activeProduct) : null;
  const waLink = buildAtelierWaLink(settings?.whatsapp_number, activeProduct);
  const src = current?.src || activeProduct?.images?.[0];
  const go = (delta) => setActive((index) => (index + delta + slides.length) % slides.length);

  return (
    <section ref={sectionRef} data-testid="atelier-section" className="relative isolate overflow-hidden border-y border-white/10 bg-[#16070f] px-6 py-20 md:py-28">
      <div aria-hidden className="absolute inset-0 opacity-25" style={{ background: "radial-gradient(circle at 16% 30%, rgba(163,99,80,.35), transparent 40%), radial-gradient(circle at 84% 70%, rgba(212,175,55,.08), transparent 40%)" }} />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 md:grid-cols-12 md:gap-14">
        <motion.div
          className="relative min-w-0 md:col-span-7"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.85, ease: LUXURY_EASE }}
        >
          <div className="relative aspect-square max-h-[610px] overflow-hidden border border-[#D4AF37]/25 bg-black shadow-[0_34px_90px_-28px_rgba(0,0,0,.9)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${src}-${active}`}
                className="absolute inset-0 flex items-center justify-center"
                initial={prefersReducedMotion ? false : { opacity: 0, x: 24, scale: 1.025 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, x: -24, scale: 1.01 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.65, ease: LUXURY_EASE }}
              >
                {src && <img src={api.resolveImage(src)} alt={`Samrat Glass Emporium — ${activeCaption}`} className="h-full w-full object-contain p-4 md:p-7" loading={active === 0 ? "eager" : "lazy"} />}
                <div aria-hidden className="absolute inset-0 mix-blend-screen" style={{ background: "radial-gradient(circle at 50% 62%, rgba(212,175,55,.16), transparent 58%)" }} />
              </motion.div>
            </AnimatePresence>
            <div className="absolute left-5 top-5 z-10 bg-black/45 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-[#BF9972] backdrop-blur">{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</div>
            <div className="absolute bottom-4 left-5 right-5 z-10 flex items-end justify-between gap-4">
              <div className="max-w-[70%] truncate bg-black/45 px-2 py-1 text-[10px] uppercase tracking-[0.26em] text-[#BF9972] backdrop-blur">{activeCaption}</div>
              {slides.length > 1 && <div className="flex gap-2"><button type="button" aria-label="Previous atelier piece" onClick={() => go(-1)} className="flex h-11 w-11 items-center justify-center border border-white/15 bg-black/55 text-white/75 transition hover:border-[#D4AF37] hover:text-[#D4AF37]"><ChevronLeft size={18} /></button><button type="button" aria-label="Next atelier piece" onClick={() => go(1)} className="flex h-11 w-11 items-center justify-center border border-[#D4AF37]/50 bg-black/55 text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"><ChevronRight size={18} /></button></div>}
            </div>
          </div>
          {slides.length > 1 && <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5" data-testid="atelier-dots">{slides.map((_, i) => <button key={i} data-testid={`atelier-dot-${i}`} aria-label={`View slide ${i + 1}`} aria-current={i === active ? "true" : undefined} onClick={() => setActive(i)} className="flex min-h-[38px] min-w-[38px] items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]"><span aria-hidden className={`h-1.5 rounded-full transition-all ${i === active ? "w-9 bg-[#D4AF37]" : "w-4 bg-white/25 hover:bg-white/45"}`} /></button>)}</div>}
        </motion.div>

        <motion.div
          className="min-w-0 md:col-span-5"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay: 0.08, ease: LUXURY_EASE }}
        >
          <div className="eyebrow mb-3">{A.eyebrow}</div>
          <h2 className="font-serif text-4xl leading-[1.04] text-balance sm:text-5xl lg:text-5xl">{A.headline}</h2>
          <p className="mt-5 max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-white/70 lg:text-base">{A.paragraph}</p>
          <div className="mt-6 h-px bg-gradient-to-r from-[#D4AF37]/80 to-transparent" />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={activeProduct?.id || `atelier-${active}`} initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.45, ease: LUXURY_EASE }}>
              {activeProduct ? <>
                <div className="mt-6"><div className="mb-2 text-[10px] uppercase tracking-[0.28em] text-[#BF9972]">Currently featured</div><Link to={productHref} data-testid="atelier-active-product-name" className="block line-clamp-2 font-serif text-xl leading-snug text-white transition-colors hover:text-[#D4AF37] lg:text-2xl">{activeProduct.name}</Link><div className="mt-3 text-sm text-white/60">{(() => { const fp = formatProductPrice(activeProduct); return fp.onRequest ? <span className="font-serif text-base font-medium text-[#D4AF37]">Price on request</span> : <>{fp.label && <span className="mr-1 text-[10px] uppercase tracking-[0.24em] text-[#BF9972]">{fp.label}</span>}<span className="font-serif text-base text-[#D4AF37]">{fp.primary}</span></>; })()}</div></div>
                <div className="mt-5 flex flex-wrap gap-3"><Link to={productHref} data-testid="atelier-view-product" className="inline-flex items-center gap-2 bg-[#D4AF37] px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-black transition-colors hover:bg-[#B5952F]">View Product <ArrowUpRight size={14} /></Link>{waLink && <a href={waLink} target="_blank" rel="noreferrer" data-testid="atelier-inquire-wa" className="inline-flex items-center gap-2 border border-[#D4AF37]/60 px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/10"><MessageCircle size={14} /> Inquire on WhatsApp</a>}</div>
              </> : <Link to={A.cta_link || "/catalog"} className="mt-7 inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[#D4AF37] link-underline hover:text-[#B5952F]">{A.cta_text || "Discover the Collection"} <ArrowUpRight size={14} /></Link>}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
