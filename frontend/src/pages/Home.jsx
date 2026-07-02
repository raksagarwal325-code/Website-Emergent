import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.listProducts({ featured: true }).then(setFeatured).catch(() => {});
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  return (
    <div data-testid="page-home">
      {/* Hero */}
      <section className="relative overflow-hidden grain">
        <div className="absolute inset-0 opacity-40">
          <img
            src={settings?.hero_image || "https://images.pexels.com/photos/4862863/pexels-photo-4862863.jpeg"}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-40 md:pt-40 md:pb-48">
          <div className="max-w-2xl fade-up">
            <div className="eyebrow mb-8">The 2026 Edit</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05]">
              Objects made for<br />
              <span className="italic text-[#D4AF37]">a considered life.</span>
            </h1>
            <p className="mt-8 text-white/70 max-w-lg leading-relaxed">
              A private catalog of watches, jewelry, and leather goods — each piece hand-selected for its provenance and its patience.
            </p>
            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                to="/catalog"
                data-testid="hero-explore-btn"
                className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] transition-colors"
              >
                Explore Catalog <ArrowUpRight size={14} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 border border-white/25 text-white px-8 py-4 uppercase text-xs tracking-[0.28em] hover:border-white/60 transition-colors"
              >
                Private Enquiry
              </Link>
            </div>
          </div>
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
          {featured.slice(0, 4).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* Editorial banner */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 aspect-[16/10] overflow-hidden">
            <img
              src="https://images.pexels.com/photos/12157290/pexels-photo-12157290.jpeg"
              alt="craft"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="md:col-span-5">
            <div className="eyebrow mb-3">The Atelier</div>
            <h2 className="font-serif text-3xl sm:text-4xl leading-tight">Slow craft, patient hands.</h2>
            <p className="mt-6 text-white/70 leading-relaxed">
              Every piece is produced in limited numbers by artisans in Como, Florence, and the Jura mountains. We list only what we would keep for ourselves.
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
