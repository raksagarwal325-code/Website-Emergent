import React, { useEffect, useMemo, useRef, useState } from "react";
import { Star, ExternalLink, PenLine, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { useSettings } from "../context/SettingsContext";

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
  <span
    role="img"
    aria-label={`${Math.round(value * 10) / 10} out of 5 stars`}
    className="inline-flex"
  >
    {[1,2,3,4,5].map((n) => (
      <Star key={n} size={14} strokeWidth={1.4} aria-hidden="true" focusable="false" className={n <= Math.round(value) ? "text-[#D4AF37]" : "text-white/20"} fill={n <= Math.round(value) ? "#D4AF37" : "none"} />
    ))}
  </span>
);

const AUTOPLAY_MS = 5000;

export default function GoogleReviews({ variant = "full" }) {
  const [data, setData] = useState(null);
  const { hp } = useSettings();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    api.googleReviews().then(setData).catch(() => setData({ enabled: false }));
  }, []);

  const allReviews = useMemo(() => {
    const google = (data?.reviews || []).map((r) => ({
      source: "google",
      author_name: r.author_name || "Google User",
      profile_photo_url: r.profile_photo_url || "",
      rating: r.rating || 5,
      relative_time_description: r.relative_time_description || "",
      text: r.text || "",
    }));
    const manual = (hp?.manual_reviews?.items || [])
      .filter((r) => (r?.text || "").trim() || (r?.author_name || "").trim())
      .map((r) => ({
        source: "manual",
        author_name: (r.author_name || "").trim() || "Client",
        profile_photo_url: "",
        rating: Math.max(1, Math.min(5, Number(r.rating) || 5)),
        relative_time_description: (r.relative_time_description || "").trim(),
        text: (r.text || "").trim(),
      }));
    return [...manual, ...google].filter((r) => (r.rating || 0) >= 4);
  }, [data, hp]);

  useEffect(() => {
    if (paused || allReviews.length < 2) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % allReviews.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [paused, allReviews.length]);

  useEffect(() => {
    if (idx >= allReviews.length) setIdx(0);
  }, [allReviews.length, idx]);

  if (!data) return null;
  const { enabled, rating, total_ratings, view_url, write_url, cid, place_id_set, api_key_set } = data;
  const canShowLinks = !!cid;
  const hasReviews = allReviews.length > 0;
  const prev = () => setIdx((i) => (i - 1 + allReviews.length) % allReviews.length);
  const next = () => setIdx((i) => (i + 1) % allReviews.length);

  return (
    <section data-testid="google-reviews-section" className="relative border border-white/10 bg-[#0a0a0a] p-8 md:p-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
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
              <div className="text-white/70 text-xs mt-2">Based on <span data-testid="gr-total" className="text-white/90">{total_ratings}</span> Google reviews</div>
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
                <ExternalLink size={13} /> View all reviews on Google
              </a>
            </div>
          )}

          {!enabled && variant === "full" && (place_id_set === false || api_key_set === false) && (
            <p className="mt-6 text-xs text-white/40 leading-relaxed max-w-sm">
              Live Google reviews will appear here automatically once <span className="text-white/55">GOOGLE_PLACE_ID</span> and <span className="text-white/55">GOOGLE_MAPS_API_KEY</span> are added in Admin → Settings.
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
            <div className="relative min-h-[260px] md:min-h-[280px]">
              {allReviews.map((r, i) => (
                <div
                  key={i}
                  data-testid={`gr-review-${i}`}
                  aria-hidden={i !== idx}
                  className={`absolute inset-0 border border-white/10 p-6 md:p-8 pl-10 md:pl-14 pr-10 md:pr-14 bg-black/40 flex flex-col transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {r.profile_photo_url ? (
                      <img src={r.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-sm font-serif">{(r.author_name || "?")[0]}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm md:text-base text-white truncate font-serif">{r.author_name}</span>
                        {r.source === "google" ? (
                          <span title="Verified Google review" className="inline-flex flex-shrink-0"><GoogleMark size={12} /></span>
                        ) : (
                          <span title="Verified customer testimonial" className="text-[10px] uppercase tracking-[0.22em] text-[#BF9972] border border-[#BF9972]/45 px-1.5 py-0.5 flex-shrink-0">Client</span>
                        )}
                      </div>
                      {r.relative_time_description && (
                        <div className="text-xs text-white/70 uppercase tracking-[0.14em] mt-0.5">{r.relative_time_description}</div>
                      )}
                    </div>
                    <Stars value={r.rating} />
                  </div>
                  <p className="text-white/75 text-sm md:text-[15px] leading-relaxed line-clamp-6 md:line-clamp-none flex-1">
                    <span className="font-serif text-[#D4AF37] text-2xl leading-none mr-1 align-top">&ldquo;</span>
                    {r.text}
                  </p>
                </div>
              ))}

              {allReviews.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    data-testid="gr-prev"
                    aria-label="Previous review"
                    className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 border border-white/25 bg-black/75 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/85 flex items-center justify-center transition-colors z-10"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    data-testid="gr-next"
                    aria-label="Next review"
                    className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 border border-white/25 bg-black/75 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/85 flex items-center justify-center transition-colors z-10"
                  >
                    <ChevronRight size={17} />
                  </button>
                </>
              )}
            </div>

            {allReviews.length > 1 && (
              <div className="mt-3 flex items-center justify-center" data-testid="gr-dots">
                {allReviews.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIdx(i)}
                    aria-label={`Go to review ${i + 1}`}
                    aria-current={i === idx ? "true" : undefined}
                    data-testid={`gr-dot-${i}`}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center group focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2 rounded-none transition-all ${i === idx ? "w-9 bg-[#D4AF37]" : "w-4 bg-white/45 group-hover:bg-white/70"}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
