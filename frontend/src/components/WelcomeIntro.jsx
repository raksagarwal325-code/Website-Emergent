import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";

const SESSION_KEY = "sge-welcome-intro-seen-v1";

export default function WelcomeIntro() {
  const { settings, hp } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  const productImages = useMemo(() => {
    const atelierImages = (hp?.atelier?.images || [])
      .map((item) => item?.src)
      .filter(Boolean)
      .slice(0, 3)
      .map((src) => api.resolveImage(src));

    if (atelierImages.length >= 3) return atelierImages;

    const hero = settings?.hero_image || BRAND_PLACEHOLDER_HERO;
    const merged = [...atelierImages];
    while (merged.length < 3) merged.push(hero);
    return merged;
  }, [hp?.atelier?.images, settings?.hero_image]);

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
    }, isMobile ? 2100 : 2900);

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
          aria-label="Welcome to Samrat Glass Emporium"
          className="fixed inset-0 z-[100] overflow-hidden bg-[#090308]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.015 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(circle at 50% 38%, rgba(212,175,55,0.18), transparent 30%), radial-gradient(circle at 50% 100%, rgba(103,34,72,0.34), transparent 48%), linear-gradient(180deg,#050205 0%,#120711 65%,#090308 100%)",
            }}
          />

          <motion.div
            aria-hidden
            className="absolute top-0 bottom-0 w-[24vw] min-w-[180px]"
            initial={{ x: "-40vw", opacity: 0 }}
            animate={{ x: "120vw", opacity: [0, 0.48, 0] }}
            transition={{ duration: 2.15, delay: 0.35, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,230,170,0.10), transparent)",
              filter: "blur(18px)",
              transform: "skewX(-12deg)",
            }}
          />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {productImages.map((src, index) => {
              const configs = [
                { x: "-34vw", y: 30, scale: 0.72, rotate: -8, delay: 0.18, opacity: 0.72 },
                { x: 0, y: -16, scale: 1.02, rotate: 0, delay: 0.05, opacity: 1 },
                { x: "34vw", y: 38, scale: 0.76, rotate: 8, delay: 0.28, opacity: 0.72 },
              ];
              const c = configs[index];
              return (
                <motion.div
                  key={`${src}-${index}`}
                  className="absolute w-[42vw] max-w-[520px] min-w-[210px] h-[58vh] max-h-[640px] flex items-center justify-center"
                  initial={{ opacity: 0, y: 110, scale: c.scale * 0.72, rotate: c.rotate * 1.6, filter: "blur(10px)" }}
                  animate={{
                    opacity: c.opacity,
                    x: c.x,
                    y: c.y,
                    scale: c.scale,
                    rotate: c.rotate,
                    filter: "blur(0px)",
                  }}
                  transition={{ duration: 1.05, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.img
                    src={src}
                    alt=""
                    className="w-full h-full object-contain drop-shadow-[0_0_38px_rgba(212,175,55,0.20)]"
                    initial={{ filter: "brightness(0.35) saturate(0.75)" }}
                    animate={{ filter: ["brightness(0.35) saturate(0.75)", "brightness(1.05) saturate(1)", "brightness(0.92) saturate(0.95)"] }}
                    transition={{ duration: 1.5, delay: 0.45 + index * 0.12, times: [0, 0.48, 1] }}
                  />
                </motion.div>
              );
            })}
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/75 pointer-events-none" />

          <motion.div
            className="absolute inset-x-0 top-[15%] md:top-[13%] px-6 text-center z-10 pointer-events-none"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12, delayChildren: 0.46 } },
            }}
          >
            <motion.div
              className="text-[10px] md:text-xs uppercase tracking-[0.42em] text-[#D4AF37]"
              variants={{
                hidden: { opacity: 0, y: 14 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.65 } },
              }}
            >
              Samrat Glass Emporium
            </motion.div>
            <motion.h2
              className="mt-4 font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[0.95] text-white"
              variants={{
                hidden: { opacity: 0, y: 28, scale: 0.96 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              Welcome to the<br />
              <span className="italic brand-gradient-text">World of Light</span>
            </motion.h2>
            <motion.div
              className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
              variants={{
                hidden: { opacity: 0, scaleX: 0 },
                visible: { opacity: 1, scaleX: 1, transition: { duration: 0.75 } },
              }}
            />
            <motion.p
              className="mt-4 text-[10px] sm:text-xs uppercase tracking-[0.32em] text-white/65"
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.65 } },
              }}
            >
              Handcrafted in Firozabad since 1981
            </motion.p>
          </motion.div>

          <motion.button
            type="button"
            onClick={dismiss}
            data-testid="welcome-intro-skip"
            className="absolute right-5 top-5 md:right-8 md:top-8 z-20 min-w-[44px] min-h-[44px] px-3 text-[10px] uppercase tracking-[0.28em] text-white/55 hover:text-[#D4AF37] transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.5 }}
          >
            Skip
          </motion.button>

          <motion.div
            aria-hidden
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-[9px] uppercase tracking-[0.34em] text-white/35"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
          >
            Illuminate the extraordinary
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
