import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Truck, ShieldCheck, MessageCircle } from "lucide-react";
import SEO from "../components/SEO";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";
import GoogleReviews from "../components/GoogleReviews";
import CollageSection from "../components/CollageSection";
import ReasonsSection from "../components/ReasonsSection";
import AtelierShowcase from "../components/AtelierShowcase";
import TrustedBySection from "../components/TrustedBySection";
import GalleryPreview from "../components/GalleryPreview";
import FounderTeaser from "../components/FounderTeaser";
import { useSettings } from "../context/SettingsContext";

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const { settings, hp } = useSettings();

  useEffect(() => {
    api.listProducts({ featured: true }).then(setFeatured).catch(() => {});
  }, []);

  const waNumber = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waLink = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent("Hello Samrat Glass Emporium, I would like to enquire about your lighting collection.")}`
    : "#";

  const H = hp.hero;
  const F = hp.featured;

  const heroSecondaryHref = H.secondary_cta_link || waLink;
  const heroSecondaryExternal = heroSecondaryHref.startsWith("http") || heroSecondaryHref.startsWith("mailto") || heroSecondaryHref.startsWith("tel");

  return (
    <div data-testid="page-home">
      <SEO
        title="Samrat Glass Emporium · Handcrafted Chandeliers & Decorative Lighting · Firozabad"
        description="1000+ designs of hand-blown chandeliers, crystal hurricanes, pendants and glass lamps — crafted in Firozabad since 1981. 4.9★ · 236+ Google reviews."
        image={settings?.hero_image}
        path="/"
      />
      {/* Hero */}
      <section className="relative overflow-hidden grain">
        <motion.div
          className="absolute inset-0 opacity-45"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 0.45, scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src={settings?.hero_image || "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15"}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{background: "linear-gradient(180deg, rgba(42,17,37,0.55) 0%, rgba(22,7,15,0.85) 60%, #16070f 100%)"}}></div>
          <div className="absolute inset-0" style={{background: "radial-gradient(circle at 80% 20%, rgba(163,99,80,0.35), transparent 45%)"}}></div>
        </motion.div>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-24 md:pb-28">
          <motion.div
            className="max-w-2xl"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
            }}
          >
            <motion.div
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } } }}
              className="mb-6 inline-flex items-center gap-3 border border-[#BF9972]/30 px-4 py-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
              <span className="text-[10px] uppercase tracking-[0.32em] text-[#BF9972]">{H.eyebrow}</span>
            </motion.div>
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 26 }, visible: { opacity: 1, y: 0, transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] } } }}
              className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05]"
            >
              {H.headline_line1}<br />
              <span className="italic brand-gradient-text">{H.headline_line2}</span>
            </motion.h1>
            <motion.p
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } } }}
              className="mt-6 text-white/70 max-w-lg leading-relaxed"
            >
              {H.description}
            </motion.p>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } } }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link to={H.primary_cta_link || "/catalog"} data-testid="hero-explore-btn" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] transition-colors">
                {H.primary_cta_text} <ArrowUpRight size={14} />
              </Link>
              {H.secondary_cta_text && (heroSecondaryExternal ? (
                <a href={heroSecondaryHref} target="_blank" rel="noreferrer" data-testid="hero-wa-btn" className="inline-flex items-center gap-2 border border-white/25 text-white px-8 py-4 uppercase text-xs tracking-[0.28em] hover:border-[#D4AF37] transition-colors">
                  <MessageCircle size={14} /> {H.secondary_cta_text}
                </a>
              ) : (
                <Link to={heroSecondaryHref} data-testid="hero-wa-btn" className="inline-flex items-center gap-2 border border-white/25 text-white px-8 py-4 uppercase text-xs tracking-[0.28em] hover:border-[#D4AF37] transition-colors">
                  <MessageCircle size={14} /> {H.secondary_cta_text}
                </Link>
              ))}
            </motion.div>

            {/* Trust points strip */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } } }}
              className="mt-14 pt-8 border-t border-[#BF9972]/20 grid grid-cols-3 gap-6 max-w-lg"
            >
              {(H.trust || []).map((t, i) => (
                <div key={i}>
                  <div className="font-serif text-xl md:text-2xl brand-gradient-text leading-none">{t.value}</div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/50 mt-2">{t.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trusted-by strip (hidden until admin adds at least one entry) */}
      <TrustedBySection />

      {/* 1000+ Light Options Collage */}
      <CollageSection />

      {/* Value strip */}
      <section className="border-y border-white/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {[
            { icon: Truck, title: "Pan-India Shipping", body: "Insured door-delivery in 7–10 business days." },
            { icon: ShieldCheck, title: "Handcrafted Quality", body: "Every piece inspected before dispatch. Replacement guaranteed on transit damage." },
            { icon: MessageCircle, title: "WhatsApp Support", body: "Bulk enquiries, custom sizes & installation guidance — reply within hours." },
          ].map((f) => (
            <div key={f.title} className="p-8 flex items-start gap-4">
              <f.icon size={20} strokeWidth={1.4} className="text-[#D4AF37] mt-1" />
              <div>
                <div className="font-serif text-lg">{f.title}</div>
                <div className="text-sm text-white/60 mt-1">{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="eyebrow mb-3">{F.eyebrow}</div>
            <h2 className="font-serif text-3xl sm:text-4xl">{F.title}</h2>
          </div>
          <Link to={F.view_all_link || "/catalog"} className="hidden sm:inline-flex items-center gap-2 text-white/70 hover:text-white text-xs uppercase tracking-[0.28em] link-underline">
            {F.view_all_text} <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {featured.slice(0, F.limit || 8).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* Google Reviews */}
      <section className="max-w-7xl mx-auto px-6 pb-6">
        <GoogleReviews />
      </section>

      {/* Reasons Why We Are Better */}
      <ReasonsSection />

      {/* Meet the founder teaser */}
      <FounderTeaser />

      {/* Editorial banner / Atelier auto-rotating showcase */}
      <AtelierShowcase />

      {/* Featured Projects (auto-hides when Gallery has no items) */}
      <GalleryPreview />
    </div>
  );
}
