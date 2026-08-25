import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { api } from "../lib/api";
import { SHOP_BY_SPACE, spaceCatalogHref, spaceTag } from "../lib/spaces";
import { BRAND_PLACEHOLDER } from "../lib/placeholders";
import { editorialGroup, editorialItem, LUXURY_EASE } from "../lib/motion";

export default function ShopBySpaceSection() {
  const [covers, setCovers] = useState({});
  const sectionRef = useRef(null);
  const railRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;
    let cancelled = false;
    const load = () => {
      api.listAllProducts({ limit: 5000 })
        .then((items) => {
          if (cancelled) return;
          const map = {};
          SHOP_BY_SPACE.forEach((space) => {
            const tag = spaceTag(space);
            const product = (items || []).find((p) => Array.isArray(p?.tags) && p.tags.includes(tag) && p?.images?.[0]);
            if (product?.images?.[0]) map[space.slug] = api.resolveImage(product.images[0]);
          });
          setCovers(map);
        })
        .catch(() => {});
    };
    if (typeof IntersectionObserver === "undefined") {
      load();
      return () => { cancelled = true; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        load();
        observer.disconnect();
      }
    }, { rootMargin: "240px 0px" });
    observer.observe(node);
    return () => { cancelled = true; observer.disconnect(); };
  }, []);

  const visibleSpaces = useMemo(() => SHOP_BY_SPACE.slice(0, 8), []);
  const scrollRail = (direction) => {
    const rail = railRef.current;
    const card = rail?.querySelector("[data-space-card]");
    if (!rail) return;
    const amount = card ? card.getBoundingClientRect().width + 18 : rail.clientWidth * 0.72;
    rail.scrollBy({ left: direction * amount, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  return (
    <section ref={sectionRef} className="relative overflow-hidden border-t border-white/10 bg-[#12070d]" data-testid="shop-by-space-section">
      <div aria-hidden className="absolute inset-0 opacity-35" style={{ background: "radial-gradient(circle at 12% 10%, rgba(163,99,80,.22), transparent 42%), radial-gradient(circle at 88% 88%, rgba(212,175,55,.07), transparent 42%)" }} />
      <div className="relative mx-auto max-w-[1500px] px-6 py-12 md:py-14">
        <motion.div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between" initial={prefersReducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={editorialGroup}>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="max-w-2xl">
            <div className="eyebrow mb-2">Find lighting for your setting</div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl">Shop by <span className="italic brand-gradient-text">Space</span></h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/58 md:text-base">See lighting in context — rooms, entrances and hospitality settings arranged as one visual collection.</p>
          </motion.div>
          <motion.div variants={prefersReducedMotion ? undefined : editorialItem} className="flex items-center gap-3">
            <Link to="/spaces" className="mr-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37] link-underline hover:text-[#E0C15D]">View all spaces <ArrowUpRight size={14} /></Link>
            <button type="button" aria-label="Previous spaces" onClick={() => scrollRail(-1)} className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/70 transition hover:border-[#D4AF37]/70 hover:text-[#D4AF37] md:flex"><ChevronLeft size={17} /></button>
            <button type="button" aria-label="Next spaces" onClick={() => scrollRail(1)} className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-black/30 text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black md:flex"><ChevronRight size={17} /></button>
          </motion.div>
        </motion.div>

        <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.75, ease: LUXURY_EASE }} className="relative">
          <div ref={railRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-[15vw] md:gap-5 md:pr-[8vw]" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {visibleSpaces.map((space, index) => (
              <Link key={space.slug} to={spaceCatalogHref(space)} data-space-card data-testid={`space-card-${space.slug}`} className={`group relative shrink-0 snap-start overflow-hidden border border-white/10 bg-[#1a0a12] transition-all duration-500 hover:border-[#D4AF37]/55 ${index === 0 ? "w-[82vw] sm:w-[55vw] md:w-[38vw] lg:w-[31vw]" : "w-[72vw] sm:w-[44vw] md:w-[30vw] lg:w-[24vw]"}`}>
                <div className={index === 0 ? "aspect-[16/10]" : "aspect-[5/4]"}>
                  <img src={covers[space.slug] || BRAND_PLACEHOLDER} alt={`${space.label} lighting`} loading="lazy" className="h-full w-full object-cover opacity-82 scale-[1.01] transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045] group-hover:opacity-100" />
                </div>
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#12070d] via-[#12070d]/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                  <div className="mb-2 text-[9px] uppercase tracking-[0.24em] text-[#D4AF37]">By space</div>
                  <h3 className="font-serif text-2xl leading-tight text-white md:text-3xl">{space.label}</h3>
                  <p className="mt-2 line-clamp-2 max-w-md text-sm leading-relaxed text-white/60">{space.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/75 transition-colors group-hover:text-[#D4AF37]">Explore lighting <ArrowUpRight size={12} /></span>
                </div>
              </Link>
            ))}
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#12070d] to-transparent md:w-24" />
        </motion.div>
      </div>
    </section>
  );
}
