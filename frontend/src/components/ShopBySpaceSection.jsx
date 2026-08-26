import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { api } from "../lib/api";
import { SHOP_BY_SPACE, spaceCatalogHref, spaceTag } from "../lib/spaces";
import { editorialGroup, editorialItem, LUXURY_EASE } from "../lib/motion";

export default function ShopBySpaceSection() {
  const [covers, setCovers] = useState({});
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const sectionRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const skipEntranceMotion = prefersReducedMotion || (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const visibleSpaces = useMemo(() => SHOP_BY_SPACE.slice(0, 8), []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;
    let cancelled = false;
    const load = () => {
      api.listAllProducts({ limit: 5000 }).then((items) => {
        if (cancelled) return;
        const map = {};
        visibleSpaces.forEach((space) => {
          const tag = spaceTag(space);
          const product = (items || []).find((p) => Array.isArray(p?.tags) && p.tags.includes(tag) && p?.images?.[0]);
          if (product?.images?.[0]) map[space.slug] = api.resolveImage(product.images[0]);
        });
        setCovers(map);
        Object.values(map).forEach((src) => {
          const image = new Image();
          image.src = src;
        });
      }).catch(() => {});
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
    }, { rootMargin: "1200px 0px" });
    observer.observe(node);
    return () => { cancelled = true; observer.disconnect(); };
  }, [visibleSpaces]);

  const total = visibleSpaces.length;
  const go = (delta) => {
    setDirection(delta > 0 ? 1 : -1);
    setActive((current) => (current + delta + total) % total);
  };
  const space = visibleSpaces[active];
  const cover = covers[space.slug];

  return (
    <section ref={sectionRef} className="relative overflow-hidden border-t border-white/10 bg-[#12070d]" data-testid="shop-by-space-section">
      <div aria-hidden className="absolute inset-0 opacity-45" style={{ background: "radial-gradient(circle at 12% 12%, rgba(163,99,80,.22), transparent 40%), radial-gradient(circle at 88% 82%, rgba(212,175,55,.08), transparent 38%)" }} />
      <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-16">
        <motion.div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between" initial={skipEntranceMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={skipEntranceMotion ? undefined : editorialGroup}>
          <motion.div variants={skipEntranceMotion ? undefined : editorialItem} className="max-w-2xl">
            <div className="eyebrow mb-2">Find lighting for your setting</div>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl">Shop by <span className="italic brand-gradient-text">Space</span></h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/58 md:text-base">Each setting becomes a single changing scene instead of another grid of boxes.</p>
          </motion.div>
          <motion.div variants={skipEntranceMotion ? undefined : editorialItem} className="flex items-center gap-3">
            <Link to="/spaces" className="mr-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37] link-underline hover:text-[#E0C15D]">View all spaces <ArrowUpRight size={14} /></Link>
            <button type="button" aria-label="Previous spaces" onClick={() => go(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/70 transition hover:border-[#D4AF37]/70 hover:text-[#D4AF37]"><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Next spaces" onClick={() => go(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D4AF37]/45 bg-black/30 text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"><ChevronRight size={18} /></button>
          </motion.div>
        </motion.div>

        <motion.div initial={skipEntranceMotion ? false : { opacity: 0, y: 38, scale: .985 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: .16 }} transition={skipEntranceMotion ? { duration: 0 } : { duration: .9, ease: LUXURY_EASE }} className="grid gap-5 lg:grid-cols-[1.55fr_.75fr]">
          <motion.div drag={prefersReducedMotion ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.08} onDragEnd={(_, info) => { if (info.offset.x < -70) go(1); if (info.offset.x > 70) go(-1); }} className="relative min-h-[420px] overflow-hidden border border-white/10 bg-[#190a12] md:min-h-[480px]">
            <AnimatePresence initial={false} custom={direction} mode="sync">
              <motion.div key={space.slug} className="absolute inset-0" initial={prefersReducedMotion ? false : { opacity: 0, x: direction * 150, scale: .95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={prefersReducedMotion ? undefined : { opacity: 0, x: direction * -150, scale: .95 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: .8, ease: LUXURY_EASE }}>
                {cover ? <motion.img src={cover} alt={`${space.label} lighting`} loading="eager" className="h-full w-full object-cover" initial={prefersReducedMotion ? false : { scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.15, ease: LUXURY_EASE }} /> : <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 70% 30%,rgba(212,175,55,.08),transparent 30%),linear-gradient(135deg,#35131f,#12070d 68%)" }} />}
                <div className="absolute inset-0 bg-gradient-to-r from-[#12070d]/95 via-[#12070d]/55 to-[#12070d]/10" />
                <div className="absolute inset-x-0 bottom-0 max-w-2xl p-7 md:p-10">
                  <motion.div className="mb-3 text-[10px] uppercase tracking-[0.26em] text-[#D4AF37]" initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .12, duration: .55, ease: LUXURY_EASE }}>By space</motion.div>
                  <motion.h3 className="font-serif text-4xl leading-[.98] text-white md:text-6xl" initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18, duration: .62, ease: LUXURY_EASE }}>{space.label}</motion.h3>
                  <motion.p className="mt-4 max-w-xl text-sm leading-relaxed text-white/66 md:text-base" initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .26, duration: .62, ease: LUXURY_EASE }}>{space.description}</motion.p>
                  <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .34, duration: .55, ease: LUXURY_EASE }}><Link to={spaceCatalogHref(space)} className="mt-6 inline-flex items-center gap-2 border-b border-[#D4AF37]/50 pb-1 text-[10px] uppercase tracking-[0.22em] text-[#D4AF37]">Explore lighting <ArrowUpRight size={13} /></Link></motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {visibleSpaces.slice(1, 4).map((item, index) => {
              const itemIndex = (active + index + 1) % total;
              const next = visibleSpaces[itemIndex];
              return (
                <motion.button key={`${next.slug}-${index}`} type="button" onClick={() => { setDirection(1); setActive(itemIndex); }} className="group relative min-h-[128px] overflow-hidden border border-white/10 bg-[#190a12] p-5 text-left transition hover:border-[#D4AF37]/45 lg:min-h-0" initial={skipEntranceMotion ? false : { opacity: 0, x: 28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={skipEntranceMotion ? { duration: 0 } : { duration: .6, delay: .12 + index * .1, ease: LUXURY_EASE }} whileHover={prefersReducedMotion ? undefined : { x: 5 }}>
                  <div className="relative z-10 text-[9px] uppercase tracking-[0.23em] text-[#BF9972]">Next scene</div>
                  <div className="relative z-10 mt-3 font-serif text-xl leading-tight text-white transition group-hover:text-[#D4AF37] md:text-2xl">{next.label}</div>
                  <div className="relative z-10 mt-3 h-px w-8 bg-[#D4AF37]/35 transition-all group-hover:w-14" />
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <div className="mt-5 h-px overflow-hidden bg-white/10"><motion.div className="h-px bg-[#D4AF37]" animate={{ width: `${((active + 1) / total) * 100}%` }} transition={{ duration: .5, ease: LUXURY_EASE }} /></div>
      </div>
    </section>
  );
}