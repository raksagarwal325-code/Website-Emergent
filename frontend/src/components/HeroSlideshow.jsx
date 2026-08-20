import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { api } from "../lib/api";

/**
 * Homepage hero background slideshow.
 *
 * Performance notes:
 *  - Home.jsx owns the initial LCP image (`settings.hero_image`) and loads it
 *    eagerly/high priority. This component deliberately stays empty during the
 *    initial hero interval so a second slideshow image cannot compete with it.
 *  - After the first display interval, slideshow images are introduced lazily
 *    and at low fetch priority. Only the currently visible slide is requested.
 *  - Reduced-motion users keep the stable CMS hero and do not start the
 *    background slideshow.
 */
export default function HeroSlideshow() {
  const [slides, setSlides] = useState(null); // null = still loading
  const [settings, setSettings] = useState({ display_duration: 6, transition_duration: 1.5 });
  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(false);
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

  // Preserve a single high-priority LCP candidate on initial page load. The
  // CMS hero remains visible for its normal display interval before we begin
  // requesting any slideshow image.
  useEffect(() => {
    if (!slides || slides.length === 0) return;
    if (prefersReducedMotion) return;

    const totalMs = Math.max(2, Number(settings.display_duration) || 6) * 1000;
    const t = setTimeout(() => setStarted(true), totalMs);
    return () => clearTimeout(t);
  }, [slides, settings.display_duration, prefersReducedMotion]);

  // Once the slideshow has started, advance on the configured cadence.
  useEffect(() => {
    if (!started || !slides || slides.length <= 1) return;

    const totalMs = Math.max(2, Number(settings.display_duration) || 6) * 1000;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % slides.length),
      totalMs,
    );

    return () => clearInterval(t);
  }, [started, slides, settings.display_duration]);

  if (
    errored ||
    slides === null ||
    slides.length === 0 ||
    prefersReducedMotion ||
    !started
  ) {
    return null;
  }

  const transitionSec = Math.max(0.1, Number(settings.transition_duration) || 1.5);
  const activeSlide = slides[idx];

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.img
        key={activeSlide.id}
        src={activeSlide.image_url}
        alt={activeSlide.alt_text || ""}
        loading="lazy"
        fetchPriority="low"
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
