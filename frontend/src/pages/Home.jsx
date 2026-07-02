import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Truck, ShieldCheck, MessageCircle } from "lucide-react";
import { api, formatPrice } from "../lib/api";
import ProductCard from "../components/ProductCard";
import GoogleReviews from "../components/GoogleReviews";

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.listProducts({ featured: true }).then(setFeatured).catch(() => {});
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  const waNumber = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent("Hello Samrat Glass Emporium, I would like to enquire about your lighting collection.")}` : "#";

  return (
    <div data-testid="page-home">
      {/* Hero */}
      <section className="relative overflow-hidden grain">
        <div className="absolute inset-0 opacity-45">
          <img
            src={settings?.hero_image || "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15"}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-32 md:pt-36 md:pb-40">
          <div className="max-w-2xl fade-up">
            <div className="eyebrow mb-8">Est. Firozabad · The City of Glass</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05]">
              Fancy lights that<br />
              <span className="italic text-[#D4AF37]">turn houses into homes.</span>
            </h1>
            <p className="mt-8 text-white/70 max-w-lg leading-relaxed">
              A curated catalog of crystal chandeliers, pendant lights, wall sconces, table lamps &amp; decorative lighting — hand-blown and hand-assembled by our artisans in Firozabad.
            </p>
            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                to="/catalog"
                data-testid="hero-explore-btn"
                className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] transition-colors"
              >
                Explore Catalog <ArrowUpRight size={14} />
              </Link>
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                data-testid="hero-wa-btn"
                className="inline-flex items-center gap-2 border border-white/25 text-white px-8 py-4 uppercase text-xs tracking-[0.28em] hover:border-[#D4AF37] transition-colors"
              >
                <MessageCircle size={14} /> Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

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
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="eyebrow mb-3">Featured</div>
            <h2 className="font-serif text-3xl sm:text-4xl">Pieces of the season</h2>
          </div>
          <Link to="/catalog" className="hidden sm:inline-flex items-center gap-2 text-white/70 hover:text-white text-xs uppercase tracking-[0.28em] link-underline">
            View all <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {featured.slice(0, 8).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* Google Reviews */}
      <section className="max-w-7xl mx-auto px-6 pb-8">
        <GoogleReviews />
      </section>

      {/* Editorial banner */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">          <div className="md:col-span-7 aspect-[16/10] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1587049016823-c90a1a2df325"
              alt="Chandelier craftsmanship"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="md:col-span-5">
            <div className="eyebrow mb-3">The Atelier</div>
            <h2 className="font-serif text-3xl sm:text-4xl leading-tight">Where glass is a family heirloom.</h2>
            <p className="mt-6 text-white/70 leading-relaxed">
              For four generations, our craftsmen in Firozabad have shaped molten glass into things of beauty — from the traditional <em>jhoomars</em> of Rajwada palaces to the sculpted crystal chandeliers of modern homes. Every piece we ship carries that quiet craft.
            </p>
            <Link to="/catalog" className="mt-8 inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#B5952F] text-xs uppercase tracking-[0.28em] link-underline">
              Discover the collection <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
