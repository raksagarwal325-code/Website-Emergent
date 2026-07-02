import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function CollageSection() {
  return (
    <section data-testid="collage-section" className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse at 20% 50%, rgba(163,99,80,0.25), transparent 55%)"}}></div>
      <div className="relative max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Collage + Badge */}
        <div className="lg:col-span-7 relative">
          <div className="relative aspect-square overflow-hidden brand-glow" style={{boxShadow:"0 0 0 1px rgba(212,175,55,0.4), 0 20px 60px -10px rgba(163,99,80,0.6)"}}>
            <img src="/collage.png" alt="Samrat Glass Emporium chandelier collection" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{background:"linear-gradient(135deg, rgba(42,17,37,0.15) 0%, transparent 60%)"}}></div>
          </div>
          {/* Circular badge overlay */}
          <div className="absolute -bottom-6 -right-6 md:-bottom-10 md:-right-10 w-32 h-32 md:w-44 md:h-44 rounded-full flex items-center justify-center text-center relative"
               style={{background:"radial-gradient(circle at 30% 30%, #BF9972, #A36350 60%, #8B4F3F)", boxShadow:"0 0 0 2px rgba(212,175,55,0.6), 0 15px 40px -8px rgba(0,0,0,0.7)"}}>
            <div className="absolute inset-2 border border-[#D4AF37]/40 rounded-full pointer-events-none"></div>
            <div className="px-4">
              <div className="font-serif text-3xl md:text-5xl text-[#2A1125] leading-none">1000+</div>
              <div className="text-[9px] md:text-[10px] uppercase tracking-[0.24em] text-[#2A1125]/85 mt-1 md:mt-2">Light Options<br/>Inside</div>
            </div>
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
