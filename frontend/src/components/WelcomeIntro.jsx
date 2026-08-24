import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";

const SESSION_KEY = "sge-welcome-intro-seen-v7";

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
    while (merged.length < 3) merged.push(heroImage);
    return merged.slice(0, 3);
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
    }, isMobile ? 5000 : 5600);

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

  const blendMask = {
    WebkitMaskImage: "radial-gradient(ellipse at center, black 58%, rgba(0,0,0,.96) 70%, rgba(0,0,0,.55) 84%, transparent 100%)",
    maskImage: "radial-gradient(ellipse at center, black 58%, rgba(0,0,0,.96) 70%, rgba(0,0,0,.55) 84%, transparent 100%)",
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="welcome-intro"
          role="dialog"
          aria-modal="true"
          aria-label="Samrat Glass Emporium — A Legacy in Light"
          className="fixed inset-0 z-[100] overflow-hidden bg-[#050405]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.01, filter: "blur(3px)" }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 74% 48%, rgba(202,160,72,0.14), transparent 20%), radial-gradient(circle at 18% 18%, rgba(76,20,49,0.22), transparent 34%), linear-gradient(125deg, #050405 0%, #080507 46%, #020202 100%)",
            }}
          />

          <motion.div
            aria-hidden
            className="absolute left-[11vw] top-[9vh] h-[1px] w-[18vw] origin-left bg-gradient-to-r from-[#D4AF37]/70 to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.45, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />

          <motion.div
            aria-hidden
            className="absolute right-[8vw] top-[10vh] h-[80vh] w-[48vw]"
            initial={{ opacity: 0, x: 70, scale: 0.93 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1.65, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.img
              src={productImages[1] || heroImage}
              alt=""
              className="h-full w-full object-contain mix-blend-screen"
              style={blendMask}
              initial={{ scale: 1.12, filter: "brightness(0.12) saturate(0.55) blur(6px)" }}
              animate={{
                scale: 1,
                filter: [
                  "brightness(0.12) saturate(0.55) blur(6px)",
                  "brightness(0.38) saturate(0.72) blur(2px)",
                  "brightness(1.18) saturate(1.02) blur(0px)",
                  "brightness(0.92) saturate(0.96) blur(0px)",
                ],
              }}
              transition={{
                scale: { duration: 4.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
                filter: { duration: 2.65, delay: 0.72, times: [0, 0.34, 0.7, 1] },
              }}
            />
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute right-[24vw] top-[20vh] h-[46vh] w-[18vw] rounded-full blur-3xl"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0, 0.34, 0.14], scale: [0.7, 1.08, 1] }}
            transition={{ duration: 2.5, delay: 0.9, times: [0, 0.55, 1] }}
            style={{ background: "rgba(222,181,87,0.22)" }}
          />

          <motion.div
            aria-hidden
            className="absolute -left-[5vw] bottom-[-3vh] hidden h-[44vh] w-[26vw] md:block"
            initial={{ opacity: 0, x: -40, y: 25, filter: "blur(10px) brightness(0.18)" }}
            animate={{ opacity: 0.18, x: 0, y: 0, filter: "blur(5px) brightness(0.45)" }}
            transition={{ duration: 1.5, delay: 1.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={productImages[0] || heroImage}
              alt=""
              className="h-full w-full object-contain mix-blend-screen"
              style={blendMask}
            />
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute right-[-7vw] bottom-[-2vh] hidden h-[42vh] w-[24vw] md:block"
            initial={{ opacity: 0, x: 45, y: 28, filter: "blur(12px) brightness(0.15)" }}
            animate={{ opacity: 0.11, x: 0, y: 0, filter: "blur(7px) brightness(0.4)" }}
            transition={{ duration: 1.5, delay: 1.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={productImages[2] || heroImage}
              alt=""
              className="h-full w-full object-contain mix-blend-screen"
              style={blendMask}
            />
          </motion.div>

          <motion.div
            className="absolute left-[8vw] top-[19vh] z-30 w-[42vw] max-w-[620px] md:left-[9vw] md:top-[20vh]"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.16, delayChildren: 1.55 } } }}
          >
            <motion.div
              className="mb-6 text-[9px] uppercase tracking-[0.48em] text-[#D5AE4C] sm:text-[10px] md:text-[11px]"
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
            >
              Samrat Glass Emporium · Since 1981
            </motion.div>

            <motion.h2
              className="font-serif text-[3.25rem] leading-[0.92] tracking-[-0.035em] text-white sm:text-6xl md:text-[5.15rem] lg:text-[5.8rem]"
              variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] } } }}
            >
              A Legacy
              <span className="block italic font-normal text-[#d2a950]">in Light</span>
            </motion.h2>

            <motion.div
              className="mt-7 flex items-center gap-4"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.7 } } }}
            >
              <span className="h-px w-16 bg-[#D4AF37]/75 md:w-24" />
              <span className="text-[8px] uppercase tracking-[0.4em] text-white/46 sm:text-[9px]">
                Firozabad · India
              </span>
            </motion.div>

            <motion.p
              className="mt-5 max-w-sm text-[10px] uppercase leading-relaxed tracking-[0.24em] text-white/58 md:text-[11px]"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.75 } } }}
            >
              Handcrafted glass lighting from Firozabad, since 1981
            </motion.p>
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute inset-y-0 z-20 w-[13vw] min-w-[110px]"
            initial={{ x: "-16vw", opacity: 0 }}
            animate={{ x: "116vw", opacity: [0, 0.34, 0] }}
            transition={{ duration: 2.0, delay: 3.3, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,241,205,0.08), transparent)",
              filter: "blur(24px)",
              transform: "skewX(-12deg)",
            }}
          />

          <motion.button
            type="button"
            onClick={dismiss}
            data-testid="welcome-intro-skip"
            className="absolute right-4 top-4 z-40 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D4AF37]/38 bg-black/45 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/78 backdrop-blur-md transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] md:right-8 md:top-8 md:px-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
          >
            Skip intro <ArrowRight size={13} />
          </motion.button>

          <motion.div
            aria-hidden
            className="absolute bottom-5 left-[8vw] z-30 text-[8px] uppercase tracking-[0.42em] text-white/24 sm:text-[9px] md:left-[9vw] md:bottom-7"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.55, duration: 0.75 }}
          >
            Heritage · Craft · Illumination
          </motion.div>

          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/25 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
