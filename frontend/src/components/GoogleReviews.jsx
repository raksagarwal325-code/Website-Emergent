import React, { useEffect, useMemo, useRef, useState } from "react";
import { Star, ExternalLink, PenLine, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";

// Google "G" mark (SVG, brand-safe placement in dark UI)
const GoogleMark = ({ size = 16 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6c1.9-5.6 7.2-9.8 13.6-9.8z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.7-.1-3-.4-4.3H24v8.1h12.7c-.3 2.1-1.7 5.3-4.9 7.4l7.6 5.9c4.5-4.2 7.1-10.3 7.1-17.1z"/>
    <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.9 0 20.3 0 24s1 7.1 2.6 10.7l7.8-6z"/>
    <path fill="#34A853" d="M24 48c6.5 0 12-2.2 16-5.8l-7.6-5.9c-2.1 1.5-4.9 2.5-8.4 2.5-6.4 0-11.8-4.2-13.7-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z"/>
  </svg>
);

const Stars = ({ value = 0 }) => (
  <span className="inline-flex" aria-label={`${value} stars`}>
    {[1,2,3,4,5].map((n) => (
      <Star key={n} size={14} strokeWidth={1.4} className={n <= Math.round(value) ? "text-[#D4AF37]" : "text-white/20"} fill={n <= Math.round(value) ? "#D4AF37" : "none"} />
    ))}
  </span>
);

export default function GoogleReviews({ variant = "full" }) {
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    api.googleReviews().then(setData).catch(() => setData({ enabled: false }));
  }, []);

  // Only 4+ star reviews for a luxury brand
  const qualityReviews = useMemo(() => {
    const list = data?.reviews || [];
    return list.filter((r) => (r?.rating ?? 0) >= 4);
  }, [data]);

  // Auto-rotate every 6s (paused on hover)
  useEffect(() => {
    if (paused || qualityReviews.length < 2) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % qualityReviews.length);
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [paused, qualityReviews.length]);

  // Reset index if reviews array shrinks
  useEffect(() => {
    if (idx >= qualityReviews.length) setIdx(0);
  }, [qualityReviews.length, idx]);

  if (!data) return null;
  const { enabled, rating, total_ratings, view_url, write_url, cid, place_id_set, api_key_set } = data;
  const canShowLinks = !!cid;
  const hasReviews = enabled && qualityReviews.length > 0;
  const current = hasReviews ? qualityReviews[idx] : null;
  const prev = () => setIdx((i) => (i - 1 + qualityReviews.length) % qualityReviews.length);
  const next = () => setIdx((i) => (i + 1) % qualityReviews.length);

  return (
    <section data-testid="google-reviews-section" className="relative border border-white/10 bg-[#0a0a0a] p-8 md:p-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-3 mb-4">
            <GoogleMark size={22} />
            <div className="eyebrow">Google Reviews</div>
          </div>

          {enabled ? (
            <>
              <div className="flex items-baseline gap-3 mb-2">
                <span data-testid="gr-rating" className="font-serif text-5xl text-[#D4AF37]">{rating?.toFixed(1)}</span>
                <span className="text-white/60 text-sm">/ 5</span>
              </div>
              <Stars value={rating || 0} />
              <div className="text-white/50 text-xs mt-2">Based on <span data-testid="gr-total" className="text-white/80">{total_ratings}</span> Google reviews</div>
            </>
          ) : (
            <>
              <h3 className="font-serif text-3xl leading-tight mb-3">Loved a piece?<br/>Tell the world on Google.</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                {place_id_set && api_key_set
                  ? "Live reviews will appear here once verified."
                  : "Your recommendation helps other homeowners discover our craft. It takes less than a minute."}
              </p>
            </>
          )}

          {canShowLinks && (
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                data-testid="gr-write-btn"
                href={write_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]"
              >
                <PenLine size={13} /> Review us on Google
              </a>
              <a
                data-testid="gr-view-btn"
                href={view_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-6 py-3 uppercase text-xs tracking-[0.28em] text-white/80 hover:text-white"
              >
                <ExternalLink size={13} /> View on Google
              </a>
            </div>
          )}

          {!enabled && variant === "full" && (place_id_set === false || api_key_set === false) && (
            <p className="mt-6 text-[11px] text-white/30 leading-relaxed max-w-sm">
              Live Google reviews will appear here automatically once <span className="text-white/50">GOOGLE_PLACE_ID</span> and <span className="text-white/50">GOOGLE_MAPS_API_KEY</span> are added in Admin → Settings.
            </p>
          )}
        </div>

        {hasReviews && (
          <div
            className="lg:col-span-7 relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            data-testid="gr-slideshow"
          >
            {/* Slide stack (cross-fade) */}
            <div className="relative min-h-[240px] md:min-h-[260px]">
              {qualityReviews.map((r, i) => (
                <div
                  key={i}
                  data-testid={`gr-review-${i}`}
                  aria-hidden={i !== idx}
                  className={`absolute inset-0 border border-white/10 p-6 md:p-8 bg-black/40 flex flex-col transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {r.profile_photo_url ? (
                      <img src={r.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-sm font-serif">{(r.author_name || "?")[0]}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm md:text-base text-white truncate font-serif">{r.author_name}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{r.relative_time_description}</div>
                    </div>
                    <Stars value={r.rating} />
                  </div>
                  <p className="text-white/75 text-sm md:text-[15px] leading-relaxed line-clamp-6 md:line-clamp-none flex-1">
                    <span className="font-serif text-[#D4AF37] text-2xl leading-none mr-1 align-top">&ldquo;</span>
                    {r.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Controls */}
            {qualityReviews.length > 1 && (
              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-2" data-testid="gr-dots">
                  {qualityReviews.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIdx(i)}
                      aria-label={`Go to review ${i + 1}`}
                      data-testid={`gr-dot-${i}`}
                      className={`h-1.5 transition-all ${i === idx ? "w-8 bg-[#D4AF37]" : "w-4 bg-white/20 hover:bg-white/40"}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] uppercase tracking-widest text-white/40 mr-2 font-serif">
                    {String(idx + 1).padStart(2, "0")} <span className="text-white/25">/</span> {String(qualityReviews.length).padStart(2, "0")}
                  </div>
                  <button type="button" onClick={prev} data-testid="gr-prev" aria-label="Previous review"
                    className="w-9 h-9 border border-white/15 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/70 flex items-center justify-center transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" onClick={next} data-testid="gr-next" aria-label="Next review"
                    className="w-9 h-9 border border-white/15 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/70 flex items-center justify-center transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
