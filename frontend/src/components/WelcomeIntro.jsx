import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";

const SESSION_KEY = "sge-welcome-intro-seen-v8";

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
    while (merged.length < 2) merged.push(heroImage);
    return merged.slice(0, 2);
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
    }, isMobile ? 5000 : 5550);

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

  const softMask = {
    WebkitMaskImage:
      "radial-gradient(ellipse at 56% 50%, #000 52%, rgba(0,0,0,.96) 66%, rgba(0,0,0,.7) 79%, rgba(0,0,0,.22) 91%, transparent 100%)",
    maskImage:
      "radial-gradient(ellipse at 56% 50%, #000 52%, rgba(0,0,0,.96) 66%, rgba(0,0,0,.7) 79%, rgba(0,0,0,.22) 91%, transparent 100%)",
  };

  const heroFixture = productImages[1] || productImages[0] || heroImage;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="welcome-intro"
          role="dialog"
          aria-modal="true"
          aria-label="Samrat Glass Emporium — A Legacy in Light"
          className="fixed inset-0 z-[100] overflow-hidden bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.012, filter: "blur(4px)" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 73% 46%, rgba(219,174,80,0.18), transparent 18%), radial-gradient(circle at 17% 12%, rgba(91,25,58,0.22), transparent 30%), linear-gradient(115deg, #030203 0%, #070407 42%, #020202 72%, #000 100%)",
            }}
          />

          <motion.img
            aria-hidden
            src={heroFixture}
            alt=""
            className="absolute right-[-8vw] top-[-5vh] h-[112vh] w-[70vw] object-contain opacity-20 mix-blend-screen blur-3xl md:right-[-4vw] md:w-[62vw]"
            style={softMask}
            initial={{ opacity: 0, scale: 1.14 }}
            animate={{ opacity: 0.17, scale: 1.02 }}
            transition={{ duration: 5.1, ease: [0.16, 1, 0.3, 1] }}
          />

          <motion.div
            aria-hidden
            className="absolute right-[-2vw] top-[4vh] z-10 h-[91vh] w-[61vw] md:right-[1vw] md:w-[56vw]"
            initial={{ opacity: 0, x: 90, scale: 0.95, filter: "blur(10px) brightness(0.18)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px) brightness(1)" }}
            transition={{ duration: 1.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.img
              src={heroFixture}
              alt=""
              className="h-full w-full object-contain mix-blend-screen drop-shadow-[0_32px_80px_rgba(0,0,0,0.92)]"
              style={softMask}
              initial={{ scale: 1.11, filter: "brightness(0.16) saturate(0.58)" }}
              animate={{
                scale: 1,
                filter: [
                  "brightness(0.16) saturate(0.58)",
                  "brightness(0.42) saturate(0.74)",
                  "brightness(1.22) saturate(1.05)",
                  "brightness(0.94) saturate(0.97)",
                ],
              }}
              transition={{
                scale: { duration: 4.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
                filter: { duration: 2.65, delay: 0.75, times: [0, 0.35, 0.7, 1] },
              }}
            />
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute right-[19vw] top-[22vh] z-[9] h-[46vh] w-[18vw] rounded-full blur-3xl"
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{ opacity: [0, 0.34, 0.13], scale: [0.72, 1.08, 1] }}
            transition={{ duration: 2.55, delay: 0.82, times: [0, 0.55, 1] }}
            style={{ background: "rgba(220,177,85,0.28)" }}
          />

          <motion.div
            aria-hidden
            className="absolute inset-y-0 left-[54vw] z-[12] w-px bg-gradient-to-b from-transparent via-[#f7dfa0]/85 to-transparent"
            initial={{ opacity: 0, scaleY: 0.28 }}
            animate={{ opacity: [0, 1, 0], scaleY: [0.28, 1, 1.15] }}
            transition={{ duration: 1.3, delay: 1.55, times: [0, 0.46, 1] }}
          />

          <motion.div
            className="absolute left-[7vw] top-1/2 z-30 w-[42vw] max-w-[700px] -translate-y-1/2 md:left-[8vw] md:w-[39vw]"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.14, delayChildren: 1.45 } } }}
          >
            <motion.div
              className="mb-7 flex items-center gap-4"
              variants={{ hidden: { opacity: 0, x: -14 }, visible: { opacity: 1, x: 0, transition: { duration: 0.72 } } }}
            >
              <span className="h-px w-12 bg-[#D4AF37]/85 md:w-16" />
              <span className="text-[9px] uppercase tracking-[0.46em] text-[#D5AE4C] sm:text-[10px] md:text-[11px]">
                Samrat Glass Emporium · 1981
              </span>
            </motion.div>

            <motion.h2
              className="font-serif text-[3.2rem] leading-[0.88] tracking-[-0.04em] text-white sm:text-6xl md:text-[5rem] lg:text-[5.7rem]"
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] } } }}
            >
              A Legacy
              <span className="block italic font-normal text-[#d8b05b]">in Light</span>
            </motion.h2>

            <motion.p
              className="mt-7 max-w-[31rem] text-[10px] uppercase leading-[1.8] tracking-[0.24em] text-white/58 md:text-[11px]"
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.75 } } }}
            >
              Handcrafted glass lighting from Firozabad, since 1981
            </motion.p>

            <motion.div
              className="mt-9 flex items-center gap-5 text-[8px] uppercase tracking-[0.42em] text-white/30 sm:text-[9px]"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.7 } } }}
            >
              <span>Heritage</span>
              <span className="h-1 w-1 rounded-full bg-[#D4AF37]/55" />
              <span>Craft</span>
              <span className="h-1 w-1 rounded-full bg-[#D4AF37]/55" />
              <span>Illumination</span>
            </motion.div>
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute inset-x-0 bottom-[9vh] z-20 h-px origin-left bg-gradient-to-r from-transparent via-[#D4AF37]/34 to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 2.6, duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
          />

          <motion.div
            aria-hidden
            className="absolute inset-y-0 z-20 w-[13vw] min-w-[110px]"
            initial={{ x: "-15vw", opacity: 0 }}
            animate={{ x: "116vw", opacity: [0, 0.33, 0] }}
            transition={{ duration: 1.95, delay: 3.25, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,242,209,0.08), transparent)",
              filter: "blur(22px)",
              transform: "skewX(-12deg)",
            }}
          />

          <motion.button
            type="button"
            onClick={dismiss}
            data-testid="welcome-intro-skip"
            className="absolute right-4 top-4 z-40 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-black/45 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/76 backdrop-blur-md transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] md:right-8 md:top-8 md:px-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62, duration: 0.6 }}
          >
            Skip intro <ArrowRight size={13} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
