import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Instagram, ShoppingBag } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";

const IG_SCRIPT_SRC = "https://www.instagram.com/embed.js";

// Ensure Instagram's embed.js loads exactly once, then resolve when ready.
function ensureInstagramScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    if (window.instgrm && window.instgrm.Embeds) return resolve();
    const existing = document.querySelector(`script[src="${IG_SCRIPT_SRC}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = IG_SCRIPT_SRC;
    s.async = true;
    s.onload = () => {
      s.dataset.loaded = "true";
      resolve();
    };
    document.body.appendChild(s);
  });
}

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

// Auto-detect: <blockquote…> → use as-is · URL → wrap into standard IG blockquote.
// We deliberately drop `data-instgrm-captioned` to keep card heights tight and
// hide Instagram's likes / comments block for a cleaner luxury look.
function itemToEmbedHtml(item) {
  const input = (item?.input || "").trim();
  if (!input) return "";
  if (input.startsWith("<")) return input;
  const url = normalizeIgUrl(input);
  return `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="background:#000; border:0; margin:0 auto; padding:0; width:100%; min-width:0;"></blockquote>`;
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

function InfluencerCard({ item, product, index }) {
  const html = itemToEmbedHtml(item);
  const handle = displayHandle(item?.handle);
  const href = handleHref(item?.handle);

  return (
    <article
      data-testid={`influencer-card-${index}`}
      className="influencer-card group relative flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #23121e 0%, #1a0a17 100%)",
        border: "1px solid rgba(212,175,55,0.28)",
        borderRadius: "10px",
        boxShadow:
          "0 20px 40px -18px rgba(0,0,0,0.65), 0 0 0 1px rgba(163,99,80,0.10), inset 0 0 32px -14px rgba(212,175,55,0.10)",
      }}
    >
      {/* Ornamental gold hairlines top / bottom */}
      <div
        className="absolute inset-x-4 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(212,175,55,0.55), transparent)",
        }}
      />

      {/* Embed slot — top-aligned crop so profile header + reel are always visible;
          IG likes/comments footer is cropped below the frame. */}
      <div className="ig-embed-frame relative w-full flex items-start justify-center bg-black/40 overflow-hidden">
        <div
          className="ig-embed-slot w-full flex justify-center"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {/* Subtle warm glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 100%, rgba(163,99,80,0.14), transparent 55%)",
          }}
        />

        {/* Shop this look pill — only when a catalog product is linked */}
        {product && (
          <Link
            to={`/product/${product.id}`}
            data-testid={`influencer-card-${index}-shop-btn`}
            aria-label={`Shop this look — ${product.name}`}
            className="absolute z-10 bottom-4 right-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(180deg, #D4AF37 0%, #B5952F 100%)",
              color: "#2a1125",
              boxShadow:
                "0 8px 20px -6px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,235,180,0.4), inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            <ShoppingBag size={13} strokeWidth={2} />
            <span className="text-[10px] uppercase tracking-[0.24em] font-medium">
              Shop this look
            </span>
          </Link>
        )}
      </div>

      {/* Caption footer */}
      <div className="px-5 py-4 border-t border-[#D4AF37]/15 bg-black/30 flex items-center gap-3">
        <span className="w-8 h-8 flex items-center justify-center rounded-full border border-[#D4AF37]/40 text-[#D4AF37] flex-shrink-0">
          <Instagram size={14} strokeWidth={1.6} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.28em] text-[#BF9972]/80">
            Styled by
          </div>
          {handle ? (
            <a
              href={href}
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
    </article>
  );
}

export default function InfluencerPromotions() {
  const { hp } = useSettings();
  const P = hp?.influencer_promotions || {};
  const containerRef = useRef(null);

  const validItems = (P.items || []).filter(
    (it) => (it?.input || "").trim().length > 0,
  );

  // Fetch products once so we can resolve product_id → product for "Shop this look".
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

  const embedsSignature = validItems.map((i) => i.input).join("|");
  useEffect(() => {
    if (validItems.length === 0) return undefined;
    let cancelled = false;
    ensureInstagramScript().then(() => {
      if (cancelled) return;
      setTimeout(() => {
        try {
          window?.instgrm?.Embeds?.process?.();
        } catch {
          /* noop */
        }
      }, 80);
    });
    return () => {
      cancelled = true;
    };
  }, [embedsSignature, validItems.length]);

  if (P.enabled === false) return null;
  if (validItems.length === 0) return null;

  const titlePre = (P.title_pre || "").trim();
  const titleHi = (P.title_highlight || "").trim();

  return (
    <section
      data-testid="influencer-promotions-section"
      className="border-t border-white/10"
    >
      {/* Scoped CSS overrides for Instagram embeds — normalize widths and hide
          Instagram's min-width blowout on mobile. */}
      <style>{`
        .influencer-card .ig-embed-frame {
          height: 560px;
        }
        @media (max-width: 767px) {
          .influencer-card .ig-embed-frame {
            height: 500px;
          }
        }
        .influencer-card .instagram-media,
        .influencer-card iframe.instagram-media-rendered {
          min-width: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 auto !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <div className="text-center mb-8 md:mb-10">
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
        </div>

        <div
          ref={containerRef}
          data-testid="influencer-promotions-grid"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-stretch max-w-md mx-auto lg:max-w-none"
        >
          {validItems.map((it, i) => (
            <InfluencerCard
              key={`${it.input}-${i}`}
              item={it}
              product={it?.product_id ? productById[it.product_id] || null : null}
              index={i}
            />
          ))}
        </div>

        {P.view_more_link && (
          <div className="mt-10 md:mt-12 flex justify-center">
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
          </div>
        )}
      </div>
    </section>
  );
}
