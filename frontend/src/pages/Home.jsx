import { heritageEyebrow } from "../lib/brandOrigin";
import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Camera, Check, MessageCircle, Search, ShieldCheck, Truck } from "lucide-react";
import SEO from "../components/SEO";
import { api } from "../lib/api";
import WelcomeIntro from "../components/WelcomeIntro";
import HeroSlideshow from "../components/HeroSlideshow";
import CustomerImageSearch from "../components/CustomerImageSearch";
import CategoryShowcase from "../components/CategoryShowcase";
import { useSettings } from "../context/SettingsContext";
import { BRAND_PLACEHOLDER_HERO } from "../lib/placeholders";
import { editorialGroup, editorialItem, editorialItemSoft, LUXURY_EASE } from "../lib/motion";
import { waGeneralLink } from "../lib/whatsapp";

const ShopBySpaceSection = lazy(() => import("../components/ShopBySpaceSection"));
const TrustedBySection = lazy(() => import("../components/TrustedBySection"));
const CollageSection = lazy(() => import("../components/CollageSection"));
const SeasonalSpotlight = lazy(() => import("../components/SeasonalSpotlight"));
const GoogleReviews = lazy(() => import("../components/GoogleReviews"));
const ReasonsSection = lazy(() => import("../components/ReasonsSection"));
const FounderTeaser = lazy(() => import("../components/FounderTeaser"));
const AtelierShowcase = lazy(() => import("../components/AtelierShowcase"));
const GalleryPreview = lazy(() => import("../components/GalleryPreview"));
const InfluencerPromotions = lazy(() => import(/* webpackChunkName: "influencer" */ "../components/InfluencerPromotions"));

