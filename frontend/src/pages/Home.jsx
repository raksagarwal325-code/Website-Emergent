import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Truck, ShieldCheck, MessageCircle } from "lucide-react";
import SEO from "../components/SEO";
import { api } from "../lib/api";
import GoogleReviews from "../components/GoogleReviews";
import CollageSection from "../components/CollageSection";
import ReasonsSection from "../components/ReasonsSection";
import AtelierShowcase from "../components/AtelierShowcase";
import TrustedBySection from "../components/TrustedBySection";
import GalleryPreview from "../components/GalleryPreview";
import WelcomeIntro from "../components/WelcomeIntro";
import SeasonalSpotlight from "../components/SeasonalSpotlight";
const InfluencerPromotions = lazy(() => import(/* webpackChunkName: "influencer" */ "../components/InfluencerPromotions"));
import FounderTeaser from "../components/FounderTeaser";
import HeroSlideshow from "../components/HeroSlideshow";
import CategoryShowcase from "../components/CategoryShowcase";
import ShopBySpaceSection from "../components/ShopBySpaceSection";
import { useSettings } from "../context/SettingsContext";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";
import { editorialGroup, editorialItem, editorialItemSoft, LUXURY_EASE } from "../lib/motion";
import { waGeneralLink } from "../lib/whatsapp";

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const { settings, hp } = useSettings();
  const heroRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress: heroScrollProgress } = useScroll({ target: heroRef, offset: ["start start", "end end"] });
  const heroScale = useTransform(heroScrollProgress, [0, 0.45, 1], [1, 1.025, 0.72]);
  const heroMediaY = useTransform(heroScrollProgress, [0, 0.5, 1], [0, 0, -90]);
  const heroContentY = useTransform(heroScrollProgress, [0, 0.42, 1], [0, 0, -210]);
  const heroContentOpacity = useTransform(heroScrollProgress, [0, 0.48, 0.78, 1], [1, 1, 0.45, 0]);
  const heroShadeOpacity = useTransform(heroScrollProgress, [0.32, 1], [0, 0.84]);
  const heroRuleScale = useTransform(heroScrollProgress, [0.04, 0.32], [0, 1]);
  const heroFrameRadius = useTransform(heroScrollProgress, [0.45, 1], [0, 36]);

  useEffect(() => {
    api.listProducts({ featured: true, limit: 48 }).then((res) => setFeatured(res?.items || [])).catch(() => {});
  }, []);

  const waLink = waGeneralLink(settings?.whatsapp_number) || "#";
  const H = hp.hero;
  const F = hp.featured;
  const heroSecondaryHref = H.secondary_cta_link || waLink;
  const heroSecondaryExternal = heroSecondaryHref.startsWith("http") || heroSecondaryHref.startsWith("mailto") || heroSecondaryHref.startsWith("tel");

  return (
    <div data-testid="page-home">
      <SEO title="Samrat Glass Emporium · Handcrafted Chandeliers & Decorative Lighting · Firozabad" description="1000+ designs of hand-blown chandeliers, crystal hurricanes, pendants and glass lamps — crafted in Firozabad since 1981. 4.9★ · 236+ Google reviews." image={settings?.hero_image} path="/" />
      <WelcomeIntro />

      <section ref={heroRef} className="relative h-auto md:h-[165vh]">
        <motion.div className="relative md:sticky md:top-20 md:h-[calc(100vh-5rem)] overflow-hidden grain origin-center" style={{ borderRadius: prefersReducedMotion ? 0 : heroFrameRadius }}>
          <motion.div className="absolute inset-0 opacity-45 will-change-transform" initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 0.45 }} style={{ scale: prefersReducedMotion ? 1 : heroScale, y: prefersReducedMotion ? 0 : heroMediaY }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.4, ease: LUXURY_EASE }}>
            <picture>
              <source media="(max-width: 767px)" srcSet={BRAND_PLACEHOLDER_HERO} />
              <img src={settings?.hero_image || BRAND_PLACEHOLDER_HERO} alt="" className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
            </picture>
            <HeroSlideshow />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(42,17,37,0.52) 0%, rgba(22,7,15,0.74) 58%, #16070f 100%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 80% 20%, rgba(163,99,80,0.35), transparent 45%)" }} />
          </motion.div>

          <motion.div aria-hidden className="absolute inset-0 pointer-events-none bg-[#16070f]" style={{ opacity: prefersReducedMotion ? 0 : heroShadeOpacity }} />

          <motion.div className="relative max-w-7xl mx-auto px-6 min-h-[78vh] md:h-[calc(100vh-5rem)] flex items-center py-12 md:py-8 will-change-transform" style={{ y: prefersReducedMotion ? 0 : heroContentY, opacity: prefersReducedMotion ? 1 : heroContentOpacity }}>
            <motion.div className="max-w-2xl" initial={prefersReducedMotion ? false : "hidden"} animate="visible" variants={editorialGroup}>
              <motion.div variants={prefersReducedMotion ? undefined : editorialItemSoft}>
                <div className="mb-6 inline-flex items-center gap-3 border border-[#BF9972]/30 px-4 py-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /><span className="text-xs uppercase tracking-[0.28em] text-[#BF9972]">{H.eyebrow}</span></div>
                <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05]">{H.headline_line1}<br /><span className="italic brand-gradient-text">{H.headline_line2}</span></h1>
                <motion.div aria-hidden className="mt-7 h-px w-40 origin-left bg-gradient-to-r from-[#D4AF37]/90 to-transparent" style={{ scaleX: prefersReducedMotion ? 1 : heroRuleScale }} />
              </motion.div>
              <motion.div variants={prefersReducedMotion ? undefined : editorialItem}>
                <p className="mt-6 text-white/70 max-w-lg leading-relaxed">{H.description}</p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link to={H.primary_cta_link || "/catalog"} data-testid="hero-explore-btn" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.24em] hover:bg-[#B5952F] transition-colors">{H.primary_cta_text} <ArrowUpRight size={14} /></Link>
                  {H.secondary_cta_text && (heroSecondaryExternal ? <a href={heroSecondaryHref} target="_blank" rel="noreferrer" data-testid="hero-wa-btn" className="inline-flex items-center gap-2 border border-[#D4AF37]/60 text-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.24em] hover:bg-[#D4AF37]/10 transition-colors"><MessageCircle size={14} /> {H.secondary_cta_text}</a> : <Link to={heroSecondaryHref} data-testid="hero-wa-btn" className="inline-flex items-center gap-2 border border-[#D4AF37]/60 text-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.24em] hover:bg-[#D4AF37]/10 transition-colors"><MessageCircle size={14} /> {H.secondary_cta_text}</Link>)}
                </div>
              </motion.div>
              <motion.div variants={prefersReducedMotion ? undefined : editorialItemSoft} className="mt-12 pt-6 border-t border-[#BF9972]/20 grid grid-cols-3 gap-6 max-w-lg">
                {(H.trust || []).map((t, i) => <div key={i}><div className="font-serif text-xl md:text-2xl brand-gradient-text leading-none">{t.value}</div><div className="text-xs font-medium uppercase tracking-[0.18em] text-white/60 mt-2">{t.label}</div></div>)}
              </motion.div>
            </motion.div>
          </motion.div>

          <div aria-hidden className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-[#16070f] pointer-events-none" />
          <div aria-hidden className="hidden md:flex absolute right-8 bottom-6 items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-white/45"><span className="h-px w-12 bg-[#D4AF37]/50" /> Scroll to enter</div>
        </motion.div>
      </section>

      <div className="relative z-10 md:-mt-[4vh]"><CategoryShowcase /></div>
      <ShopBySpaceSection />
      <TrustedBySection />
      <CollageSection />

      <section className="border-y border-white/10"><div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">{[
        { icon: Truck, title: "Pan-India Shipping", body: "Insured door-delivery in 7–10 business days." },
        { icon: ShieldCheck, title: "Handcrafted Quality", body: "Every piece inspected before dispatch. Replacement guaranteed on transit damage." },
        { icon: MessageCircle, title: "WhatsApp Support", body: "Bulk enquiries, custom sizes & installation guidance — reply within hours." },
      ].map((f) => <div key={f.title} className="p-8 flex items-start gap-4"><f.icon size={20} strokeWidth={1.4} className="text-[#D4AF37] mt-1" /><div><div className="font-serif text-lg">{f.title}</div><div className="text-sm text-white/60 mt-1">{f.body}</div></div></div>)}</div></section>

      <SeasonalSpotlight products={featured} eyebrow={F.eyebrow} title={F.title} viewAllText={F.view_all_text} viewAllLink={F.view_all_link} />

      <section className="max-w-7xl mx-auto px-6 pb-6"><GoogleReviews /></section>
      <ReasonsSection />
      <FounderTeaser />
      <AtelierShowcase />
      <GalleryPreview />
      <Suspense fallback={<div aria-hidden="true" className="min-h-[600px]" />}><InfluencerPromotions /></Suspense>
    </div>
  );
}
