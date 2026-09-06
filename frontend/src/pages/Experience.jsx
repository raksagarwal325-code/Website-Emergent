import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import SEO from "../components/SEO";
import { useSettings } from "../context/SettingsContext";
import { CraftBackgroundVideo } from "../components/CraftVideoBlock";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";

const GOLD = "#D4AF37";

function StoryLine({ eyebrow, title, body, align = "left" }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`max-w-xl ${align === "right" ? "ml-auto text-right" : ""}`}
      initial={reduced ? false : { opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.45 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="text-[11px] uppercase tracking-[0.32em] text-[#D4AF37] mb-5">{eyebrow}</div>
      <h2 className="font-serif text-4xl md:text-6xl leading-[1.02] text-white">{title}</h2>
      <p className="mt-6 text-white/62 leading-relaxed text-base md:text-lg">{body}</p>
    </motion.div>
  );
}

export default function Experience() {
  const pageRef = useRef(null);
  const { settings, hp } = useSettings();
  const reduced = useReducedMotion();
  const craftVideo = hp?.craft_video || {};
  const heroImage = settings?.hero_image || BRAND_PLACEHOLDER_HERO;

  const { scrollYProgress } = useScroll({ target: pageRef, offset: ["start start", "end end"] });
  const heroScale = useTransform(scrollYProgress, [0, 0.22], [1.04, 1.16]);
  const heroY = useTransform(scrollYProgress, [0, 0.22], [0, 80]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.14, 0.28], [0.1, 0.7, 0.2]);
  const ringRotate = useTransform(scrollYProgress, [0, 1], [0, 150]);

  return (
    <div ref={pageRef} data-testid="page-experience" className="bg-[#070407] text-white overflow-hidden">
      <SEO
        title="The Samrat Experience | Firozabad Glass Lighting Since 1981"
        description="An immersive introduction to Samrat Glass Emporium: handcrafted decorative glass lighting, workshop process and bespoke commissions from Firozabad since 1981."
        image={heroImage}
        path="/experience"
      />

      <section className="relative min-h-[calc(100vh-5rem)] flex items-center isolate border-b border-white/10">
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-20"
          style={reduced ? undefined : { scale: heroScale, y: heroY }}
        >
          <img src={heroImage} alt="" className="w-full h-full object-cover opacity-45" loading="eager" fetchPriority="high" />
        </motion.div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,4,7,.35),rgba(7,4,7,.72)_55%,#070407)]" />
        <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(circle at 50% 43%, rgba(212,175,55,.14), transparent 32%)" }} />
        <motion.div aria-hidden className="absolute left-1/2 top-1/2 -z-10 h-[38vw] w-[38vw] min-h-[320px] min-w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D4AF37]/20" style={reduced ? undefined : { rotate: ringRotate, opacity: glowOpacity }} />

        <div className="w-full max-w-7xl mx-auto px-6 py-20 text-center">
          <motion.div initial={reduced ? false : { opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <div className="text-[11px] uppercase tracking-[0.36em] text-[#D4AF37] mb-6">Firozabad · Since 1981</div>
            <h1 className="font-serif text-[14vw] sm:text-7xl lg:text-8xl xl:text-9xl leading-[0.88] tracking-[-0.04em]">
              Light,<br />
              <span className="italic brand-gradient-text">shaped by hand.</span>
            </h1>
            <p className="mt-7 max-w-xl mx-auto text-white/66 leading-relaxed md:text-lg">An immersive view of the glass, handwork and finished pieces behind Samrat Glass Emporium.</p>
            <a href="#story" className="mt-10 inline-flex flex-col items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-white/55 hover:text-[#D4AF37]">
              Scroll to enter <ArrowDown size={15} />
            </a>
          </motion.div>
        </div>
      </section>

      <section id="story" className="relative min-h-[135vh]">
        <div className="sticky top-20 min-h-[calc(100vh-5rem)] flex items-center overflow-hidden border-b border-white/10">
          <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 68% 48%, rgba(212,175,55,.13), transparent 28%), radial-gradient(circle at 28% 58%, rgba(163,99,80,.15), transparent 32%)" }} />
          <motion.div aria-hidden className="absolute right-[8%] top-1/2 -translate-y-1/2 w-[42vw] h-[42vw] max-w-[650px] max-h-[650px] rounded-full border border-white/10" style={reduced ? undefined : { rotate: ringRotate }}>
            <div className="absolute inset-[12%] rounded-full border border-[#D4AF37]/15" />
            <div className="absolute inset-[28%] rounded-full border border-white/10" />
            <div className="absolute inset-[42%] rounded-full bg-[#D4AF37]/10 blur-2xl" />
          </motion.div>
          <div className="relative max-w-7xl mx-auto px-6 w-full">
            <StoryLine eyebrow="01 · Origin" title="Born in a city shaped by glass." body="Samrat Glass Emporium works from Firozabad, where decorative glassmaking is part of the city’s industrial and craft identity. Our story began in 1981." />
          </div>
        </div>
      </section>

      <section className="relative min-h-[110vh] flex items-center border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0">
          <CraftBackgroundVideo enabled={craftVideo.bg_autoplay !== false} video_url={craftVideo.video_url} thumbnail_url={craftVideo.thumbnail_url} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#070407_0%,rgba(7,4,7,.85)_42%,rgba(7,4,7,.38)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#070407_0%,transparent_18%,transparent_80%,#070407_100%)]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 w-full py-24">
          <StoryLine eyebrow="02 · Process" title="The handwork stays visible." body="Preparation, shaping, finishing, cleaning, fitting and inspection are not background details. They are part of what gives each piece its character—and they deserve to be seen." />
        </div>
      </section>

      <section className="relative min-h-[110vh] flex items-center border-b border-white/10">
        <motion.div aria-hidden className="absolute left-1/2 top-1/2 h-[66vw] w-[66vw] max-h-[900px] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D4AF37]/10" style={reduced ? undefined : { rotate: ringRotate }}>
          {[18, 31, 43].map((inset) => <div key={inset} className="absolute rounded-full border border-white/[0.07]" style={{ inset: `${inset}%` }} />)}
        </motion.div>
        <div className="relative max-w-7xl mx-auto px-6 w-full py-24">
          <StoryLine align="right" eyebrow="03 · Object" title="Glass becomes light." body="Cut surfaces, blown forms, metal structure and illumination meet in the finished fixture. The product remains the focus; motion only reveals what is already there." />
        </div>
      </section>

      <section className="relative min-h-[105vh] flex items-center overflow-hidden border-b border-white/10">
        <motion.div aria-hidden className="absolute inset-[7%] md:inset-[10%]" initial={reduced ? false : { scale: .9, opacity: .25 }} whileInView={{ scale: 1, opacity: .55 }} viewport={{ amount: .4 }} transition={{ duration: 1.2 }}>
          <img src={heroImage} alt="" loading="lazy" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/45" />
        </motion.div>
        <div className="relative max-w-7xl mx-auto px-6 w-full py-24">
          <StoryLine eyebrow="04 · Bespoke" title="Made for the space, not merely placed in it." body="Selected catalogue designs can be evaluated for changes in scale, proportion, light count, tier configuration, finish or glass—only when the structure of the design supports it." />
        </div>
      </section>

      <section className="relative py-28 md:py-40 text-center">
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 45%, rgba(212,175,55,.10), transparent 28%)" }} />
        <motion.div className="relative max-w-4xl mx-auto px-6" initial={reduced ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .5 }} transition={{ duration: .9 }}>
          <div className="text-[11px] uppercase tracking-[0.34em] text-[#D4AF37] mb-6">Continue the journey</div>
          <h2 className="font-serif text-4xl sm:text-5xl md:text-7xl leading-[1.02]">See the piece.<br /><span className="italic brand-gradient-text">Then see where it belongs.</span></h2>
          <p className="mt-6 text-white/58 max-w-2xl mx-auto">Move from the story into the catalogue, real installations, or a bespoke lighting discussion.</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/catalog" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.24em] hover:bg-[#B5952F]">Explore collection <ArrowUpRight size={14} /></Link>
            <Link to="/gallery" className="inline-flex items-center gap-2 border border-white/20 px-8 py-4 uppercase text-xs tracking-[0.24em] hover:border-[#D4AF37]">View installations</Link>
            <Link to="/custom-lighting-bulk-orders" className="inline-flex items-center gap-2 border border-white/20 px-8 py-4 uppercase text-xs tracking-[0.24em] hover:border-[#D4AF37]">Commission a piece</Link>
          </div>
        </motion.div>
      </section>

      <div className="sr-only" aria-hidden="true" style={{ color: GOLD }}>Immersive Samrat Glass experience prototype</div>
    </div>
  );
}
