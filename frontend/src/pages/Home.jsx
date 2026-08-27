import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Truck, ShieldCheck, MessageCircle } from "lucide-react";
import SEO from "../components/SEO";
import { api } from "../lib/api";
import CollageSection from "../components/CollageSection";
import ReasonsSection from "../components/ReasonsSection";
import TrustedBySection from "../components/TrustedBySection";
import WelcomeIntro from "../components/WelcomeIntro";
import SeasonalSpotlight from "../components/SeasonalSpotlight";
import FounderTeaser from "../components/FounderTeaser";
import HeroSlideshow from "../components/HeroSlideshow";
import CategoryShowcase from "../components/CategoryShowcase";
import ShopBySpaceSection from "../components/ShopBySpaceSection";
import { useSettings } from "../context/SettingsContext";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";
import { editorialGroup, editorialItem, editorialItemSoft, LUXURY_EASE } from "../lib/motion";
import { waGeneralLink } from "../lib/whatsapp";

const GoogleReviews = lazy(() => import("../components/GoogleReviews"));
const AtelierShowcase = lazy(() => import("../components/AtelierShowcase"));
const GalleryPreview = lazy(() => import("../components/GalleryPreview"));
const InfluencerPromotions = lazy(() => import(/* webpackChunkName: "influencer" */ "../components/InfluencerPromotions"));

function DeferredSection({ children, minHeight = 480, rootMargin = "800px 0px" }) {
  const [ready, setReady] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (ready) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    if (!("IntersectionObserver" in window)) {
      setReady(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ready, rootMargin]);

  return (
    <div ref={ref} style={!ready ? { minHeight } : undefined}>
      {ready ? children : null}
    </div>
  );
}

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const { settings, hp } = useSettings();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    api.listProducts({ featured: true, limit: 96 }).then((res) => setFeatured(res?.items || [])).catch(() => {});
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

      <section className="relative overflow-hidden grain min-h-[calc(100vh-5rem)] border-b border-white/10">
        <motion.div
          className="absolute inset-0 opacity-45"
          initial={prefersReducedMotion ? false : { opacity: 0.34, scale: 1.015 }}
          animate={{ opacity: 0.45, scale: prefersReducedMotion ? 1 : 1.035 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 7, ease: LUXURY_EASE }}
        >
          <picture>
            <source media="(max-width: 767px)" srcSet={BRAND_PLACEHOLDER_HERO} />
            <img src={settings?.hero_image || BRAND_PLACEHOLDER_HERO} alt="" className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
          </picture>
          <HeroSlideshow />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(42,17,37,0.54) 0%, rgba(22,7,15,0.7) 58%, #16070f 100%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 80% 20%, rgba(163,99,80,0.30), transparent 45%)" }} />
        </motion.div>

        <div className="relative max-w-7xl mx-auto px-6 min-h-[calc(100vh-5rem)] flex items-center py-10 md:py-12">
          <motion.div className="max-w-2xl" initial={prefersReducedMotion ? false : "hidden"} animate="visible" variants={editorialGroup}>
            <motion.div variants={prefersReducedMotion ? undefined : editorialItemSoft}>
              <div className="mb-5 inline-flex items-center gap-3 border border-[#BF9972]/30 px-4 py-2"><span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /><span className="text-xs uppercase tracking-[0.28em] text-[#BF9972]">{H.eyebrow}</span></div>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-6xl xl:text-7xl leading-[1.02]">{H.headline_line1}<br /><span className="italic brand-gradient-text">{H.headline_line2}</span></h1>
              <motion.div aria-hidden className="mt-6 h-px w-40 origin-left bg-gradient-to-r from-[#D4AF37]/90 to-transparent" initial={prefersReducedMotion ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.9, delay: 0.25, ease: LUXURY_EASE }} />
            </motion.div>
            <motion.div variants={prefersReducedMotion ? undefined : editorialItem}>
              <p className="mt-5 text-white/70 max-w-lg leading-relaxed">{H.description}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={H.primary_cta_link || "/catalog"} data-testid="hero-explore-btn" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.24em] hover:bg-[#B5952F] transition-colors">{H.primary_cta_text} <ArrowUpRight size={14} /></Link>
                {H.secondary_cta_text && (heroSecondaryExternal ? <a href={heroSecondaryHref} target="_blank" rel="noreferrer" data-testid="hero-wa-btn" className="inline-flex items-center gap-2 border border-[#D4AF37]/60 text-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.24em] hover:bg-[#D4AF37]/10 transition-colors"><MessageCircle size={14} /> {H.secondary_cta_text}</a> : <Link to={heroSecondaryHref} data-testid="hero-wa-btn" className="inline-flex items-center gap-2 border border-[#D4AF37]/60 text-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.24em] hover:bg-[#D4AF37]/10 transition-colors"><MessageCircle size={14} /> {H.secondary_cta_text}</Link>)}
              </div>
            </motion.div>
            <motion.div variants={prefersReducedMotion ? undefined : editorialItemSoft} className="mt-8 pt-5 border-t border-[#BF9972]/20 grid grid-cols-3 gap-6 max-w-lg">
              {(H.trust || []).map((t, i) => <div key={i}><div className="font-serif text-xl md:text-2xl brand-gradient-text leading-none">{t.value}</div><div className="text-xs font-medium uppercase tracking-[0.18em] text-white/60 mt-2">{t.label}</div></div>)}
            </motion.div>
          </motion.div>
        </div>

        <div aria-hidden className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#16070f] pointer-events-none" />
      </section>

      <div className="relative z-10"><CategoryShowcase /></div>
      <ShopBySpaceSection />
      <TrustedBySection />
      <CollageSection />

      <section className="border-y border-white/10"><div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">{[
        { icon: Truck, title: "Pan-India Shipping", body: "Insured door-delivery in 7–10 business days." },
        { icon: ShieldCheck, title: "Handcrafted Quality", body: "Every piece inspected before dispatch. Replacement guaranteed on transit damage." },
        { icon: MessageCircle, title: "WhatsApp Support", body: "Bulk enquiries, custom sizes & installation guidance — reply within hours." },
      ].map((f) => <div key={f.title} className="p-8 flex items-start gap-4"><f.icon size={20} strokeWidth={1.4} className="text-[#D4AF37] mt-1" /><div><div className="font-serif text-lg">{f.title}</div><div className="text-sm text-white/60 mt-1">{f.body}</div></div></div>)}</div></section>

      <SeasonalSpotlight products={featured} eyebrow={F.eyebrow} title={F.title} viewAllText={F.view_all_text} viewAllLink={F.view_all_link} />

      <section className="max-w-7xl mx-auto px-6 pb-6">
        <DeferredSection minHeight={420}>
          <Suspense fallback={<div aria-hidden="true" className="min-h-[420px]" />}><GoogleReviews /></Suspense>
        </DeferredSection>
      </section>
      <ReasonsSection />
      <FounderTeaser />
      <DeferredSection minHeight={900}>
        <Suspense fallback={<div aria-hidden="true" className="min-h-[900px]" />}><AtelierShowcase /></Suspense>
      </DeferredSection>
      <DeferredSection minHeight={720}>
        <Suspense fallback={<div aria-hidden="true" className="min-h-[720px]" />}><GalleryPreview /></Suspense>
      </DeferredSection>
      <DeferredSection minHeight={600}>
        <Suspense fallback={<div aria-hidden="true" className="min-h-[600px]" />}><InfluencerPromotions /></Suspense>
      </DeferredSection>
    </div>
  );
}
