import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { api } from "../lib/api";

/**
 * Homepage hero background slideshow.
 *
 * Mobile performance policy:
 *  - Mobile (<768px) deliberately keeps the lightweight inline hero backdrop
 *    from Home.jsx and never requests slideshow media. Lighthouse has shown
 *    the large hero assets are the dominant mobile LCP bottleneck.
 *  - Desktop/tablet keeps the normal admin-managed slideshow behaviour.
 *  - Reduced-motion users keep the stable CMS hero and do not start the
 *    background slideshow.
 */
export default function HeroSlideshow() {
  const [slides, setSlides] = useState(null); // null = still loading
  const [settings, setSettings] = useState({ display_duration: 6, transition_duration: 1.5 });
  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false,
  );
  const [errored, setErrored] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = (event) => setIsMobile(event.matches);
    setIsMobile(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSlides([]);
      return undefined;
    }

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
  }, [isMobile]);

  // Preserve a single high-priority LCP candidate on desktop initial load.
  useEffect(() => {
    if (isMobile || !slides || slides.length === 0) return;
    if (prefersReducedMotion) return;

    const totalMs = Math.max(2, Number(settings.display_duration) || 6) * 1000;
    const t = setTimeout(() => setStarted(true), totalMs);
    return () => clearTimeout(t);
  }, [isMobile, slides, settings.display_duration, prefersReducedMotion]);

  // Once the desktop slideshow has started, advance on the configured cadence.
  useEffect(() => {
    if (isMobile || !started || !slides || slides.length <= 1) return;

    const totalMs = Math.max(2, Number(settings.display_duration) || 6) * 1000;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % slides.length),
      totalMs,
    );

    return () => clearInterval(t);
  }, [isMobile, started, slides, settings.display_duration]);

  if (
    isMobile ||
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
