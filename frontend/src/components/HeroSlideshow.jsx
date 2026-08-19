import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { api } from "../lib/api";

/**
 * Homepage hero background slideshow.
 *
 * Performance notes:
 *  - The base CMS hero image is already rendered by Home.jsx, so this
 *    component stays empty while slide data is loading or unavailable.
 *    This avoids requesting/rendering the same fallback image twice.
 *  - Only the currently visible slide is requested. We intentionally do not
 *    preload the entire slideshow because those large images compete with the
 *    LCP image on mobile connections.
 *  - The first configured slide is high priority; later slides lazy-load only
 *    when they become active.
 */
export default function HeroSlideshow({ fallbackSrc }) {
  const [slides, setSlides] = useState(null); // null = still loading
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
    return () => {
      alive = false;
    };
  }, []);

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

  // Home.jsx already paints fallbackSrc underneath this component. Returning
  // nothing here prevents a duplicate eager request while the API resolves.
  if (errored || slides === null || slides.length === 0) {
    return null;
  }

  if (slides.length === 1 || prefersReducedMotion) {
    const s = slides[0];
    return (
      <img
        src={s.image_url}
        alt={s.alt_text || ""}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }

  const transitionSec = Math.max(0.1, Number(settings.transition_duration) || 1.5);
  const activeSlide = slides[idx];

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.img
        key={activeSlide.id}
        src={activeSlide.image_url}
        alt={activeSlide.alt_text || ""}
        loading={idx === 0 ? "eager" : "lazy"}
        fetchPriority={idx === 0 ? "high" : "low"}
        decoding="async"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: transitionSec, ease: [0.4, 0, 0.2, 1] }}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </AnimatePresence>
  );
}
