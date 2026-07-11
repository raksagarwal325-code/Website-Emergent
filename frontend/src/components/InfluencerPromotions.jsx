import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Instagram, Play, ShoppingBag } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";

// ---------- Helpers ---------------------------------------------------------

function normalizeIgUrl(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    const path = u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`;
    return `${u.origin}${path}`;
  } catch {
    return trimmed;
  }
}

// Accept either a raw URL or an <blockquote…> Instagram embed snippet and
// return the canonical Instagram permalink so the card can deep-link to it.
function extractIgUrl(input) {
  const t = (input || "").trim();
  if (!t) return "";
  if (t.startsWith("<")) {
    const permalink = t.match(/data-instgrm-permalink="([^"]+)"/i);
    if (permalink) return normalizeIgUrl(permalink[1]);
    const href = t.match(/href="([^"]+instagram\.com[^"]+)"/i);
    if (href) return normalizeIgUrl(href[1]);
    return "";
  }
  return normalizeIgUrl(t);
}

// Detect Reel vs Post vs Story from the URL for the small badge.
function detectIgKind(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("/reel/") || u.includes("/reels/")) return "Reel";
  if (u.includes("/tv/")) return "IGTV";
  if (u.includes("/stories/")) return "Story";
  return "Post";
}

function displayHandle(raw) {
  if (!raw) return "";
  let s = String(raw).trim();
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  s = s.replace(/\/$/, "");
  s = s.replace(/^@/, "");
  return s;
}

function handleHref(raw) {
  const s = (raw || "").trim();
  if (!s) return "";
  if (s.startsWith("http")) return s;
  return `https://www.instagram.com/${displayHandle(s)}/`;
}

// ---------- Card ------------------------------------------------------------

function InfluencerCard({ item, product, index }) {
  const igUrl = extractIgUrl(item?.input);
  const kind = detectIgKind(igUrl);
  const thumbnail = item?.thumbnail || "";
  const handle = displayHandle(item?.handle);
  const handleUrl = handleHref(item?.handle);

  // Media area is wrapped in an <a> so the whole thumbnail (or play icon) opens
  // the Reel/Post on Instagram in a new tab.
  const mediaProps = igUrl
    ? { href: igUrl, target: "_blank", rel: "noreferrer" }
    : { role: "presentation", "aria-hidden": "true" };
  const MediaTag = igUrl ? "a" : "div";

  return (
    <motion.article
      data-testid={`influencer-card-${index}`}
      className="influencer-card group relative flex flex-col overflow-hidden w-full max-w-[380px] md:w-[380px]"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.7,
        delay: 0.08 + index * 0.12,
        ease: [0.22, 1, 0.36, 1], // "editorial" cubic-bezier
      }}
      whileHover={{ y: -6, transition: { duration: 0.35, ease: "easeOut" } }}
      style={{
        background: "linear-gradient(180deg, #23121e 0%, #1a0a17 100%)",
        border: "1px solid rgba(212,175,55,0.28)",
        borderRadius: "12px",
        boxShadow:
          "0 24px 44px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(163,99,80,0.10), inset 0 0 32px -14px rgba(212,175,55,0.10)",
      }}
    >
      {/* Ornamental gold hairline */}
      <div
        className="absolute inset-x-6 top-0 h-px pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(212,175,55,0.55), transparent)",
        }}
      />

      {/* Media area — 9:16 vertical (reel-like) so all cards match perfectly */}
      <MediaTag
        {...mediaProps}
        data-testid={`influencer-card-${index}-media`}
        aria-label={igUrl ? `Watch on Instagram — ${kind}` : undefined}
        className="relative block w-full bg-black overflow-hidden group/media"
        style={{ aspectRatio: "9 / 16" }}
      >
        {thumbnail ? (
          <img
            src={api.resolveImage(thumbnail)}
            alt={item?.caption || `Instagram ${kind} by @${handle || "creator"}`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover/media:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          // Fallback placeholder when no thumbnail was uploaded
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, rgba(163,99,80,0.35), transparent 55%), linear-gradient(180deg, #2a1125 0%, #16070f 100%)",
            }}
          >
            <Instagram size={44} strokeWidth={1.2} className="text-[#D4AF37]/40" />
            <span className="text-[10px] uppercase tracking-[0.28em] text-white/40">
              Upload cover in Admin
            </span>
          </div>
        )}

        {/* Cinematic dark gradient to lift overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        {/* Instagram Reel badge */}
        <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm border border-white/15">
          <Instagram size={11} strokeWidth={1.8} className="text-white" />
          <span className="text-[9px] uppercase tracking-[0.24em] text-white/90 font-medium">
            {kind}
          </span>
        </div>

        {/* Central play button — grows on hover */}
        {igUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-full flex items-center justify-center transition-all duration-500 group-hover/media:scale-110"
              style={{
                background:
                  "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.98), rgba(240,225,190,0.95))",
                boxShadow:
                  "0 12px 32px -8px rgba(0,0,0,0.7), 0 0 0 6px rgba(212,175,55,0.18), 0 0 0 12px rgba(212,175,55,0.08)",
              }}
            >
              <Play
                size={26}
                strokeWidth={0}
                className="text-[#2a1125] ml-1"
                fill="#2a1125"
              />
            </span>
          </div>
        )}

        {/* Shop-this-look pill (only when a catalog product is linked) */}
        {product && (
          <Link
            to={`/product/${product.id}`}
            data-testid={`influencer-card-${index}-shop-btn`}
            aria-label={`Shop this look — ${product.name}`}
            onClick={(e) => e.stopPropagation()}
            className="absolute z-20 bottom-3 right-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(180deg, #D4AF37 0%, #B5952F 100%)",
              color: "#2a1125",
              boxShadow:
                "0 10px 22px -8px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,235,180,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            <ShoppingBag size={12} strokeWidth={2} />
            <span className="text-[10px] uppercase tracking-[0.22em] font-medium">
              Shop this look
            </span>
          </Link>
        )}
      </MediaTag>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#D4AF37]/15 bg-black/30 flex items-center gap-3">
        <span className="w-9 h-9 flex items-center justify-center rounded-full border border-[#D4AF37]/40 text-[#D4AF37] flex-shrink-0">
          <Instagram size={15} strokeWidth={1.6} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.28em] text-[#BF9972]/80">
            Styled by
          </div>
          {handle ? (
            <a
              href={handleUrl}
              target="_blank"
              rel="noreferrer"
              data-testid={`influencer-card-${index}-handle`}
              className="text-sm text-[#D4AF37] hover:text-white transition-colors truncate block"
            >
              @{handle}
            </a>
          ) : (
            <span className="text-sm text-white/60 truncate block">
              a creator we love
            </span>
          )}
          {product ? (
            <Link
              to={`/product/${product.id}`}
              data-testid={`influencer-card-${index}-product-link`}
              className="mt-1 text-[11px] text-white/60 hover:text-[#D4AF37] leading-snug line-clamp-2 transition-colors block"
            >
              <span className="text-[#BF9972]">Featuring · </span>
              {product.name}
            </Link>
          ) : (
            item?.caption && (
              <div className="mt-1 text-[11px] text-white/50 leading-snug line-clamp-2">
                {item.caption}
              </div>
            )
          )}
        </div>
      </div>
    </motion.article>
  );
}

