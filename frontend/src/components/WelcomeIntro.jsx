import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";

const SESSION_KEY = "sge-welcome-intro-seen-v4";

const BACKDROP_CONFIGS = [
  { index: 0, x: "-41vw", y: 42, scale: 0.76, opacity: 0.16, delay: 0.86 },
  { index: 1, x: "-30vw", y: 12, scale: 0.88, opacity: 0.22, delay: 0.72 },
  { index: 5, x: "30vw", y: 12, scale: 0.88, opacity: 0.22, delay: 0.78 },
  { index: 6, x: "41vw", y: 42, scale: 0.76, opacity: 0.16, delay: 0.94 },
];

const FEATURE_CONFIGS = [
  { index: 2, x: "-21vw", y: 34, scale: 0.84, opacity: 0.82, delay: 0.64 },
  { index: 3, x: "0vw", y: 12, scale: 1.18, opacity: 1, delay: 0.38 },
  { index: 4, x: "21vw", y: 34, scale: 0.84, opacity: 0.82, delay: 0.7 },
];

export default function WelcomeIntro() {
  const { settings, hp } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  const heroImage = api.resolveImage(settings?.hero_image || BRAND_PLACEHOLDER_HERO);

  const productImages = useMemo(() => {
    const atelierImages = (hp?.atelier?.images || [])
      .map((item) => item?.src)
      .filter(Boolean)
      .map((src) => api.resolveImage(src));

    const unique = [...new Set(atelierImages)];
    const merged = [...unique];
    while (merged.length < 7) merged.push(heroImage);
    return merged.slice(0, 7);
  }, [heroImage, hp?.atelier?.images]);

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
    const isMobile = window.matchMedia?.("(max-width: 767px)")?.matches;
    const timer = window.setTimeout(() => {
      try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch (_) {}
      setVisible(false);
    }, isMobile ? 5000 : 5650);

    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion]);

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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="welcome-intro"
          role="dialog"
          aria-modal="true"
          aria-label="Samrat Glass Emporium — A Legacy in Light"
          className="fixed inset-0 z-[100] overflow-hidden bg-[#070206]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.015, filter: "blur(4px)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.img
            src={heroImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.14, opacity: 0 }}
            animate={{ scale: 1.03, opacity: 0.16 }}
            transition={{ duration: 5.4, ease: [0.16, 1, 0.3, 1] }}
          />

          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse at 50% 73%, rgba(212,175,55,0.18), transparent 28%), radial-gradient(circle at 50% 0%, rgba(111,43,76,0.24), transparent 40%), linear-gradient(180deg, rgba(5,1,4,0.9) 0%, rgba(8,3,7,0.76) 38%, rgba(14,5,11,0.9) 78%, #070206 100%)",
            }}
          />

          <div
            aria-hidden
            className="absolute left-1/2 top-[5vh] z-[8] h-[34vh] w-[90vw] max-w-5xl -translate-x-1/2 rounded-[50%] blur-3xl"
            style={{ background: "rgba(4,1,4,0.58)" }}
          />

          <motion.div
            aria-hidden
            className="absolute inset-y-0 w-[17vw] min-w-[140px]"
            initial={{ x: "-28vw", opacity: 0 }}
            animate={{ x: "120vw", opacity: [0, 0.5, 0] }}
            transition={{ duration: 3.25, delay: 1.65, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,235,183,0.11), transparent)",
              filter: "blur(24px)",
              transform: "skewX(-10deg)",
            }}
          />

          <div className="absolute inset-x-0 bottom-[4.5vh] top-[32vh] pointer-events-none">
            {BACKDROP_CONFIGS.map((c) => {
              const src = productImages[c.index];
              return (
                <motion.div
                  key={`backdrop-${c.index}`}
                  className="absolute left-1/2 top-1/2 flex h-[48vh] w-[24vw] min-w-[140px] max-w-[320px] -translate-x-1/2 -translate-y-1/2 items-end justify-center"
                  initial={{ opacity: 0, x: c.x, y: c.y + 80, scale: c.scale * 0.84, filter: "blur(13px) brightness(0.35)" }}
                  animate={{ opacity: c.opacity, x: c.x, y: c.y, scale: c.scale, filter: "blur(3px) brightness(0.68)" }}
                  transition={{ duration: 1.55, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
                >
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-contain drop-shadow-[0_18px_45px_rgba(0,0,0,0.65)]"
                  />
                </motion.div>
              );
            })}

            {FEATURE_CONFIGS.map((c) => {
              const src = productImages[c.index];
              const isHero = c.index === 3;
              return (
                <motion.div
                  key={`feature-${c.index}`}
                  className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-end justify-center ${
                    isHero
                      ? "z-20 h-[56vh] w-[35vw] min-w-[220px] max-w-[500px]"
                      : "z-10 h-[46vh] w-[27vw] min-w-[170px] max-w-[360px]"
                  }`}
                  initial={{ opacity: 0, x: c.x, y: c.y + 92, scale: c.scale * 0.8, filter: "blur(9px)" }}
                  animate={{ opacity: c.opacity, x: c.x, y: c.y, scale: c.scale, filter: "blur(0px)" }}
                  transition={{ duration: 1.55, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.img
                    src={src}
                    alt=""
                    className="h-full w-full object-contain drop-shadow-[0_20px_55px_rgba(0,0,0,0.72)]"
                    initial={{ scale: 1.08, filter: "brightness(0.24) saturate(0.6)" }}
                    animate={{
                      scale: 1,
                      filter: [
                        "brightness(0.24) saturate(0.6)",
                        "brightness(0.52) saturate(0.78)",
                        "brightness(1.14) saturate(1.04)",
                        "brightness(0.92) saturate(0.96)",
                      ],
                    }}
                    transition={{
                      scale: { duration: 4.2, delay: c.delay, ease: [0.16, 1, 0.3, 1] },
                      filter: { duration: 2.5, delay: isHero ? 1.1 : 1.35, times: [0, 0.34, 0.67, 1] },
                    }}
                  />
                  {isHero && (
                    <motion.div
                      aria-hidden
                      className="absolute bottom-[8%] left-1/2 h-[34%] w-[70%] -translate-x-1/2 rounded-full blur-3xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.28, 0.16] }}
                      transition={{ duration: 2.4, delay: 1.35, times: [0, 0.55, 1] }}
                      style={{ background: "rgba(212,175,55,0.28)" }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="absolute inset-x-0 top-[7.5vh] z-30 px-5 text-center pointer-events-none"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.18, delayChildren: 0.7 } } }}
          >
            <motion.div
              className="text-[9px] uppercase tracking-[0.48em] text-[#D4AF37] sm:text-[10px] md:text-xs"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }}
            >
              Samrat Glass Emporium · Firozabad · Since 1981
            </motion.div>

            <motion.h2
              className="mx-auto mt-5 max-w-5xl font-serif text-[2.9rem] leading-[0.9] text-white sm:text-6xl md:text-7xl lg:text-[5.7rem]"
              variants={{ hidden: { opacity: 0, y: 32, scale: 0.965 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 1.12, ease: [0.16, 1, 0.3, 1] } } }}
            >
              A Legacy <span className="italic brand-gradient-text">in Light</span>
            </motion.h2>

            <motion.div
              className="mx-auto mt-5 h-px w-36 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
              variants={{ hidden: { opacity: 0, scaleX: 0 }, visible: { opacity: 1, scaleX: 1, transition: { duration: 0.95 } } }}
            />

            <motion.p
              className="mx-auto mt-4 max-w-2xl text-[9px] uppercase tracking-[0.28em] text-white/68 sm:text-[10px] md:text-xs"
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.85 } } }}
            >
              Handcrafted glass lighting from Firozabad, since 1981
            </motion.p>
          </motion.div>

          <motion.button
            type="button"
            onClick={dismiss}
            data-testid="welcome-intro-skip"
            className="absolute right-4 top-4 z-40 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D4AF37]/50 bg-black/45 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/85 backdrop-blur-md transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] md:right-8 md:top-8 md:px-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.78, duration: 0.6 }}
          >
            Skip intro <ArrowRight size={13} />
          </motion.button>

          <motion.div
            aria-hidden
            className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap text-[8px] uppercase tracking-[0.38em] text-white/38 sm:text-[9px] md:bottom-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.6, duration: 0.85 }}
          >
            Heritage · Craft · Illumination
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
