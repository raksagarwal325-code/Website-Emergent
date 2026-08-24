import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";

const SESSION_KEY = "sge-welcome-intro-seen-v9";

export default function WelcomeIntro() {
  const { settings, hp } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  const heroImage = api.resolveImage(settings?.hero_image || BRAND_PLACEHOLDER_HERO);

  const screenImages = useMemo(() => {
    const atelierImages = (hp?.atelier?.images || [])
      .map((item) => item?.src)
      .filter(Boolean)
      .map((src) => api.resolveImage(src));

    const unique = [...new Set([heroImage, ...atelierImages].filter(Boolean))];
    const merged = [...unique];
    while (merged.length < 6) merged.push(...unique);
    return merged.slice(0, 8);
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
    }, isMobile ? 5200 : 5900);

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

  const rows = [screenImages.slice(0, 4), screenImages.slice(4, 8)];

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
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
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
                    animate={{ x: rowIndex === 0 ? "-22%" : "4%" }}
                    transition={{ duration: 9.5, ease: "linear" }}
                  >
                    {doubled.map((src, index) => (
                      <motion.div
                        key={`${rowIndex}-${index}-${src}`}
                        className="relative h-full min-w-[34vw] overflow-hidden rounded-[2px] border border-white/[0.05] bg-black/20 md:min-w-[27vw]"
                        initial={{ opacity: 0.45, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.6, delay: 0.1 + index * 0.04 }}
                      >
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover"
                          draggable="false"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
                      </motion.div>
                    ))}
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
                "linear-gradient(90deg, rgba(15,5,12,0.94) 0%, rgba(18,6,14,0.82) 31%, rgba(18,7,15,0.54) 58%, rgba(10,3,8,0.34) 100%), linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.34))",
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
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.14, delayChildren: 0.55 } } }}
          >
            <motion.div
              className="mb-6 flex items-center gap-4"
              variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7 } } }}
            >
              <span className="h-px w-12 bg-[#D4AF37]/80 md:w-16" />
              <span className="text-[9px] uppercase tracking-[0.44em] text-[#D8B05B] sm:text-[10px] md:text-[11px]">
                Samrat Glass Emporium · Firozabad · Since 1981
              </span>
            </motion.div>

            <motion.h2
              className="font-serif text-[3.5rem] leading-[0.9] tracking-[-0.045em] text-white sm:text-6xl md:text-[5.2rem] lg:text-[6rem]"
              variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } } }}
            >
              A Legacy
              <span className="block italic font-normal text-[#d9b35d]">in Light</span>
            </motion.h2>

            <motion.p
              className="mt-7 max-w-[30rem] text-[10px] uppercase leading-[1.9] tracking-[0.23em] text-white/72 md:text-[11px]"
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
            >
              Handcrafted glass lighting from Firozabad, since 1981
            </motion.p>

            <motion.div
              className="mt-8 text-[8px] uppercase tracking-[0.42em] text-[#D7B15D]/72 sm:text-[9px]"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.7 } } }}
            >
              Heritage · Craft · Illumination
            </motion.div>
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute inset-y-0 z-20 w-[12vw] min-w-[100px]"
            initial={{ x: "-15vw", opacity: 0 }}
            animate={{ x: "116vw", opacity: [0, 0.28, 0] }}
            transition={{ duration: 2.1, delay: 3.45, ease: "easeInOut" }}
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
            className="absolute right-4 top-4 z-40 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#140a10]/60 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/82 backdrop-blur-md transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] md:right-8 md:top-8 md:px-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Explore the Legacy <ArrowRight size={13} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
