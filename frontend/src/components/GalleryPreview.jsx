import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowUpRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";

/**
 * Home-page preview of the /gallery projects.
 * Renders only when at least one project exists (auto-hidden otherwise).
 * Shows up to 3 most recently added projects; "View all" links to /gallery.
 */
export default function GalleryPreview() {
  const { hp } = useSettings();
  const g = hp.gallery || {};
  const items = (g.items || []).filter((p) => (p?.title || "").trim() || (p?.images || []).some(Boolean));
  if (items.length === 0) return null;
  const preview = items.slice(0, 3);

  return (
    <section data-testid="home-gallery-preview" className="relative py-20 md:py-28 border-t border-[#BF9972]/15 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-25" style={{ background: "radial-gradient(ellipse at 20% 40%, rgba(163,99,80,0.3), transparent 55%)" }}></div>
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 md:mb-14 gap-4">
          <div>
            <div className="eyebrow mb-3">{g.eyebrow || "Installations"}</div>
            <h2 className="font-serif text-3xl md:text-5xl leading-tight">
              {g.title_pre || "Our Work"} <span className="brand-gradient-text italic">{g.title_highlight || "in the wild."}</span>
            </h2>
          </div>
          <Link to="/gallery" data-testid="home-gallery-view-all"
            className="inline-flex items-center gap-2 self-start md:self-end text-xs uppercase tracking-[0.28em] text-[#D4AF37] hover:text-[#B5952F] transition-colors flex-shrink-0">
            View full gallery <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {preview.map((p, i) => {
            const cover = (p.images || []).filter(Boolean)[0];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                data-testid={`home-gallery-card-${i}`}
                className="group border border-white/8 hover:border-[#D4AF37]/50 transition-colors bg-[#0e0510]"
              >
                <Link to="/gallery" className="block">
                  <div className="aspect-[4/5] overflow-hidden bg-black">
                    {cover ? (
                      <img
                        src={api.resolveImage(cover)}
                        alt={p.title || "Project"}
                        loading="lazy"
                        className="w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/25 font-serif italic">Image pending</div>
                    )}
                  </div>
                  <div className="p-5 md:p-6">
                    {p.location && (
                      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-[#BF9972] mb-3">
                        <MapPin size={11} strokeWidth={1.5} /> {p.location}
                      </div>
                    )}
                    <h3 className="font-serif text-lg md:text-xl leading-snug text-white group-hover:text-[#D4AF37] transition-colors line-clamp-2">
                      {p.title}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
