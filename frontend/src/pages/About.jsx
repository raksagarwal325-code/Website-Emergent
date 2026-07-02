import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Award, Sparkles, Package, Truck } from "lucide-react";
import ReasonsSection from "../components/ReasonsSection";

const STATS = [
  { icon: Award, value: "1981", label: "Founded" },
  { icon: Sparkles, value: "40+", label: "Years Experience" },
  { icon: Package, value: "1000+", label: "Designs" },
  { icon: Truck, value: "Pan-India", label: "Delivery" },
];

export default function About() {
  return (
    <div data-testid="page-about">
      {/* Hero */}
      <section className="relative overflow-hidden grain">
        <div className="absolute inset-0 opacity-25">
          <img src="/collage.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{background:"linear-gradient(180deg, rgba(22,7,15,0.75) 0%, rgba(22,7,15,0.95) 60%, #16070f 100%)"}}></div>
          <div className="absolute inset-0" style={{background:"radial-gradient(circle at 20% 30%, rgba(163,99,80,0.35), transparent 45%)"}}></div>
        </div>
        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24 text-center">
          <div className="flex justify-center mb-8">
            <img src="/logo.jpeg" alt="Samrat Glass Emporium" className="w-20 h-20 object-cover brand-glow" />
          </div>
          <div className="eyebrow mb-6">Est. Firozabad · Since 1981</div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
            About <span className="brand-gradient-text">Samrat Glass Emporium</span>
          </h1>
          <p className="mt-6 text-[#BF9972] text-sm md:text-base italic">The story of four generations of glass — and the craft that lights every corner of it.</p>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-4xl mx-auto px-6 py-20 space-y-8 text-white/80 leading-relaxed">
        <p className="text-lg first-letter:font-serif first-letter:text-5xl first-letter:text-[#D4AF37] first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:mt-1">
          Established in 1981 in Firozabad, the City of Glass, Samrat Glass Emporium is a trusted manufacturer of handcrafted decorative lighting. We create a wide range of hanging chandeliers, hanging lights, wall lights, table lamps, floor lamps, sconces, and customized decorative lighting solutions.
        </p>
        <p>Light does more than illuminate a space — it shapes mood, personality, and atmosphere. With this vision, Samrat Glass Emporium was founded to bring elegant, handcrafted lighting into Indian homes, hotels, showrooms, restaurants, and luxury interiors.</p>
        <p>Under the guidance of our founder, Mr. Sunil Kumar Agarwal, our craftsmen combine traditional glass-making techniques with modern design sensibilities. With more than 40 years of experience, we continue to create decorative lighting that blends artistry, quality, and sophistication.</p>
        <p>Our aim is to provide Indian consumers with designer lighting products that help them transform ordinary spaces into beautiful, memorable interiors.</p>
      </section>

      {/* Founder callout */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="warm-panel border-l-2 border-[#D4AF37] p-8 md:p-10 flex flex-col md:flex-row gap-6 md:items-center relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 pointer-events-none" style={{background:"radial-gradient(circle at 80% 50%, rgba(191,153,114,0.35), transparent 60%)"}}></div>
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full flex-shrink-0 flex items-center justify-center brand-glow" style={{background:"linear-gradient(135deg,#A36350,#8B4F3F)"}}>
            <span className="font-serif text-4xl text-[#2A1125]">S</span>
          </div>
          <div className="relative">
            <div className="eyebrow mb-2 text-[#D4AF37]">Our Founder</div>
            <h3 className="font-serif text-2xl md:text-3xl mb-3">Mr. Sunil Kumar Agarwal</h3>
            <p className="text-white/70 leading-relaxed">Founded under the guidance of Mr. Sunil Kumar Agarwal, with over 40 years of experience in handcrafted decorative lighting — combining Firozabad&apos;s traditional glass artistry with contemporary Indian design sensibility.</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div key={s.label} data-testid={`stat-${i}`} className="warm-panel p-8 text-center">
              <s.icon size={20} strokeWidth={1.4} className="text-[#D4AF37] mx-auto mb-4" />
              <div className="font-serif text-3xl md:text-4xl brand-gradient-text">{s.value}</div>
              <div className="text-xs uppercase tracking-[0.24em] text-white/50 mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <ReasonsSection compact />

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="font-serif text-3xl md:text-4xl mb-6">See the collection your space deserves.</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/catalog" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">
            Explore Catalog <ArrowUpRight size={14} />
          </Link>
          <Link to="/contact" className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.28em]">Get in touch</Link>
        </div>
      </section>
    </div>
  );
}
