import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowUpRight, X } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { buildProjectSlugs } from "../lib/slug";
import SEO from "../components/SEO";

/**
 * Project gallery — CMS-driven "Our work in the wild".
 * Each item: { title, location, note, images:[url,...] }.
 * The page auto-hides itself when there are zero items (empty state message).
 */
function Lightbox({ open, onClose, src, alt }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex items-center justify-center p-4" onClick={onClose} data-testid="gallery-lightbox">
      <button aria-label="Close" onClick={onClose} className="absolute top-4 right-4 w-10 h-10 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 flex items-center justify-center">
        <X size={18} />
      </button>
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function ProjectCard({ project, index, slug }) {
  const [openIdx, setOpenIdx] = useState(null);
  const images = (project.images || []).filter(Boolean);
  const cover = images[0];
  const rest = images.slice(1);
  return (
    <article data-testid={`gallery-project-${index}`} className="border border-white/8 hover:border-[#D4AF37]/40 transition-colors bg-[#0e0510]">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
        <div className="md:col-span-3 aspect-[4/3] md:aspect-auto md:min-h-[340px] overflow-hidden bg-black">
          {cover ? (
            <img
              src={api.resolveImage(cover)}
              alt={project.title || "Project"}
              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-700"
              onClick={() => setOpenIdx(0)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/25 font-serif italic">Image pending</div>
          )}
        </div>
        <div className="md:col-span-2 p-8 md:p-10 flex flex-col justify-center">
          {project.location && (
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#BF9972] mb-4">
              <MapPin size={12} strokeWidth={1.5} /> {project.location}
            </div>
          )}
          <Link to={`/gallery/${slug}`} data-testid={`gallery-project-link-${index}`} className="group">
            <h3 className="font-serif text-2xl md:text-3xl leading-tight text-white group-hover:text-[#D4AF37] transition-colors mb-4">{project.title}</h3>
          </Link>
          {project.note && (
            <p className="text-white/70 leading-relaxed text-sm md:text-[15px] line-clamp-4">{project.note}</p>
          )}
          <div className="mt-5">
            <Link to={`/gallery/${slug}`} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#D4AF37] hover:text-[#B5952F]">
              View project <ArrowUpRight size={12} />
            </Link>
          </div>
          {rest.length > 0 && (
            <div className="mt-6 grid grid-cols-4 gap-2">
              {rest.slice(0, 4).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setOpenIdx(i + 1)}
                  className="aspect-square overflow-hidden bg-black hover:opacity-90"
                  data-testid={`gallery-thumb-${index}-${i + 1}`}
                >
                  <img src={api.resolveImage(img)} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <Lightbox open={openIdx !== null} onClose={() => setOpenIdx(null)} src={openIdx !== null ? api.resolveImage(images[openIdx]) : ""} alt={project.title} />
    </article>
  );
}

export default function Gallery() {
  const { hp, settings } = useSettings();
  const g = hp.gallery || {};
  const items = (g.items || []).filter((p) => (p?.title || "").trim() || (p?.images || []).some(Boolean));
  const slugs = buildProjectSlugs(items);

  return (
    <div data-testid="page-gallery">
      <SEO
        title={`${g.title_pre || "Our Work"} ${g.title_highlight || "in the wild"} · Samrat Glass Emporium`}
        description={g.tagline || "Handcrafted chandeliers and decorative lighting installed in homes, hotels, and luxury interiors across India."}
        path="/gallery"
      />

      {/* Hero */}
      <section className="relative overflow-hidden grain">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(22,7,15,0.6) 0%, rgba(22,7,15,0.9) 60%, #16070f 100%)" }}></div>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 30%, rgba(163,99,80,0.35), transparent 55%)" }}></div>
        </div>
        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-20 text-center">
          <div className="eyebrow mb-6">{g.eyebrow || "Installations"}</div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
            {g.title_pre || "Our Work"} <span className="brand-gradient-text italic">{g.title_highlight || "in the wild."}</span>
          </h1>
          {g.tagline && (
            <p className="mt-6 max-w-2xl mx-auto text-white/70 text-base md:text-lg leading-relaxed">{g.tagline}</p>
          )}
        </div>
      </section>

      {/* Projects */}
      <section className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        {items.length > 0 ? (
          <div className="space-y-10 md:space-y-14">
            {items.map((p, i) => <ProjectCard key={i} project={p} index={i} slug={slugs[i]} />)}
          </div>
        ) : (
          <div className="border border-white/10 py-20 text-center text-white/50">
            <p className="font-serif italic max-w-md mx-auto leading-relaxed">
              Our recent installations will appear here soon — homes, hotels, and luxury interiors that carry a piece from our atelier.
            </p>
            <Link to="/contact" className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[#D4AF37] hover:text-[#B5952F]">
              Have a project for us? <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
