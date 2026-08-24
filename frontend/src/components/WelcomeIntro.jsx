import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";

const SESSION_KEY = "sge-welcome-intro-seen-v3";

const PRODUCT_CONFIGS = [
  { x: "-43vw", y: 46, scale: 0.62, rotate: -4.5, opacity: 0.34, z: 1, delay: 0.95 },
  { x: "-30vw", y: 24, scale: 0.76, rotate: -2.6, opacity: 0.58, z: 2, delay: 0.78 },
  { x: "-17vw", y: 10, scale: 0.88, rotate: -1.2, opacity: 0.82, z: 4, delay: 0.62 },
  { x: "0vw", y: 20, scale: 1.04, rotate: 0, opacity: 1, z: 7, delay: 0.42 },
  { x: "17vw", y: 10, scale: 0.88, rotate: 1.2, opacity: 0.82, z: 4, delay: 0.68 },
  { x: "30vw", y: 24, scale: 0.76, rotate: 2.6, opacity: 0.58, z: 2, delay: 0.84 },
  { x: "43vw", y: 46, scale: 0.62, rotate: 4.5, opacity: 0.34, z: 1, delay: 1.02 },
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
          exit={{ opacity: 0, scale: 1.018, filter: "blur(5px)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.img
            src={heroImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.14, opacity: 0 }}
            animate={{ scale: 1.025, opacity: 0.2 }}
            transition={{ duration: 5.4, ease: [0.16, 1, 0.3, 1] }}
          />

          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse at 50% 69%, rgba(212,175,55,0.15), transparent 31%), radial-gradient(circle at 50% 0%, rgba(111,43,76,0.28), transparent 42%), linear-gradient(180deg, rgba(5,1,4,0.78) 0%, rgba(9,3,8,0.70) 42%, rgba(15,5,12,0.9) 78%, #070206 100%)",
            }}
          />

          <div
            aria-hidden
            className="absolute left-1/2 top-[7vh] z-[8] h-[38vh] w-[92vw] max-w-6xl -translate-x-1/2 rounded-[50%] blur-3xl"
            style={{ background: "rgba(4,1,4,0.42)" }}
          />

          <motion.div
            aria-hidden
            className="absolute inset-y-0 w-[17vw] min-w-[140px]"
            initial={{ x: "-28vw", opacity: 0 }}
            animate={{ x: "120vw", opacity: [0, 0.55, 0] }}
            transition={{ duration: 3.4, delay: 1.55, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,235,183,0.11), transparent)",
              filter: "blur(24px)",
              transform: "skewX(-10deg)",
            }}
          />

          <div className="absolute inset-x-0 bottom-[5.5vh] top-[31vh] pointer-events-none">
            {productImages.map((src, index) => {
              const c = PRODUCT_CONFIGS[index];
              const isHero = index === 3;
              return (
                <motion.div
                  key={`${src}-${index}`}
                  className="absolute left-1/2 top-1/2 flex h-[47vh] w-[27vw] min-w-[150px] max-w-[390px] -translate-x-1/2 -translate-y-1/2 items-center justify-center will-change-transform"
                  style={{ zIndex: c.z }}
                  initial={{ opacity: 0, x: c.x, y: c.y + 105, scale: c.scale * 0.77, rotate: c.rotate * 1.5, filter: "blur(10px)" }}
                  animate={{ opacity: c.opacity, x: c.x, y: c.y, scale: c.scale, rotate: c.rotate, filter: "blur(0px)" }}
                  transition={{ duration: 1.5, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.div
                    className={`relative flex h-full w-full items-end justify-center overflow-hidden border ${
                      isHero
                        ? "rounded-t-[12rem] border-[#D4AF37]/45 bg-black/20 shadow-[0_0_80px_rgba(212,175,55,0.11)]"
                        : "rounded-t-[9rem] border-[#D4AF37]/18 bg-black/15"
                    }`}
                  >
                    <motion.img
                      src={src}
                      alt=""
                      className="h-full w-full object-contain px-2 pt-3 drop-shadow-[0_14px_35px_rgba(0,0,0,0.55)]"
                      initial={{ scale: 1.1, filter: "brightness(0.26) saturate(0.62)" }}
                      animate={{
                        scale: 1,
                        filter: [
                          "brightness(0.26) saturate(0.62)",
                          "brightness(0.56) saturate(0.78)",
                          "brightness(1.12) saturate(1.03)",
                          "brightness(0.9) saturate(0.95)",
                        ],
                      }}
                      transition={{
                        scale: { duration: 4.2, delay: c.delay, ease: [0.16, 1, 0.3, 1] },
                        filter: { duration: 2.55, delay: 1.25 + index * 0.09, times: [0, 0.34, 0.66, 1] },
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/42" />
                    <div className="absolute inset-x-[12%] bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/75 to-transparent" />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="absolute inset-x-0 top-[8.5vh] z-20 px-5 text-center pointer-events-none"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.18, delayChildren: 0.72 } } }}
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
            className="absolute right-4 top-4 z-30 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D4AF37]/50 bg-black/45 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/85 backdrop-blur-md transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] md:right-8 md:top-8 md:px-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.78, duration: 0.6 }}
          >
            Skip intro <ArrowRight size={13} />
          </motion.button>

          <motion.div
            aria-hidden
            className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-[8px] uppercase tracking-[0.38em] text-white/38 sm:text-[9px] md:bottom-6"
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
