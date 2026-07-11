import React, { useEffect, useRef } from "react";
import { ArrowUpRight, Instagram } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

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

function itemToEmbedHtml(item) {
  const input = (item?.input || "").trim();
  if (!input) return "";
  // Full embed code pasted from Instagram → use as-is.
  if (input.startsWith("<")) return input;
  // Otherwise treat as URL and wrap in the standard blockquote.
  const url = normalizeIgUrl(input);
  return `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${url}" data-instgrm-version="14" style="background:#000; border:0; margin:0; padding:0; width:100%; min-width:280px;"></blockquote>`;
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

function InfluencerCard({ item, index }) {
  const html = itemToEmbedHtml(item);
  const handle = displayHandle(item?.handle);
  const href = handleHref(item?.handle);

  return (
    <div
      data-testid={`influencer-card-${index}`}
      className="group flex flex-col border border-[#D4AF37]/20 bg-black/40 hover:border-[#D4AF37]/60 transition-colors"
    >
      <div className="relative w-full bg-black overflow-hidden p-2 sm:p-3">
        <div
          className="ig-embed-slot mx-auto w-full"
          style={{ maxWidth: 540 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {(handle || item?.caption) && (
        <div className="px-4 py-4 border-t border-white/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {handle && (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                data-testid={`influencer-card-${index}-handle`}
                className="inline-flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#B5952F] truncate"
              >
                <Instagram size={14} strokeWidth={1.6} />
                <span className="truncate">@{handle}</span>
              </a>
            )}
            {item?.caption && (
              <div className="mt-1 text-xs text-white/60 leading-relaxed line-clamp-3">
                {item.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InfluencerPromotions() {
  const { hp } = useSettings();
  const P = hp?.influencer_promotions || {};
  const containerRef = useRef(null);

  const validItems = (P.items || []).filter(
    (it) => (it?.input || "").trim().length > 0,
  );

  // Load Instagram embed.js and (re-)process embeds whenever the list changes.
  const embedsSignature = validItems.map((i) => i.input).join("|");
  useEffect(() => {
    if (validItems.length === 0) return undefined;
    let cancelled = false;
    ensureInstagramScript().then(() => {
      if (cancelled) return;
      // process() re-scans the DOM for any un-rendered blockquotes.
      // Wrapped in setTimeout so React commit finishes before Instagram walks it.
      setTimeout(() => {
        try {
          window?.instgrm?.Embeds?.process?.();
        } catch {
          /* noop */
        }
      }, 60);
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
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12 md:mb-14">
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
            <p className="mt-4 text-white/60 max-w-2xl mx-auto leading-relaxed">
              {P.subtitle}
            </p>
          )}
        </div>

        <div
          ref={containerRef}
          data-testid="influencer-promotions-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {validItems.map((it, i) => (
            <InfluencerCard key={`${it.input}-${i}`} item={it} index={i} />
          ))}
        </div>

        {P.view_more_link && (
          <div className="mt-12 md:mt-14 flex justify-center">
            <a
              href={P.view_more_link}
              target="_blank"
              rel="noreferrer"
              data-testid="influencer-view-more-btn"
              className="inline-flex items-center gap-2 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black px-8 py-4 uppercase text-xs tracking-[0.28em] transition-colors"
            >
              <Instagram size={14} strokeWidth={1.6} />
              {P.view_more_text || "View More on Instagram"}
              <ArrowUpRight size={14} />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
