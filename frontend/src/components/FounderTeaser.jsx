import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export default function FounderTeaser() {
  const { hp } = useSettings();
  const f = hp?.about?.founder || {};
  const t = hp?.founder_teaser || {};

  // Honour the CMS toggle (defaults to enabled) and require at minimum a photo.
  if (t.enabled === false || !f.image) return null;

  const eyebrow = t.eyebrow || "Meet the founder";
  const title = t.title || "Four decades of glass, in one steady hand.";
  const body =
    t.body ||
    "Since 1981, Mr. Sunil Kumar Agarwal has led our atelier in Firozabad — training master craftsmen, pushing form and finish, and quietly building a name that lights homes, hotels and hospitality across India.";
  const cta_text = t.cta_text || "Read our story";
  const cta_link = t.cta_link || "/about";

  return (
    <section
      data-testid="founder-teaser"
      className="max-w-7xl mx-auto px-6 py-20 md:py-24"
    >
      <div className="relative warm-panel overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.55), transparent 65%)" }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(163,99,80,0.55), transparent 65%)" }}
        />

        <div className="relative grid md:grid-cols-[280px_1fr] gap-8 md:gap-12 items-center p-8 md:p-14">
          {/* Photo */}
          <div className="flex justify-center md:justify-start">
            <div
              data-testid="founder-teaser-photo"
              className="rounded-full overflow-hidden brand-glow ring-2 ring-[#D4AF37]/40"
              style={{ width: 240, height: 240, minWidth: 240, minHeight: 240 }}
            >
              <img
                src={f.image}
                alt={f.name || "Founder"}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%", display: "block" }}
              />
            </div>
          </div>

          {/* Copy */}
          <div className="text-center md:text-left">
            <div className="eyebrow mb-4 text-[#D4AF37]">{eyebrow}</div>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.1] mb-5">
              {title}
            </h2>
            <p className="text-white/70 leading-relaxed md:text-lg max-w-2xl md:max-w-none">
              {body}
            </p>

            {f.name && (
              <div className="mt-6 flex items-center gap-3 justify-center md:justify-start text-[11px] uppercase tracking-[0.32em] text-[#BF9972]">
                <span className="inline-block w-8 h-px bg-[#D4AF37]/60" />
                {f.name}
                {f.signature && <span className="text-white/40">·</span>}
                {f.signature && <span className="text-white/50 tracking-normal normal-case text-sm italic">Since 1981</span>}
              </div>
            )}

            <div className="mt-8 flex justify-center md:justify-start">
              <Link
                to={cta_link}
                data-testid="founder-teaser-cta"
                className="group inline-flex items-center gap-2 border border-[#D4AF37]/60 hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors px-7 py-3.5 uppercase text-xs tracking-[0.28em] text-[#D4AF37]"
              >
                {cta_text}
                <ArrowUpRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
