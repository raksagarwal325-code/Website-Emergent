import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";

const SESSION_KEY = "sge-welcome-intro-seen-v5";

const SHADOW_CONFIGS = [
  { index: 0, x: "-42vw", y: 56, scale: 0.78, opacity: 0.11, delay: 1.25 },
  { index: 1, x: "-31vw", y: 34, scale: 0.9, opacity: 0.16, delay: 1.08 },
  { index: 5, x: "31vw", y: 34, scale: 0.9, opacity: 0.16, delay: 1.12 },
  { index: 6, x: "42vw", y: 56, scale: 0.78, opacity: 0.11, delay: 1.3 },
];

const FEATURE_CONFIGS = [
  { index: 2, x: "-23vw", y: 20, scale: 0.92, opacity: 0.7, delay: 1.0 },
  { index: 3, x: "0vw", y: -8, scale: 1.34, opacity: 1, delay: 0.38 },
  { index: 4, x: "23vw", y: 20, scale: 0.92, opacity: 0.7, delay: 1.08 },
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
    }, isMobile ? 5100 : 5750);

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
          className="fixed inset-0 z-[100] overflow-hidden bg-[#040104]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.012, filter: "blur(3px)" }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.img
            src={heroImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.16, opacity: 0 }}
            animate={{ scale: 1.035, opacity: 0.11 }}
            transition={{ duration: 5.6, ease: [0.16, 1, 0.3, 1] }}
          />

          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse at 50% 62%, rgba(212,175,55,0.13), transparent 22%), radial-gradient(circle at 50% 0%, rgba(103,35,68,0.2), transparent 36%), linear-gradient(180deg, #040104 0%, rgba(8,3,7,0.96) 30%, rgba(10,4,9,0.88) 58%, #050105 100%)",
            }}
          />

          <motion.div
            aria-hidden
            className="absolute left-1/2 top-[27vh] h-[46vh] w-[46vw] -translate-x-1/2 rounded-full blur-3xl"
            initial={{ opacity: 0, scale: 0.76 }}
            animate={{ opacity: [0, 0.2, 0.12], scale: [0.76, 1.04, 1] }}
            transition={{ duration: 2.9, delay: 0.82, times: [0, 0.58, 1], ease: [0.16, 1, 0.3, 1] }}
            style={{ background: "rgba(212,175,55,0.24)" }}
          />

          <div className="absolute inset-x-0 bottom-[3vh] top-[20vh] pointer-events-none">
            {SHADOW_CONFIGS.map((c) => {
              const src = productImages[c.index];
              return (
                <motion.div
                  key={`shadow-${c.index}`}
                  className="absolute left-1/2 top-1/2 flex h-[49vh] w-[23vw] min-w-[135px] max-w-[320px] -translate-x-1/2 -translate-y-1/2 items-end justify-center"
                  initial={{ opacity: 0, x: c.x, y: c.y + 60, scale: c.scale * 0.86, filter: "blur(15px) brightness(0.2)" }}
                  animate={{ opacity: c.opacity, x: c.x, y: c.y, scale: c.scale, filter: "blur(5px) brightness(0.5)" }}
                  transition={{ duration: 1.6, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
                >
                  <img src={src} alt="" className="h-full w-full object-contain" />
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
                      ? "z-20 h-[62vh] w-[41vw] min-w-[245px] max-w-[560px]"
                      : "z-10 h-[48vh] w-[28vw] min-w-[175px] max-w-[370px]"
                  }`}
                  initial={{ opacity: 0, x: c.x, y: c.y + (isHero ? 72 : 54), scale: c.scale * 0.78, filter: "blur(12px) brightness(0.18)" }}
                  animate={{ opacity: c.opacity, x: c.x, y: c.y, scale: c.scale, filter: "blur(0px) brightness(1)" }}
                  transition={{ duration: isHero ? 1.75 : 1.55, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.img
                    src={src}
                    alt=""
                    className="h-full w-full object-contain drop-shadow-[0_24px_60px_rgba(0,0,0,0.78)]"
                    initial={{ scale: isHero ? 1.12 : 1.06, filter: "brightness(0.18) saturate(0.52)" }}
                    animate={{
                      scale: 1,
                      filter: isHero
                        ? [
                            "brightness(0.18) saturate(0.52)",
                            "brightness(0.38) saturate(0.68)",
                            "brightness(1.28) saturate(1.08)",
                            "brightness(0.94) saturate(0.98)",
                          ]
                        : [
                            "brightness(0.2) saturate(0.55)",
                            "brightness(0.46) saturate(0.72)",
                            "brightness(0.88) saturate(0.92)",
                          ],
                    }}
                    transition={{
                      scale: { duration: 4.3, delay: c.delay, ease: [0.16, 1, 0.3, 1] },
                      filter: isHero
                        ? { duration: 2.65, delay: 0.95, times: [0, 0.34, 0.67, 1] }
                        : { duration: 2.25, delay: 1.4, times: [0, 0.55, 1] },
                    }}
                  />

                  {isHero && (
                    <>
                      <motion.div
                        aria-hidden
                        className="absolute bottom-[11%] left-1/2 h-[38%] w-[72%] -translate-x-1/2 rounded-full blur-3xl"
                        initial={{ opacity: 0, scale: 0.72 }}
                        animate={{ opacity: [0, 0.38, 0.14], scale: [0.72, 1.08, 1] }}
                        transition={{ duration: 2.55, delay: 1.0, times: [0, 0.56, 1] }}
                        style={{ background: "rgba(212,175,55,0.32)" }}
                      />
                      <motion.div
                        aria-hidden
                        className="absolute inset-y-[8%] left-1/2 w-[2px] -translate-x-1/2 blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.9, 0] }}
                        transition={{ duration: 1.25, delay: 1.72, times: [0, 0.48, 1] }}
                        style={{ background: "linear-gradient(180deg, transparent, rgba(255,243,203,0.92), transparent)" }}
                      />
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="absolute inset-x-0 top-[7vh] z-30 px-5 text-center pointer-events-none"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.18, delayChildren: 2.05 } } }}
          >
            <motion.div
              className="text-[9px] uppercase tracking-[0.5em] text-[#D4AF37] sm:text-[10px] md:text-xs"
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.75 } } }}
            >
              Samrat Glass Emporium · Firozabad · Since 1981
            </motion.div>

            <motion.h2
              className="mx-auto mt-5 max-w-5xl font-serif text-[2.95rem] leading-[0.9] text-white sm:text-6xl md:text-7xl lg:text-[5.85rem]"
              variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 1.02, ease: [0.16, 1, 0.3, 1] } } }}
            >
              A Legacy <span className="italic brand-gradient-text">in Light</span>
            </motion.h2>

            <motion.div
              className="mx-auto mt-5 h-px w-32 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
              variants={{ hidden: { opacity: 0, scaleX: 0 }, visible: { opacity: 1, scaleX: 1, transition: { duration: 0.85 } } }}
            />

            <motion.p
              className="mx-auto mt-4 max-w-2xl text-[9px] uppercase tracking-[0.27em] text-white/66 sm:text-[10px] md:text-xs"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }}
            >
              Handcrafted glass lighting from Firozabad, since 1981
            </motion.p>
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute inset-y-0 z-25 w-[16vw] min-w-[130px]"
            initial={{ x: "-24vw", opacity: 0 }}
            animate={{ x: "120vw", opacity: [0, 0.45, 0] }}
            transition={{ duration: 2.15, delay: 3.2, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,239,196,0.1), transparent)",
              filter: "blur(24px)",
              transform: "skewX(-10deg)",
            }}
          />

          <motion.button
            type="button"
            onClick={dismiss}
            data-testid="welcome-intro-skip"
            className="absolute right-4 top-4 z-40 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D4AF37]/48 bg-black/42 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/82 backdrop-blur-md transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] md:right-8 md:top-8 md:px-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.72, duration: 0.6 }}
          >
            Skip intro <ArrowRight size={13} />
          </motion.button>

          <motion.div
            aria-hidden
            className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap text-[8px] uppercase tracking-[0.38em] text-white/32 sm:text-[9px] md:bottom-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.5, duration: 0.75 }}
          >
            Heritage · Craft · Illumination
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
