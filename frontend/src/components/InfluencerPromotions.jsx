import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Instagram } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { InfluencerCard, isDisplayable } from "./InfluencerCard";

const AUTOPLAY_MS = 5000;

// Match Tailwind sm (640) / lg (1024).  Kept explicit here so the carousel's
// slide arithmetic stays perfectly in sync with the card widths CSS.
function useVisibleCount() {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const tablet = window.matchMedia("(min-width: 640px)");
    const update = () => setN(desktop.matches ? 3 : tablet.matches ? 2 : 1);
    update();
    desktop.addEventListener("change", update);
    tablet.addEventListener("change", update);
    return () => {
      desktop.removeEventListener("change", update);
      tablet.removeEventListener("change", update);
    };
  }, []);
  return n;
}

export default function InfluencerPromotions() {
  const { hp } = useSettings();
  const P = hp?.influencer_promotions || {};

  const validItems = (P.items || []).filter(isDisplayable);

  // Lazy-load products (only when at least one item links to catalog).
  const [products, setProducts] = useState([]);
  const needsProducts = validItems.some((it) => (it?.product_id || "").trim());
  useEffect(() => {
    if (!needsProducts) return undefined;
    let alive = true;
    api.listProducts()
      .then((rows) => { if (alive) setProducts(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, [needsProducts]);
  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );

  // Carousel state ---------------------------------------------------------
  const visible = useVisibleCount();
  const total = validItems.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  // Reset active when items or breakpoint change so we never go OOB.
  useEffect(() => {
    setActive(0);
  }, [total, visible]);

  const goTo = useCallback(
    (idx) => {
      if (total === 0) return;
      const wrapped = ((idx % total) + total) % total;
      setActive(wrapped);
    },
    [total],
  );
  const next = useCallback(() => goTo(active + 1), [goTo, active]);
  const prev = useCallback(() => goTo(active - 1), [goTo, active]);

  // Autoplay
  useEffect(() => {
    if (paused || total <= visible) return undefined;
    const t = setInterval(() => setActive((i) => (i + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, total, visible]);

  // Pause when the tab isn't visible — polite battery-wise.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (P.enabled === false) return null;
  if (validItems.length === 0) return null;

  const titlePre = (P.title_pre || "").trim();
  const titleHi = (P.title_highlight || "").trim();
  const showControls = total > visible;
  // Track width is a percentage: 100% of the viewport shows `visible` cards,
  // so each card takes 100/visible%. The full track is 100 * (total / visible)%.
  const cardWidthPct = 100 / visible;
  const trackWidthPct = (100 * total) / visible;
  const translatePct = active * cardWidthPct;

  return (
    <section
      data-testid="influencer-promotions-section"
      className="border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        {/* Header */}
        <motion.div
          className="text-center mb-8 md:mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {P.eyebrow && <div className="eyebrow mb-3">{P.eyebrow}</div>}
          {(titlePre || titleHi) && (
            <h2
              data-testid="influencer-promotions-title"
              className="font-serif text-3xl sm:text-4xl md:text-5xl leading-[1.1]"
            >
              {titlePre}
              {titlePre && titleHi ? " " : ""}
              {titleHi && (
                <span className="italic brand-gradient-text">{titleHi}</span>
              )}
            </h2>
          )}
          {P.subtitle && (
            <p className="mt-3 md:mt-4 text-white/60 max-w-2xl mx-auto leading-relaxed text-sm md:text-base">
              {P.subtitle}
            </p>
          )}
        </motion.div>

        {/* Carousel */}
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Arrows — only when there are enough slides to justify them */}
          {showControls && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous"
                data-testid="influencer-carousel-prev"
                className="hidden md:flex absolute left-[-8px] lg:left-[-24px] top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full transition-all"
                style={{
                  background: "linear-gradient(180deg, #3a1226 0%, #2a1125 100%)",
                  border: "1px solid rgba(212,175,55,0.55)",
                  color: "#D4AF37",
                  boxShadow: "0 10px 24px -12px rgba(0,0,0,0.7)",
                }}
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next"
                data-testid="influencer-carousel-next"
                className="hidden md:flex absolute right-[-8px] lg:right-[-24px] top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full transition-all"
                style={{
                  background: "linear-gradient(180deg, #3a1226 0%, #2a1125 100%)",
                  border: "1px solid rgba(212,175,55,0.55)",
                  color: "#D4AF37",
                  boxShadow: "0 10px 24px -12px rgba(0,0,0,0.7)",
                }}
              >
                <ChevronRight size={20} strokeWidth={2} />
              </button>
            </>
          )}

          <div
            className="overflow-hidden"
            data-testid="influencer-carousel-viewport"
          >
            <div
              ref={trackRef}
              className="flex transition-transform duration-[700ms] ease-out"
              style={{
                width: `${trackWidthPct}%`,
                transform: `translate3d(-${translatePct}%, 0, 0)`,
              }}
            >
              {validItems.map((it, i) => (
                <div
                  key={`${it.input}-${i}`}
                  className="flex-shrink-0 px-3 md:px-4"
                  style={{ width: `${100 / total}%` }}
                >
                  <InfluencerCard
                    item={it}
                    product={
                      it?.product_id ? productById[it.product_id] || null : null
                    }
                    index={i}
                    animate={false}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Mobile arrow row */}
          {showControls && (
            <div className="flex md:hidden justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous"
                data-testid="influencer-carousel-prev-mobile"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-[#D4AF37]/50 text-[#D4AF37]"
              >
                <ChevronLeft size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next"
                data-testid="influencer-carousel-next-mobile"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-[#D4AF37]/50 text-[#D4AF37]"
              >
                <ChevronRight size={18} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {/* Dot pagination */}
        {showControls && (
          <div
            className="mt-6 md:mt-8 flex items-center justify-center gap-2"
            data-testid="influencer-carousel-dots"
          >
            {validItems.map((_, i) => {
              const isActive = i === active;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  data-testid={`influencer-carousel-dot-${i}`}
                  className="h-[6px] rounded-full transition-all duration-500"
                  style={{
                    width: isActive ? 28 : 8,
                    background: isActive
                      ? "linear-gradient(90deg, #D4AF37, #B5952F)"
                      : "rgba(212,175,55,0.28)",
                  }}
                />
              );
            })}
          </div>
        )}

        {/* CTA row: View All Styled Looks (always) + View More on Instagram (if configured) */}
        <motion.div
          className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/styled-by"
            data-testid="influencer-view-all-btn"
            className="group inline-flex items-center gap-2.5 px-8 py-4 uppercase text-[11px] tracking-[0.32em] transition-all duration-300"
            style={{
              background: "linear-gradient(180deg, #D4AF37 0%, #B5952F 100%)",
              color: "#2a1125",
              border: "1px solid rgba(212,175,55,0.9)",
              boxShadow:
                "0 18px 34px -14px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            <span>View All Styled Looks</span>
            <ArrowRight
              size={14}
              strokeWidth={2}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          {P.view_more_link && (
            <a
              href={P.view_more_link}
              target="_blank"
              rel="noreferrer"
              data-testid="influencer-view-more-btn"
              className="inline-flex items-center gap-2 px-8 py-4 uppercase text-[11px] tracking-[0.32em] transition-all duration-300 hover:bg-[#D4AF37]/10"
              style={{
                background: "transparent",
                color: "#D4AF37",
                border: "1px solid rgba(212,175,55,0.55)",
              }}
            >
              <Instagram size={14} strokeWidth={1.7} />
              <span>{P.view_more_text || "View More on Instagram"}</span>
            </a>
          )}
        </motion.div>
      </div>
    </section>
  );
}
