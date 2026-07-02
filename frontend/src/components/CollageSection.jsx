import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function CollageSection() {
  return (
    <section data-testid="collage-section" className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse at 20% 50%, rgba(163,99,80,0.25), transparent 55%)"}}></div>
      <div className="relative max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Collage (badge is already baked into the image) */}
        <div className="lg:col-span-7 relative">
          <div className="relative aspect-square overflow-hidden brand-glow" style={{boxShadow:"0 0 0 1px rgba(212,175,55,0.4), 0 20px 60px -10px rgba(163,99,80,0.6)"}}>
            <img src="/collage.png" alt="Samrat Glass Emporium chandelier collection — 1000+ light options" className="w-full h-full object-cover" />
            <div className="absolute inset-0 pointer-events-none" style={{background:"linear-gradient(135deg, rgba(42,17,37,0.15) 0%, transparent 60%)"}}></div>
          </div>
        </div>
        {/* Copy */}
        <div className="lg:col-span-5">
          <div className="eyebrow mb-3">The Full Range</div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-[1.1]">
            <span className="brand-gradient-text">1000+ Light Options</span> Inside
          </h2>
          <p className="mt-6 text-white/70 leading-relaxed">
            Handcrafted decorative lighting from Firozabad — chandeliers, hanging lights, wall lights, table lamps, floor lamps and sconces in every finish, size and mood you can imagine.
          </p>
          <p className="mt-3 text-white/50 text-sm leading-relaxed">
            From compact bedroom sconces to grand foyer chandeliers, our workshop produces designs for every Indian home, hotel, showroom and restaurant.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/catalog" data-testid="collage-explore-btn" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">
              Explore Catalog <ArrowUpRight size={14} />
            </Link>
            <Link to="/about" className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.28em]">
              Our Story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
