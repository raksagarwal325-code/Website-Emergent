import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export default function AtelierShowcase() {
  const { hp } = useSettings();
  const A = hp.atelier;
  const IMAGES = (A.images || []).filter((i) => i && i.src);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (IMAGES.length <= 1) return;
    const id = setInterval(() => setActive((i) => (i + 1) % IMAGES.length), 6000);
    return () => clearInterval(id);
  }, [IMAGES.length]);

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
                key={img.src + i}
                src={img.src}
                alt={`Samrat Glass Emporium — ${img.caption || ""}`}
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
                {IMAGES[active]?.caption || ""}
              </div>
              <div className="flex gap-1.5 pointer-events-auto">
                {IMAGES.map((_, i) => (
                  <button
                    key={i}
                    data-testid={`atelier-dot-${i}`}
                    aria-label={`View ${IMAGES[i].caption}`}
                    onClick={() => setActive(i)}
                    className={`h-1.5 transition-all ${i === active ? "w-6 bg-[#D4AF37]" : "w-1.5 bg-white/25 hover:bg-white/50"}`}
                  ></button>
                ))}
              </div>
            </div>
          </div>

          {/* Mini showcase strip */}
          <div className="mt-4 grid gap-2" style={{gridTemplateColumns:`repeat(${Math.max(IMAGES.length,1)}, minmax(0, 1fr))`}}>
            {IMAGES.map((img, i) => (
              <button
                key={img.src + i}
                data-testid={`atelier-thumb-${i}`}
                onClick={() => setActive(i)}
                aria-label={`Show ${img.caption}`}
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
          <div className="eyebrow mb-3">{A.eyebrow}</div>
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight">{A.headline}</h2>
          <p className="mt-6 text-white/70 leading-relaxed whitespace-pre-wrap">{A.paragraph}</p>
          <Link to={A.cta_link || "/catalog"} className="mt-8 inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#B5952F] text-xs uppercase tracking-[0.28em] link-underline">
            {A.cta_text} <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
