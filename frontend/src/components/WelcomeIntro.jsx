import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";

const SESSION_KEY = "sge-welcome-intro-seen-v6";

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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="welcome-intro"
          role="dialog"
          aria-modal="true"
          aria-label="Samrat Glass Emporium — A Legacy in Light"
          className="fixed inset-0 z-[100] overflow-hidden bg-[#030103]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.018, filter: "blur(5px)" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.img
            src={heroImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.18, opacity: 0 }}
            animate={{ scale: 1.035, opacity: 0.12 }}
            transition={{ duration: 5.5, ease: [0.16, 1, 0.3, 1] }}
          />

          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 70% 54%, rgba(212,175,55,0.18), transparent 23%), radial-gradient(circle at 24% 16%, rgba(98,31,62,0.24), transparent 34%), linear-gradient(90deg, rgba(3,1,3,0.97) 0%, rgba(5,2,5,0.94) 42%, rgba(8,3,7,0.72) 69%, rgba(3,1,3,0.92) 100%)",
            }}
          />

          <motion.div
            aria-hidden
            className="absolute right-[8vw] top-[18vh] h-[58vh] w-[44vw] rounded-full blur-3xl"
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{ opacity: [0, 0.22, 0.13], scale: [0.72, 1.08, 1] }}
            transition={{ duration: 2.6, delay: 0.65, times: [0, 0.6, 1], ease: [0.16, 1, 0.3, 1] }}
            style={{ background: "rgba(212,175,55,0.23)" }}
          />

          <motion.div
            className="absolute right-[3vw] top-[13vh] z-10 flex h-[74vh] w-[50vw] items-center justify-center md:right-[5vw] md:w-[46vw]"
            initial={{ opacity: 0, x: 90, y: 35, scale: 0.84, filter: "blur(14px) brightness(0.18)" }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px) brightness(1)" }}
            transition={{ duration: 1.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.img
              src={productImages[1] || heroImage}
              alt=""
              className="h-full w-full object-contain drop-shadow-[0_34px_80px_rgba(0,0,0,0.85)]"
              initial={{ scale: 1.12, filter: "brightness(0.2) saturate(0.5)" }}
              animate={{
                scale: 1,
                filter: [
                  "brightness(0.2) saturate(0.5)",
                  "brightness(0.42) saturate(0.7)",
                  "brightness(1.3) saturate(1.08)",
                  "brightness(0.96) saturate(0.98)",
                ],
              }}
              transition={{
                scale: { duration: 4.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] },
                filter: { duration: 2.7, delay: 0.8, times: [0, 0.36, 0.7, 1] },
              }}
            />
          </motion.div>

          <motion.div
            className="absolute -left-[6vw] bottom-[2vh] z-[4] flex h-[46vh] w-[31vw] items-end justify-center"
            initial={{ opacity: 0, x: -70, y: 35, scale: 0.82, filter: "blur(13px) brightness(0.22)" }}
            animate={{ opacity: 0.34, x: 0, y: 0, scale: 1, filter: "blur(2px) brightness(0.65)" }}
            transition={{ duration: 1.65, delay: 1.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src={productImages[0] || heroImage} alt="" className="h-full w-full object-contain" />
          </motion.div>

          <motion.div
            className="absolute right-[-9vw] bottom-[-2vh] z-[3] flex h-[42vh] w-[30vw] items-end justify-center"
            initial={{ opacity: 0, x: 65, y: 40, scale: 0.82, filter: "blur(14px) brightness(0.2)" }}
            animate={{ opacity: 0.22, x: 0, y: 0, scale: 1, filter: "blur(4px) brightness(0.55)" }}
            transition={{ duration: 1.6, delay: 1.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src={productImages[2] || heroImage} alt="" className="h-full w-full object-contain" />
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute right-[24vw] top-[22vh] z-[11] h-[38vh] w-px bg-gradient-to-b from-transparent via-[#F5D98C]/70 to-transparent blur-[1px]"
            initial={{ opacity: 0, scaleY: 0.4 }}
            animate={{ opacity: [0, 0.95, 0], scaleY: [0.4, 1, 1.15] }}
            transition={{ duration: 1.45, delay: 1.65, times: [0, 0.45, 1] }}
          />

          <motion.div
            className="absolute left-[7vw] top-[14vh] z-30 w-[55vw] max-w-[760px] text-left md:left-[8vw] md:top-[16vh] md:w-[48vw]"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.16, delayChildren: 1.65 } } }}
          >
            <motion.div
              className="text-[9px] uppercase tracking-[0.5em] text-[#D4AF37] sm:text-[10px] md:text-xs"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.72 } } }}
            >
              Samrat Glass Emporium · Firozabad · Since 1981
            </motion.div>

            <motion.h2
              className="mt-6 max-w-[9ch] font-serif text-[3.7rem] leading-[0.82] tracking-[-0.04em] text-white sm:text-7xl md:text-[6.2rem] lg:text-[7.3rem]"
              variants={{ hidden: { opacity: 0, y: 34, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 1.05, ease: [0.16, 1, 0.3, 1] } } }}
            >
              A Legacy
              <span className="block italic brand-gradient-text">in Light</span>
            </motion.h2>

            <motion.div
              className="mt-6 h-px w-32 bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent md:w-44"
              variants={{ hidden: { opacity: 0, scaleX: 0, originX: 0 }, visible: { opacity: 1, scaleX: 1, transition: { duration: 0.85 } } }}
            />

            <motion.p
              className="mt-5 max-w-md text-[9px] uppercase tracking-[0.26em] text-white/62 sm:text-[10px] md:text-xs"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.75 } } }}
            >
              Handcrafted glass lighting from Firozabad, since 1981
            </motion.p>
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute inset-y-0 z-20 w-[15vw] min-w-[120px]"
            initial={{ x: "-20vw", opacity: 0 }}
            animate={{ x: "118vw", opacity: [0, 0.42, 0] }}
            transition={{ duration: 2.05, delay: 3.3, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,240,202,0.1), transparent)",
              filter: "blur(24px)",
              transform: "skewX(-12deg)",
            }}
          />

          <motion.button
            type="button"
            onClick={dismiss}
            data-testid="welcome-intro-skip"
            className="absolute right-4 top-4 z-40 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D4AF37]/45 bg-black/40 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/80 backdrop-blur-md transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] md:right-8 md:top-8 md:px-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            Skip intro <ArrowRight size={13} />
          </motion.button>

          <motion.div
            aria-hidden
            className="absolute bottom-5 left-[7vw] z-30 text-[8px] uppercase tracking-[0.4em] text-white/30 sm:text-[9px] md:left-[8vw] md:bottom-7"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.65, duration: 0.75 }}
          >
            Heritage · Craft · Illumination
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
