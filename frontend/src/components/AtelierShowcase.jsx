import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const IMAGES = [
  { src: "/atelier-1.png", label: "Chandelier Pendant" },
  { src: "/atelier-2.png", label: "Crystal Hurricane" },
  { src: "/atelier-3.png", label: "Triple-Arm Candelabra" },
  { src: "/atelier-4.png", label: "Grand Tiered Chandelier" },
  { src: "/atelier-5.png", label: "Cascade Crystal Rain" },
];

export default function AtelierShowcase() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % IMAGES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <section data-testid="atelier-section" className="max-w-7xl mx-auto px-6 py-16 md:py-20">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        {/* Cross-fade showcase */}
        <div className="md:col-span-7">
          <div
            data-testid="atelier-hero-frame"
            className="relative w-full bg-black border border-[#D4AF37]/25 overflow-hidden"
            style={{
              aspectRatio: "1 / 1",
              maxHeight: "560px",
              boxShadow:
                "0 0 0 1px rgba(191,153,114,0.15), 0 24px 60px -12px rgba(0,0,0,0.7), 0 0 80px -20px rgba(212,175,55,0.25)",
            }}
          >
            {IMAGES.map((img, i) => (
              <img
                key={img.src}
                src={img.src}
                alt={`Samrat Glass Emporium — ${img.label}`}
                className="absolute inset-0 w-full h-full object-contain transition-opacity duration-1000"
                style={{ opacity: i === active ? 1 : 0 }}
                loading={i === 0 ? "eager" : "lazy"}
              />
            ))}
            {/* Warm gold ambient glow to blend into brand palette */}
            <div
              className="absolute inset-0 pointer-events-none mix-blend-screen"
              style={{
                background:
                  "radial-gradient(circle at 50% 60%, rgba(212,175,55,0.16), transparent 55%)",
              }}
            ></div>
            {/* Editorial frame hairlines */}
            <div className="absolute inset-x-6 top-4 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent"></div>
            <div className="absolute inset-x-6 bottom-4 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent"></div>

            {/* Caption + progress dots */}
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4 pointer-events-none">
              <div className="text-[10px] uppercase tracking-[0.28em] text-[#BF9972]/90 backdrop-blur bg-black/30 px-2 py-1">
                {IMAGES[active].label}
              </div>
              <div className="flex gap-1.5 pointer-events-auto">
                {IMAGES.map((_, i) => (
                  <button
                    key={i}
                    data-testid={`atelier-dot-${i}`}
                    aria-label={`View ${IMAGES[i].label}`}
                    onClick={() => setActive(i)}
                    className={`h-1.5 transition-all ${i === active ? "w-6 bg-[#D4AF37]" : "w-1.5 bg-white/25 hover:bg-white/50"}`}
                  ></button>
                ))}
              </div>
            </div>
          </div>

          {/* Mini showcase strip */}
          <div className="mt-4 grid grid-cols-5 gap-2">
            {IMAGES.map((img, i) => (
              <button
                key={img.src}
                data-testid={`atelier-thumb-${i}`}
                onClick={() => setActive(i)}
                aria-label={`Show ${img.label}`}
                className={`relative aspect-square bg-black overflow-hidden border transition-all ${i === active ? "border-[#D4AF37]" : "border-white/10 hover:border-[#BF9972]/60"}`}
              >
                <img src={img.src} alt="" className="absolute inset-0 w-full h-full object-contain opacity-90" loading="lazy" />
                {i === active && <div className="absolute inset-0 pointer-events-none" style={{boxShadow:"inset 0 0 20px rgba(212,175,55,0.35)"}}></div>}
              </button>
            ))}
          </div>
        </div>

        {/* Copy */}
        <div className="md:col-span-5">
          <div className="eyebrow mb-3">The Atelier</div>
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight">Where glass is a family heirloom.</h2>
          <p className="mt-6 text-white/70 leading-relaxed">
            For more than 40 years, our craftsmen in Firozabad have shaped glass into decorative lighting that brings warmth, beauty, and character into Indian homes, hotels, showrooms, and luxury interiors. From traditional <em>jhoomars</em> to crystal chandeliers and handcrafted glass lamps, every piece reflects quiet craft and careful finishing.
          </p>
          <Link to="/catalog" className="mt-8 inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#B5952F] text-xs uppercase tracking-[0.28em] link-underline">
            Discover the collection <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
