import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { api } from "../lib/api";

/**
 * Homepage hero background slideshow.
 *
 *  - Fetches ONLY `enabled` slides in the saved order via /api/hero-slides.
 *  - Cross-fades between slides with the admin-configured display_duration
 *    and transition_duration (defaults: 6s / 1.5s).
 *  - First image loads eagerly; the rest lazy-load.
 *  - If only one active slide → renders it statically, no animation.
 *  - Respects prefers-reduced-motion → shows only the first active slide.
 *  - On fetch failure → renders the caller's `fallbackSrc` (existing
 *    `settings.hero_image` from the CMS) so the hero is never blank.
 *  - No arrows, dots or changing text — background-only crossfade.
 */
export default function HeroSlideshow({ fallbackSrc }) {
  const [slides, setSlides] = useState(null);   // null = still loading
  const [settings, setSettings] = useState({ display_duration: 6, transition_duration: 1.5 });
  const [idx, setIdx] = useState(0);
  const [errored, setErrored] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    let alive = true;
    api
      .getHeroSlideshow()
      .then((data) => {
        if (!alive) return;
        setSlides(Array.isArray(data?.slides) ? data.slides : []);
        if (data?.settings) setSettings(data.settings);
      })
      .catch(() => alive && setErrored(true));
    return () => { alive = false; };
  }, []);

  // Rotate index on the configured cadence. Guard against 0/1 slide cases and
  // reduced-motion — those never advance.
  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    if (prefersReducedMotion) return;
    const totalMs = Math.max(2, Number(settings.display_duration) || 6) * 1000;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % slides.length),
      totalMs,
    );
    return () => clearInterval(t);
  }, [slides, settings.display_duration, prefersReducedMotion]);

  // Fallback: fetch error OR admin has no slides → render the pre-existing
  // `hero_image` from the CMS (unchanged from the current behaviour).
  if (errored || (slides !== null && slides.length === 0)) {
    return (
      <img
        src={fallbackSrc || "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15"}
        alt=""
        loading="eager"
        className="w-full h-full object-cover"
      />
    );
  }

  // Still loading → render the fallback quietly (avoids a blank flash).
  if (slides === null) {
    return (
      <img src={fallbackSrc || ""} alt="" loading="eager" className="w-full h-full object-cover" />
    );
  }

  // Single slide OR reduced-motion → render statically, no animation.
  if (slides.length === 1 || prefersReducedMotion) {
    const s = slides[0];
    return (
      <img
        src={s.image_url}
        alt={s.alt_text || ""}
        loading="eager"
        className="w-full h-full object-cover"
      />
    );
  }

  const transitionSec = Math.max(0.1, Number(settings.transition_duration) || 1.5);

  return (
    <>
      {/* Preload the whole set so crossfades are gap-free after slide 1. */}
      {slides.map((s, i) => (
        <link key={s.id} rel="preload" as="image" href={s.image_url} fetchpriority={i === 0 ? "high" : "low"} />
      ))}
      <AnimatePresence mode="sync" initial={false}>
        <motion.img
          key={slides[idx].id}
          src={slides[idx].image_url}
          alt={slides[idx].alt_text || ""}
          loading={idx === 0 ? "eager" : "lazy"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: transitionSec, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
    </>
  );
}
