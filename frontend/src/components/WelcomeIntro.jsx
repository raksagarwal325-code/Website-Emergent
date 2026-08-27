import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";

const SESSION_KEY = "sge-welcome-intro-seen-v13";
const PRELOAD_TIMEOUT_MS = 900;
const INTRO_DURATION_DESKTOP_MS = 4800;
const INTRO_DURATION_MOBILE_MS = 4200;
const CRITICAL_IMAGE_COUNT = 2;
const INTRO_IMAGE_COUNT = 6;

function shuffleInPlace(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export default function WelcomeIntro() {
  const { settings, hp } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  const heroImage = api.resolveImage(settings?.hero_image || BRAND_PLACEHOLDER_HERO);

  const screenImages = useMemo(() => {
    const atelierImages = (hp?.atelier?.images || [])
      .map((item) => item?.src)
      .filter(Boolean);

    const galleryImages = (hp?.gallery?.items || [])
      .flatMap((item) => item?.images || [])
      .filter(Boolean);

    const unique = [...new Set([heroImage, ...atelierImages, ...galleryImages]
      .filter(Boolean)
      .map((src) => api.resolveImage(src)))]
      .filter(Boolean);

    const shuffled = shuffleInPlace([...unique]);
    const fallback = shuffled.length ? shuffled : [heroImage];
    const merged = [...fallback];
    while (merged.length < INTRO_IMAGE_COUNT) merged.push(...fallback);
    return merged.slice(0, INTRO_IMAGE_COUNT);
  }, [heroImage, hp?.atelier?.images, hp?.gallery?.items]);

  useEffect(() => {
    if (prefersReducedMotion || typeof window === "undefined") return undefined;

    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (_) {
      alreadySeen = false;
    }
    if (alreadySeen) return undefined;

    setVisible(true);
    return undefined;
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!visible || typeof window === "undefined" || screenImages.length === 0) return undefined;

    let cancelled = false;
    const isMobile = window.matchMedia?.("(max-width: 767px)")?.matches;
    const critical = isMobile ? [BRAND_PLACEHOLDER_HERO] : screenImages.slice(0, CRITICAL_IMAGE_COUNT);
    const preload = critical.map((src) => new Promise((resolve) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = resolve;
      image.decoding = "async";
      image.fetchPriority = "high";
      image.src = src;
      if (image.complete) resolve();
    }));

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, PRELOAD_TIMEOUT_MS);

    Promise.all(preload).then(() => {
      window.clearTimeout(timeoutId);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [visible, screenImages]);

  useEffect(() => {
    if (!visible || typeof window === "undefined") return undefined;

    const isMobile = window.matchMedia?.("(max-width: 767px)")?.matches;
    const timer = window.setTimeout(() => {
      try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch (_) {}
      setVisible(false);
    }, isMobile ? INTRO_DURATION_MOBILE_MS : INTRO_DURATION_DESKTOP_MS);

    return () => window.clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible || typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [visible]);

  const dismiss = () => {
    try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch (_) {}
    setVisible(false);
  };

  if (prefersReducedMotion) return null;

  const rows = [screenImages.slice(0, 3), screenImages.slice(3, 6)];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="welcome-intro"
          role="dialog"
          aria-modal="true"
          aria-label="Samrat Glass Emporium — A Legacy in Light"
          className="fixed inset-0 z-[100] overflow-hidden bg-[#12070f]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.01, filter: "blur(3px)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-[-8vh_-8vw] rotate-[-3deg] scale-[1.08]">
              {rows.map((row, rowIndex) => {
                const doubled = [...row, ...row];
                return (
                  <motion.div
                    key={rowIndex}
                    className={`flex h-1/2 gap-4 py-2 ${rowIndex === 1 ? "-ml-[24vw]" : ""}`}
                    initial={{ x: rowIndex === 0 ? "0%" : "-18%" }}
                    animate={ready ? { x: rowIndex === 0 ? "-22%" : "4%" } : { x: rowIndex === 0 ? "0%" : "-18%" }}
                    transition={{ duration: 7.2, ease: "linear" }}
                  >
                    {doubled.map((src, index) => {
                      const globalIndex = rowIndex * 3 + (index % 3);
                      const critical = globalIndex < CRITICAL_IMAGE_COUNT;
                      return (
                        <motion.div
                          key={`${rowIndex}-${index}-${src}`}
                          className="relative h-full min-w-[34vw] overflow-hidden rounded-[2px] border border-white/[0.05] bg-black/20 md:min-w-[27vw]"
                          initial={{ opacity: 0, scale: 1.025 }}
                          animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.025 }}
                          transition={{ duration: 0.6, delay: ready ? Math.min(index * 0.025, 0.12) : 0 }}
                        >
                          <picture>
                            <source media="(max-width: 767px)" srcSet={BRAND_PLACEHOLDER_HERO} />
                            <img
                              src={src}
                              alt=""
                              className="h-full w-full object-cover"
                              draggable="false"
                              loading={critical ? "eager" : "lazy"}
                              decoding="async"
                              fetchPriority={critical ? "high" : "low"}
                            />
                          </picture>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(15,5,12,0.89) 0%, rgba(18,6,14,0.76) 31%, rgba(18,7,15,0.48) 58%, rgba(10,3,8,0.28) 100%), linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.28))",
            }}
          />

          <div
            aria-hidden
            className="absolute inset-0 opacity-35"
            style={{
              background:
                "radial-gradient(circle at 18% 42%, rgba(112,39,76,0.36), transparent 28%), radial-gradient(circle at 78% 45%, rgba(212,166,75,0.13), transparent 22%)",
            }}
          />

          <motion.div
            className="absolute left-[7vw] top-1/2 z-30 w-[78vw] max-w-[760px] -translate-y-1/2 md:left-[8vw] md:w-[44vw]"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } } }}
          >
            <motion.div
              className="mb-6 flex items-center gap-4"
              variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0, transition: { duration: 0.45 } } }}
            >
              <span className="h-px w-12 bg-[#D4AF37]/80 md:w-16" />
              <span className="text-[9px] uppercase tracking-[0.44em] text-[#D8B05B] sm:text-[10px] md:text-[11px]">
                Samrat Glass Emporium · Firozabad · Since 1981
              </span>
            </motion.div>

            <motion.h2
              className="font-serif text-[3.5rem] leading-[0.9] tracking-[-0.045em] text-white sm:text-6xl md:text-[5.2rem] lg:text-[6rem]"
              variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] } } }}
            >
              A Legacy
              <span className="block italic font-normal text-[#d9b35d]">in Light</span>
            </motion.h2>

            <motion.p
              className="mt-7 max-w-[30rem] text-[10px] uppercase leading-[1.9] tracking-[0.23em] text-white/72 md:text-[11px]"
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            >
              Handcrafted glass lighting from Firozabad, since 1981
            </motion.p>

            <motion.div
              className="mt-8 text-[8px] uppercase tracking-[0.42em] text-[#D7B15D]/72 sm:text-[9px]"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } }}
            >
              Heritage · Craft · Illumination
            </motion.div>
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute inset-y-0 z-20 w-[12vw] min-w-[100px]"
            initial={{ x: "-15vw", opacity: 0 }}
            animate={ready ? { x: "116vw", opacity: [0, 0.24, 0] } : { x: "-15vw", opacity: 0 }}
            transition={{ duration: 1.7, delay: ready ? 1.7 : 0, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,240,205,0.08), transparent)",
              filter: "blur(22px)",
              transform: "skewX(-12deg)",
            }}
          />

          <motion.button
            type="button"
            onClick={dismiss}
            data-testid="welcome-intro-skip"
            className="absolute right-4 top-4 z-40 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#140a10]/45 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/76 backdrop-blur-md transition-all hover:border-[#D4AF37]/80 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] md:right-8 md:top-8 md:px-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.45 }}
          >
            Explore the Legacy <ArrowRight size={13} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
