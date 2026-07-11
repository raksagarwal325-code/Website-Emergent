import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Instagram } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { InfluencerCard, isDisplayable } from "../components/InfluencerCard";

export default function StyledBy() {
  const { hp } = useSettings();
  const P = hp?.influencer_promotions || {};

  const validItems = (P.items || []).filter(isDisplayable);

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

  const titlePre = (P.title_pre || "As").trim();
  const titleHi = (P.title_highlight || "Styled By").trim();

  return (
    <div className="min-h-[70vh] bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Back link */}
        <Link
          to="/"
          data-testid="styled-by-back-link"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/50 hover:text-[#D4AF37] transition-colors mb-8"
        >
          <ArrowLeft size={13} /> Back to home
        </Link>

        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="eyebrow mb-3">
            {(P.eyebrow || "Featured Creators")}
          </div>
          <h1
            data-testid="styled-by-title"
            className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.05]"
          >
            {titlePre} <span className="italic brand-gradient-text">{titleHi}</span>
          </h1>
          {P.subtitle && (
            <p className="mt-4 md:mt-5 text-white/60 max-w-2xl mx-auto leading-relaxed text-sm md:text-base">
              {P.subtitle}
            </p>
          )}
          <div className="mt-6 text-[11px] uppercase tracking-[0.32em] text-[#BF9972]/70">
            {validItems.length} {validItems.length === 1 ? "creator" : "creators"}
          </div>
        </motion.div>

        {/* Grid */}
        {validItems.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border border-[#D4AF37]/30 text-[#D4AF37]/60 mb-6">
              <Instagram size={32} strokeWidth={1.2} />
            </div>
            <p className="text-white/50">
              No styled looks yet. Add Instagram reels from Admin → Homepage →
              Influencer Promotions.
            </p>
          </div>
        ) : (
          <div
            data-testid="styled-by-grid"
            className="flex flex-wrap justify-center gap-6 md:gap-8"
          >
            {validItems.map((it, i) => (
              <InfluencerCard
                key={`${it.input}-${i}`}
                item={it}
                product={
                  it?.product_id ? productById[it.product_id] || null : null
                }
                index={i}
              />
            ))}
          </div>
        )}

        {/* CTA — External Instagram profile link if configured */}
        {P.view_more_link && (
          <div className="mt-16 md:mt-20 flex justify-center">
            <a
              href={P.view_more_link}
              target="_blank"
              rel="noreferrer"
              data-testid="styled-by-view-more-btn"
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
          </div>
        )}
      </div>
    </div>
  );
}
