// Shared card + helpers for the "As Styled By" section on Home and the
// full gallery on /styled-by. Kept in one file so both surfaces stay visually
// identical if the card design evolves.
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Instagram, Play, ShoppingBag } from "lucide-react";
import { api } from "../lib/api";

// --- URL / handle helpers --------------------------------------------------

export function normalizeIgUrl(raw) {
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

export function extractIgUrl(input) {
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

export function detectIgKind(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("/reel/") || u.includes("/reels/")) return "Reel";
  if (u.includes("/tv/")) return "IGTV";
  if (u.includes("/stories/")) return "Story";
  return "Post";
}

export function displayHandle(raw) {
  if (!raw) return "";
  let s = String(raw).trim();
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  s = s.replace(/\/$/, "");
  s = s.replace(/^@/, "");
  return s;
}

export function handleHref(raw) {
  const s = (raw || "").trim();
  if (!s) return "";
  if (s.startsWith("http")) return s;
  return `https://www.instagram.com/${displayHandle(s)}/`;
}

// Homepage/gallery filter — a card only shows publicly when it has all three.
export function isDisplayable(it) {
  return (
    (it?.input || "").trim().length > 0 &&
    (it?.handle || "").trim().length > 0 &&
    (it?.thumbnail || "").trim().length > 0
  );
}

// --- Card ------------------------------------------------------------------

export function InfluencerCard({ item, product, index = 0, animate = true }) {
  const igUrl = extractIgUrl(item?.input);
  const kind = detectIgKind(igUrl);
  const thumbnail = item?.thumbnail || "";
  const handle = displayHandle(item?.handle);
  const href = handleHref(item?.handle);

  const mediaLinkProps = igUrl
    ? { href: igUrl, target: "_blank", rel: "noreferrer" }
    : null;

  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: {
          duration: 0.7,
          delay: 0.08 + (index % 6) * 0.1,
          ease: [0.22, 1, 0.36, 1],
        },
        whileHover: { y: -6, transition: { duration: 0.35, ease: "easeOut" } },
      }
    : {};

  return (
    <motion.article
      data-testid={`influencer-card-${index}`}
      className="influencer-card group relative flex flex-col overflow-hidden w-full max-w-[380px] md:w-[380px] mx-auto"
      {...motionProps}
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

      {/* Media area — 9:16. Uses a div wrapper so the Instagram link and the
          "Shop this look" product link stay as siblings — nesting an <a>
          inside another <a> triggers a React DOM validation warning. */}
      <div
        data-testid={`influencer-card-${index}-media`}
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

        {/* Cinematic dark gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        {/* Kind badge */}
        <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm border border-white/15">
          <Instagram size={11} strokeWidth={1.8} className="text-white" />
          <span className="text-[9px] uppercase tracking-[0.24em] text-white/90 font-medium">
            {kind}
          </span>
        </div>

        {/* Play button */}
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

        {/* Instagram media click-target — full-cover overlay, sibling to the
            "Shop this look" pill. Kept at a lower z-index so the pill sits
            above and receives its own clicks. */}
        {mediaLinkProps && (
          <a
            {...mediaLinkProps}
            aria-label={`Watch on Instagram — ${kind}`}
            data-testid={`influencer-card-${index}-media-link`}
            className="absolute inset-0 z-10"
          />
        )}

        {/* Shop this look pill */}
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
      </div>

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
    </motion.article>
  );
}
