import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Flame, Sparkles, Scissors, Wrench, Award } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import SEO from "../components/SEO";
import CraftVideoBlock, { CraftBackgroundVideo } from "../components/CraftVideoBlock";
import { api } from "../lib/api";

// Icon rotates through this fixed list by step index — user cannot pick icons via CMS
const STEP_ICONS = [Sparkles, Flame, Scissors, Wrench, Award];

export default function Craft() {
  const { hp } = useSettings();
  const c = hp.craft || {};
  const cv = hp.craft_video || {};
  const items = c.items || [];

  const showVideoSection =
    cv.enabled !== false && (cv.video_url || cv.instagram_url || cv.thumbnail_url);

  return (
    <div data-testid="page-craft">
      <SEO
        title="The Craft · How Samrat Glass Emporium Makes Every Piece"
        description="Design → furnace → cutting → assembly → finish. A single chandelier goes through five slow, deliberate acts by hand in our Firozabad atelier."
        path="/craft"
      />
      {/* Hero */}
      <section className="relative overflow-hidden grain">
        {/* Optional muted autoplay background */}
        <CraftBackgroundVideo
          enabled={cv.bg_autoplay !== false}
          video_url={cv.video_url}
          thumbnail_url={cv.thumbnail_url}
        />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(22,7,15,0.6) 0%, rgba(22,7,15,0.9) 60%, #16070f 100%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 20% 40%, rgba(163,99,80,0.35), transparent 45%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 80% 60%, rgba(212,175,55,0.15), transparent 55%)" }} />
        </div>
        {/* Extra depth overlay when the bg-video is running */}
        {cv.bg_autoplay !== false && cv.video_url && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(22,7,15,0.7), rgba(11,4,9,0.95))" }} />
        )}
        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="eyebrow mb-6">{c.eyebrow}</div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
              {c.headline_pre} <span className="brand-gradient-text italic">{c.headline_highlight}</span>
            </h1>
            {c.intro && (
              <p className="mt-6 max-w-2xl mx-auto text-white/70 text-base md:text-lg leading-relaxed">{c.intro}</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Watch Our Craft in Motion */}
      {showVideoSection && (
        <section data-testid="craft-video-section" className="relative py-20 md:py-24 border-t border-[#BF9972]/15">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-10 md:mb-14">
              <div className="eyebrow mb-4 text-[#D4AF37]">{cv.section_eyebrow || "Process Reel"}</div>
              <h2 className="font-serif text-3xl md:text-5xl leading-tight">
                {cv.section_title_pre || "Watch Our Craft"}{" "}
                <span className="brand-gradient-text italic">{cv.section_title_highlight || "in Motion."}</span>
              </h2>
            </div>
            <div className="max-w-md md:max-w-lg mx-auto">
              <CraftVideoBlock
                video_url={cv.video_url}
                instagram_url={cv.instagram_url}
                thumbnail_url={cv.thumbnail_url}
                caption={cv.caption}
                cta_text={cv.cta_text}
                cta_link={cv.cta_link}
                variant="framed"
                aspect="9 / 16"
                data-testid="craft-video-main"
              />
            </div>
          </div>
        </section>
      )}

      {/* Steps */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-20 space-y-20 md:space-y-28">
        {items.map((s, i) => {
          const Icon = STEP_ICONS[i % STEP_ICONS.length];
          const alignRight = i % 2 === 1;
          const visual = s.visual;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={`grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-start ${alignRight ? "md:text-right" : ""}`}
            >
              {/* Number rail */}
              <div className={`md:col-span-2 flex ${alignRight ? "md:justify-end md:order-2" : ""} items-start`}>
                <div className={`inline-flex flex-col ${alignRight ? "md:items-end" : "items-start"}`}>
                  <div className="font-serif text-[64px] md:text-[88px] leading-none brand-gradient-text tracking-tight">
                    {s.num || String(i + 1).padStart(2, "0")}
                  </div>
                  <div className={`mt-1 h-px w-16 bg-[#D4AF37]/50 ${alignRight ? "md:self-end" : ""}`} />
                </div>
              </div>

              {/* Content */}
              <div className={`md:col-span-6 ${alignRight ? "md:order-1" : ""}`}>
                <div className={`inline-flex items-center gap-3 mb-4 ${alignRight ? "md:flex-row-reverse" : ""}`}>
                  <span className="w-9 h-9 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center flex-shrink-0">
                    <Icon size={16} strokeWidth={1.4} />
                  </span>
                  {s.kicker && (
                    <div className="text-[10px] uppercase tracking-[0.32em] text-[#BF9972]">{s.kicker}</div>
                  )}
                </div>
                <h2 className="font-serif text-3xl md:text-4xl mb-4 leading-tight">{s.title}</h2>
                <p className="text-white/70 leading-relaxed text-base md:text-[17px] max-w-2xl md:inline-block">{s.body}</p>
              </div>

              {/* Visual (image / still) — falls back to a subtle tinted card when empty so layout stays balanced */}
              <div className={`md:col-span-4 ${alignRight ? "md:order-3" : ""}`} data-testid={`craft-step-visual-${i}`}>
                <div
                  className="relative aspect-square overflow-hidden border border-[#D4AF37]/25"
                  style={{ background: "linear-gradient(180deg,#15060d 0%, #0b0409 100%)" }}
                >
                  {visual ? (
                    <img
                      src={api.resolveImage(visual)}
                      alt={s.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#BF9972]/50 text-xs uppercase tracking-[0.28em]">
                      Step {String(i + 1).padStart(2, "0")}
                    </div>
                  )}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 60%, rgba(212,175,55,0.15), transparent 60%)" }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Editorial closer */}
      <section className="relative py-20 md:py-28 border-t border-[#BF9972]/15 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(163,99,80,0.3), transparent 55%)" }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {c.closer_eyebrow && <div className="eyebrow mb-4">{c.closer_eyebrow}</div>}
            {c.founder_quote && (
              <p className="font-serif text-2xl md:text-3xl leading-snug italic text-white/85">
                &ldquo;{c.founder_quote}&rdquo;
              </p>
            )}
            {c.founder_credit && (
              <div className="mt-6 text-[10px] uppercase tracking-[0.32em] text-[#BF9972]">{c.founder_credit}</div>
            )}
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              {c.cta_primary_text && (
                <Link to={c.cta_primary_link || "/catalog"} className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">
                  {c.cta_primary_text} <ArrowUpRight size={14} />
                </Link>
              )}
              {c.cta_secondary_text && (
                <Link to={c.cta_secondary_link || "/contact"} className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.28em]">
                  {c.cta_secondary_text}
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
