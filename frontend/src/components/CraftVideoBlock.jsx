import React, { useEffect, useRef, useState } from "react";
import { Instagram, Play, ExternalLink } from "lucide-react";
import { api } from "../lib/api";

/**
 * Reusable craft video player.
 *
 * Renders in this priority:
 *   1) An uploaded video (HTML5 <video>) — most reliable
 *   2) An Instagram Reel embed (blockquote + embed.js) — social proof
 *   3) A poster + "Watch on Instagram" button — graceful fallback
 *
 * The `variant` prop controls layout:
 *   - "framed"  → premium copper/gold border card (Craft page main section)
 *   - "compact" → small square card (About page)
 *   - "bare"    → no chrome (used only from CraftBackgroundVideo)
 */
export default function CraftVideoBlock({
  video_url,
  instagram_url,
  thumbnail_url,
  caption,
  cta_text = "Watch on Instagram",
  cta_link,
  variant = "framed",
  aspect = "9 / 16", // Reels are portrait
  "data-testid": tid,
}) {
  const [showVideo, setShowVideo] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);

  const hasVideo = Boolean(video_url);
  const hasInstagram = Boolean(instagram_url);
  const resolvedThumb = thumbnail_url ? api.resolveImage(thumbnail_url) : "";
  const resolvedVideo = hasVideo ? api.resolveImage(video_url) : "";
  const finalCtaLink = cta_link || instagram_url;

  // Load Instagram's official embed script once when we render an embed.
  useEffect(() => {
    if (hasVideo || !hasInstagram) return undefined;
    const src = "https://www.instagram.com/embed.js";
    let script = document.querySelector(`script[src="${src}"]`);
    let timeoutId;
    const process = () => {
      if (window.instgrm?.Embeds?.process) {
        try { window.instgrm.Embeds.process(); } catch (e) { /* noop */ }
      }
    };
    if (!script) {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = process;
      script.onerror = () => setEmbedFailed(true);
      document.body.appendChild(script);
    } else {
      process();
    }
    // If after 6s Instagram still hasn't upgraded the blockquote, treat as failed.
    timeoutId = setTimeout(() => {
      const upgraded = document.querySelector(
        '.instagram-media[data-testid="craft-ig-blockquote"] iframe'
      );
      if (!upgraded) setEmbedFailed(true);
    }, 6000);
    return () => clearTimeout(timeoutId);
  }, [hasVideo, hasInstagram, instagram_url]);

  // Everything below is layered inside the same premium frame — the outer
  // frame styling changes per variant.
  const frameClasses =
    variant === "framed"
      ? "relative overflow-hidden border border-[#D4AF37]/40 rounded-none"
      : variant === "compact"
      ? "relative overflow-hidden border border-[#D4AF37]/40"
      : "relative overflow-hidden";
  const frameStyle =
    variant === "framed"
      ? {
          background: "linear-gradient(180deg,#150409 0%, #0b0409 100%)",
          boxShadow:
            "0 0 0 1px rgba(191,153,114,0.15), 0 24px 60px -12px rgba(0,0,0,0.7), 0 0 90px -20px rgba(212,175,55,0.25)",
        }
      : { background: "#0b0409" };

  return (
    <div className={frameClasses} style={frameStyle} data-testid={tid}>
      <div className="relative w-full" style={{ aspectRatio: aspect }}>
        {/* 1) Uploaded video — most reliable */}
        {hasVideo && (
          <video
            src={resolvedVideo}
            poster={resolvedThumb || undefined}
            className="absolute inset-0 w-full h-full object-cover"
            controls
            playsInline
            preload="metadata"
            data-testid={`${tid || "craft-video"}-html5`}
          />
        )}

        {/* 2) Instagram embed */}
        {!hasVideo && hasInstagram && !embedFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={instagram_url}
              data-instgrm-version="14"
              data-testid="craft-ig-blockquote"
              style={{
                background: "#000",
                border: 0,
                margin: 0,
                maxWidth: "100%",
                width: "100%",
                minHeight: "100%",
              }}
            >
              <a href={instagram_url} target="_blank" rel="noreferrer" className="text-white/60 text-xs uppercase tracking-widest px-4">
                Loading Reel…
              </a>
            </blockquote>
          </div>
        )}

        {/* 3) Fallback: poster + play button linking to Instagram */}
        {(!hasVideo && (!hasInstagram || embedFailed)) && (
          <a
            href={finalCtaLink || "#"}
            target={finalCtaLink ? "_blank" : undefined}
            rel="noreferrer"
            className="absolute inset-0 flex items-center justify-center group bg-black"
            data-testid="craft-video-fallback"
            aria-label={cta_text}
          >
            {resolvedThumb ? (
              <img src={resolvedThumb} alt={caption || "Craft"} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity" />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(circle at 50% 50%, rgba(212,175,55,0.25), transparent 60%)" }}
              />
            )}
            <div className="relative flex flex-col items-center gap-4 text-center px-6">
              <span className="w-16 h-16 rounded-full border border-[#D4AF37] bg-black/60 backdrop-blur flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:text-black transition-colors">
                <Play size={22} className="ml-1" />
              </span>
              {finalCtaLink && (
                <span className="inline-flex items-center gap-2 text-[#D4AF37] text-xs uppercase tracking-[0.28em]">
                  <Instagram size={14} /> {cta_text}
                  <ExternalLink size={12} />
                </span>
              )}
            </div>
          </a>
        )}

        {/* Hairlines like the atelier frame */}
        {variant === "framed" && (
          <>
            <div className="absolute inset-x-6 top-4 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent pointer-events-none" />
            <div className="absolute inset-x-6 bottom-4 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent pointer-events-none" />
          </>
        )}
      </div>

      {caption && variant !== "bare" && (
        <div className={`px-6 py-4 border-t border-[#D4AF37]/20 text-center ${variant === "compact" ? "text-xs" : "text-sm"} text-white/70 italic`}>
          {caption}
        </div>
      )}
    </div>
  );
}

/**
 * Muted-autoplay hero background player. Only renders when `enabled` and a
 * video is uploaded (Instagram embeds can't be autoplayed silently as a bg).
 */
export function CraftBackgroundVideo({ enabled, video_url, thumbnail_url }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!enabled || !video_url) return;
    const el = ref.current;
    if (!el) return;
    // Ensure autoplay reliably starts even on iOS Safari
    el.muted = true;
    el.playsInline = true;
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [enabled, video_url]);

  if (!enabled || !video_url) return null;
  return (
    <video
      ref={ref}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40"
      src={api.resolveImage(video_url)}
      poster={thumbnail_url ? api.resolveImage(thumbnail_url) : undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      data-testid="craft-hero-bg-video"
    />
  );
}