function ImageSearchPreview({ reducedMotion }) {
  const reveal = (delay) => reducedMotion
    ? { initial: false, animate: undefined, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, x: 8 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.55, delay, ease: LUXURY_EASE },
      };

  return (
    <div aria-hidden="true" data-testid="home-image-search-demo" className="relative min-w-0">
      <motion.div
        className="relative overflow-hidden border border-white/10 bg-black/25 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
        animate={reducedMotion ? undefined : { borderColor: ["rgba(255,255,255,0.10)", "rgba(212,175,55,0.32)", "rgba(255,255,255,0.10)"] }}
        transition={reducedMotion ? { duration: 0 } : { duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative grid grid-cols-[82px_minmax(0,1fr)] items-center gap-3">
          <div className="relative h-[108px] overflow-hidden border border-white/15 bg-[radial-gradient(circle_at_50%_28%,rgba(212,175,55,0.18),rgba(255,255,255,0.025)_58%,transparent_72%)]">
            <div className="absolute left-2 top-2 h-3 w-3 border-l border-t border-[#D4AF37]/70" />
            <div className="absolute right-2 top-2 h-3 w-3 border-r border-t border-[#D4AF37]/70" />
            <div className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-[#D4AF37]/70" />
            <div className="absolute bottom-2 right-2 h-3 w-3 border-b border-r border-[#D4AF37]/70" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/48">
              <Camera size={22} strokeWidth={1.4} />
              <span className="text-[8px] uppercase tracking-[0.2em]">Your photo</span>
            </div>
            <motion.div
              className="absolute left-2 right-2 top-2 h-px bg-[#D4AF37] shadow-[0_0_10px_2px_rgba(212,175,55,0.65)]"
              animate={reducedMotion ? undefined : { y: [0, 90, 0], opacity: [0.45, 1, 0.45] }}
              transition={reducedMotion ? { duration: 0 } : { duration: 3.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.45 }}
            />
          </div>

          <div className="min-w-0 space-y-2">
            <motion.div {...reveal(0.15)} className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/45">
              <Search size={12} strokeWidth={1.5} className="text-[#D4AF37]" />
              Visual search
            </motion.div>
            <motion.div {...reveal(0.45)} className="flex items-center gap-2 border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-2.5 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-black"><Check size={12} strokeWidth={2.4} /></span>
              <span className="min-w-0 flex-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/85">Exact match</span>
              <span className="text-[8px] uppercase tracking-[0.14em] text-[#D4AF37]">First</span>
            </motion.div>
            <motion.div {...reveal(0.75)} className="flex items-center gap-2 border border-white/10 bg-white/[0.035] px-2.5 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/55"><Search size={11} strokeWidth={1.6} /></span>
              <span className="min-w-0 flex-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/65">Similar designs</span>
              <span className="text-[8px] uppercase tracking-[0.14em] text-white/40">Next</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DeferredSection({ children, minHeight = 480, rootMargin = "500px 0px" }) {
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

function DeferredSeasonalSpotlight({ eyebrow, title, viewAllText, viewAllLink }) {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    let alive = true;
    api
      .listProducts({ featured: true, limit: 24 })
      .then((res) => {
        if (alive) setFeatured(res?.items || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Suspense fallback={<div aria-hidden="true" className="min-h-[700px]" />}>
      <SeasonalSpotlight
        products={featured}
        eyebrow={eyebrow}
        title={title}
        viewAllText={viewAllText}
        viewAllLink={viewAllLink}
      />
    </Suspense>
  );
}

export default function Home() {
  const { settings, hp } = useSettings();
  const prefersReducedMotion = useReducedMotion();

  const waLink = waGeneralLink(settings?.whatsapp_number) || "#";
  const H = hp.hero;
  const F = hp.featured;
  const heroSecondaryHref = H.secondary_cta_link || waLink;
  const heroSecondaryExternal = heroSecondaryHref.startsWith("http") || heroSecondaryHref.startsWith("mailto") || heroSecondaryHref.startsWith("tel");

  return (
    <div data-testid="page-home">
      <SEO title="Samrat Glass Emporium · Handcrafted Chandeliers & Decorative Lighting · Firozabad" description="Handcrafted chandeliers, hanging lights, wall lights, table lamps and decorative glass lighting from Firozabad — by Samrat Glass Emporium, established in 1981." image={settings?.hero_image} path="/" />
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
              <Link to="/craft" aria-label="Made in India — explore our workshop and craftsmanship" className="mb-5 inline-flex items-center gap-3 border border-[#BF9972]/30 px-4 py-2 hover:border-[#D4AF37] focus-visible:outline focus-visible:outline-2"><span className="w-1.5 h-1.5 shrink-0 rounded-full bg-[#D4AF37]" /><span className="text-xs uppercase tracking-[0.18em] leading-relaxed text-[#BF9972]">{heritageEyebrow(H.eyebrow)}</span></Link>
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

      <section aria-labelledby="home-image-search-title" data-testid="home-image-search-feature" className="relative overflow-hidden border-b border-white/10 bg-[#10070d]">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(212,175,55,0.14),transparent_44%)]" />
        <motion.div
          aria-hidden="true"
          className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-[#D4AF37]/[0.035] to-transparent blur-2xl"
          animate={prefersReducedMotion ? undefined : { x: ["0vw", "135vw"] }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 9, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-6 py-11 lg:grid-cols-[minmax(0,1fr)_minmax(470px,540px)] lg:items-center lg:py-14">
          <motion.div
            className="max-w-2xl"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.7, ease: LUXURY_EASE }}
          >
            <div className="eyebrow text-[#D4AF37]">Search by image</div>
            <h2 id="home-image-search-title" className="mt-3 font-serif text-3xl leading-tight text-white sm:text-4xl">
              Seen a light you love? <span className="italic brand-gradient-text">Find it from a photo.</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
              Upload a product photo, room photo or screenshot. We’ll look for the exact catalogue match first, then show the closest and similar designs.
            </p>
          </motion.div>

          <motion.div
            className="w-full border border-white/10 bg-white/[0.025] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-5"
            initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.75, delay: 0.12, ease: LUXURY_EASE }}
          >
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_210px] sm:items-center">
              <ImageSearchPreview reducedMotion={prefersReducedMotion} />
              <div className="w-full">
                <CustomerImageSearch variant="landing" />
                <p className="mt-3 text-center text-[10px] leading-relaxed text-white/45">JPG, PNG or WebP · Up to 10 MB<br />Deleted automatically after matching</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="relative z-10"><CategoryShowcase /></div>

      <DeferredSection minHeight={650} rootMargin="350px 0px">
        <Suspense fallback={<div aria-hidden="true" className="min-h-[650px]" />}><ShopBySpaceSection /></Suspense>
      </DeferredSection>
      <DeferredSection minHeight={420} rootMargin="350px 0px">
        <Suspense fallback={<div aria-hidden="true" className="min-h-[420px]" />}><TrustedBySection /></Suspense>
      </DeferredSection>
      <DeferredSection minHeight={700} rootMargin="350px 0px">
        <Suspense fallback={<div aria-hidden="true" className="min-h-[700px]" />}><CollageSection /></Suspense>
      </DeferredSection>

      <section className="border-y border-white/10"><div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">{[
        { icon: Truck, title: "Pan-India Shipping", body: "Insured door delivery across India. Standard pieces typically dispatch in 7–10 business days; transit time varies by destination." },
        { icon: ShieldCheck, title: "Transit-damage support", body: "For transit damage, share photos of the product and packaging within 48 hours. We will assess the claim and confirm the applicable remedy under our Return & Replacement Policy." },
        { icon: MessageCircle, title: "WhatsApp Support", body: "Bulk enquiries, custom sizes & installation guidance — we aim to respond within one business day." },
      ].map((f) => <div key={f.title} className="p-8 flex items-start gap-4"><f.icon size={20} strokeWidth={1.4} className="text-[#D4AF37] mt-1" /><div><div className="font-serif text-lg">{f.title}</div><div className="text-sm text-white/60 mt-1">{f.body}</div></div></div>)}</div></section>

      <DeferredSection minHeight={700} rootMargin="350px 0px">
        <DeferredSeasonalSpotlight eyebrow={F.eyebrow} title={F.title} viewAllText={F.view_all_text} viewAllLink={F.view_all_link} />
      </DeferredSection>

      <section className="max-w-7xl mx-auto px-6 pb-6">
        <DeferredSection minHeight={420}>
          <Suspense fallback={<div aria-hidden="true" className="min-h-[420px]" />}><GoogleReviews /></Suspense>
        </DeferredSection>
      </section>
      <DeferredSection minHeight={620}>
        <Suspense fallback={<div aria-hidden="true" className="min-h-[620px]" />}><ReasonsSection /></Suspense>
      </DeferredSection>
      <DeferredSection minHeight={520}>
        <Suspense fallback={<div aria-hidden="true" className="min-h-[520px]" />}><FounderTeaser /></Suspense>
      </DeferredSection>
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
