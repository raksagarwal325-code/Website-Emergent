import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";

const SESSION_KEY = "sge-welcome-intro-seen-v2";

export default function WelcomeIntro() {
  const { settings, hp } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  const heroImage = api.resolveImage(settings?.hero_image || BRAND_PLACEHOLDER_HERO);

  const productImages = useMemo(() => {
    const atelierImages = (hp?.atelier?.images || [])
      .map((item) => item?.src)
      .filter(Boolean)
      .slice(0, 3)
      .map((src) => api.resolveImage(src));

    const merged = [...atelierImages];
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
    }, isMobile ? 4600 : 5200);

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
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.img
            src={heroImage}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.12, opacity: 0 }}
            animate={{ scale: 1.02, opacity: 0.24 }}
            transition={{ duration: 4.8, ease: [0.16, 1, 0.3, 1] }}
          />

          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(circle at 50% 34%, rgba(212,175,55,0.16), transparent 25%), linear-gradient(180deg, rgba(7,2,6,0.65) 0%, rgba(20,7,16,0.82) 52%, #090308 100%)",
            }}
          />

          <motion.div
            aria-hidden
            className="absolute inset-y-0 w-[18vw] min-w-[150px]"
            initial={{ x: "-28vw", opacity: 0 }}
            animate={{ x: "118vw", opacity: [0, 0.45, 0] }}
            transition={{ duration: 3.3, delay: 0.8, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,232,176,0.08), transparent)",
              filter: "blur(22px)",
              transform: "skewX(-10deg)",
            }}
          />

          <div className="absolute inset-x-0 bottom-[8vh] top-[35vh] flex items-end justify-center gap-3 sm:gap-5 md:gap-8 px-4 sm:px-8 pointer-events-none">
            {productImages.map((src, index) => {
              const center = index === 1;
              return (
                <motion.div
                  key={`${src}-${index}`}
                  className={`relative overflow-hidden border border-[#D4AF37]/25 bg-black/20 backdrop-blur-[2px] ${
                    center
                      ? "z-10 h-[42vh] w-[34vw] max-w-[360px] rounded-t-[10rem]"
                      : "h-[34vh] w-[26vw] max-w-[275px] rounded-t-[8rem] opacity-80"
                  }`}
                  initial={{ opacity: 0, y: 80, scale: 0.9 }}
                  animate={{
                    opacity: center ? 1 : 0.72,
                    y: center ? -12 : 12,
                    scale: center ? 1 : 0.94,
                  }}
                  transition={{
                    duration: 1.35,
                    delay: 0.55 + index * 0.16,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <motion.img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                    initial={{ scale: 1.08, filter: "brightness(0.38) saturate(0.7)" }}
                    animate={{
                      scale: 1,
                      filter: [
                        "brightness(0.38) saturate(0.7)",
                        "brightness(1.02) saturate(1)",
                        "brightness(0.84) saturate(0.92)",
                      ],
                    }}
                    transition={{
                      scale: { duration: 3.6, delay: 0.5 + index * 0.12, ease: [0.16, 1, 0.3, 1] },
                      filter: { duration: 2.6, delay: 1 + index * 0.16, times: [0, 0.5, 1] },
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/45" />
                  <div className="absolute inset-x-[10%] bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="absolute inset-x-0 top-[10vh] z-10 px-6 text-center pointer-events-none"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.16, delayChildren: 0.5 } },
            }}
          >
            <motion.div
              className="text-[10px] md:text-xs uppercase tracking-[0.48em] text-[#D4AF37]"
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
              }}
            >
              Samrat Glass Emporium · Since 1981
            </motion.div>

            <motion.h2
              className="mx-auto mt-5 max-w-5xl font-serif text-[2.65rem] leading-[0.98] text-white sm:text-6xl md:text-7xl lg:text-[5.4rem]"
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.97 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 1.05, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              Welcome to the<br />
              <span className="italic brand-gradient-text">World of Light</span>
            </motion.h2>

            <motion.div
              className="mx-auto mt-6 h-px w-28 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
              variants={{
                hidden: { opacity: 0, scaleX: 0 },
                visible: { opacity: 1, scaleX: 1, transition: { duration: 0.9 } },
              }}
            />

            <motion.p
              className="mx-auto mt-5 max-w-xl text-[10px] uppercase tracking-[0.3em] text-white/58 sm:text-xs"
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
              }}
            >
              Handcrafted glass. Heritage forms. Extraordinary light.
            </motion.p>
          </motion.div>

          <motion.button
            type="button"
            onClick={dismiss}
            data-testid="welcome-intro-skip"
            className="absolute right-4 top-4 z-20 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D4AF37]/45 bg-black/35 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/80 backdrop-blur-md transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] md:right-8 md:top-8 md:px-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            Skip intro <ArrowRight size={13} />
          </motion.button>

          <motion.div
            aria-hidden
            className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-[0.35em] text-white/30 md:bottom-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.7 }}
          >
            A brief journey into Samrat Glass
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