// ---------- Section ---------------------------------------------------------

export default function InfluencerPromotions() {
  const { hp } = useSettings();
  const P = hp?.influencer_promotions || {};

  // Only show cards that are truly ready for the public site:
  // must have an Instagram URL, a creator handle, AND a cover image.
  // (Requirement #7 — never render a broken/half-configured card.)
  const validItems = (P.items || []).filter((it) => {
    const hasUrl = (it?.input || "").trim().length > 0;
    const hasHandle = (it?.handle || "").trim().length > 0;
    const hasCover = (it?.thumbnail || "").trim().length > 0;
    return hasUrl && hasHandle && hasCover;
  });

  // Lazy-load products only when at least one item links to the catalog.
  const [products, setProducts] = useState([]);
  const needsProducts = validItems.some((it) => (it?.product_id || "").trim());
  useEffect(() => {
    if (!needsProducts) return undefined;
    let alive = true;
    api.listProducts()
      .then((rows) => { if (alive) setProducts(rows); })
      .catch(() => { /* silent — card just hides pill */ });
    return () => { alive = false; };
  }, [needsProducts]);
  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );

  if (P.enabled === false) return null;
  if (validItems.length === 0) return null;

  const titlePre = (P.title_pre || "").trim();
  const titleHi = (P.title_highlight || "").trim();

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

        {/* Cards — flex-wrap + justify-center so 1/2/3+ items are always
            centered without leaving empty grid columns on the right. */}
        <div
          data-testid="influencer-promotions-grid"
          className="flex flex-wrap justify-center gap-6 md:gap-8"
        >
          {validItems.map((it, i) => (
            <InfluencerCard
              key={`${it.input || it.thumbnail}-${i}`}
              item={it}
              product={it?.product_id ? productById[it.product_id] || null : null}
              index={i}
            />
          ))}
        </div>

        {/* View More CTA */}
        {P.view_more_link && (
          <motion.div
            className="mt-10 md:mt-12 flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{
              duration: 0.7,
              delay: 0.08 + validItems.length * 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <a
              href={P.view_more_link}
              target="_blank"
              rel="noreferrer"
              data-testid="influencer-view-more-btn"
              className="group inline-flex items-center gap-2.5 px-8 py-4 uppercase text-[11px] tracking-[0.32em] transition-all duration-300"
              style={{
                background: "linear-gradient(180deg, #3a1226 0%, #2a1125 100%)",
                color: "#D4AF37",
                border: "1px solid rgba(212,175,55,0.55)",
                boxShadow:
                  "0 12px 24px -14px rgba(0,0,0,0.7), inset 0 0 24px -10px rgba(212,175,55,0.25)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(180deg, #D4AF37 0%, #B5952F 100%)";
                e.currentTarget.style.color = "#2a1125";
                e.currentTarget.style.boxShadow =
                  "0 18px 36px -14px rgba(212,175,55,0.45), inset 0 0 24px -10px rgba(255,255,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(180deg, #3a1226 0%, #2a1125 100%)";
                e.currentTarget.style.color = "#D4AF37";
                e.currentTarget.style.boxShadow =
                  "0 12px 24px -14px rgba(0,0,0,0.7), inset 0 0 24px -10px rgba(212,175,55,0.25)";
              }}
            >
              <Instagram size={14} strokeWidth={1.7} />
              <span>{P.view_more_text || "View More on Instagram"}</span>
              <ArrowUpRight
                size={14}
                strokeWidth={1.7}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
