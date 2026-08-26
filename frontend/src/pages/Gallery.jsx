import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowUpRight, X } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { buildProjectSlugs } from "../lib/slug";
import SEO from "../components/SEO";

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

function ProjectCard({ project, index, slug, linkedProducts }) {
  const [open, setOpen] = useState(false);
  const [mediaAspect, setMediaAspect] = useState(4 / 3);
  const images = (project.images || []).filter(Boolean);
  const cover = images[0];
  const primaryProduct = linkedProducts?.[0];

  const handleImageLoad = (event) => {
    const naturalWidth = event.currentTarget?.naturalWidth || 0;
    const naturalHeight = event.currentTarget?.naturalHeight || 0;
    if (!naturalWidth || !naturalHeight) return;

    // Let installation cards follow the source photograph so the complete
    // project view remains visible, while keeping extreme aspect ratios from
    // making the archive grid impractically tall or short.
    const sourceAspect = naturalWidth / naturalHeight;
    const controlledAspect = Math.min(1.5, Math.max(0.72, sourceAspect));
    setMediaAspect((current) => Math.abs(current - controlledAspect) > 0.01 ? controlledAspect : current);
  };

  return (
    <article data-testid={`gallery-project-${index}`} className="group border border-white/8 hover:border-[#D4AF37]/40 transition-colors bg-[#0e0510] overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={() => cover && setOpen(true)}
        className="overflow-hidden bg-[#12060d] text-left flex items-center justify-center transition-[aspect-ratio] duration-500"
        style={{ aspectRatio: mediaAspect }}
        aria-label={`Open ${project.title || "project"} image`}
      >
        {cover ? (
          <img
            src={api.resolveImage(cover)}
            alt={project.title || "Samrat Glass installation project"}
            className="block w-full h-full object-contain object-center opacity-95 group-hover:opacity-100 transition-opacity duration-300"
            loading="lazy"
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/25 font-serif italic">Image pending</div>
        )}
      </button>

      <div className="p-5 md:p-6 flex flex-col flex-1">
        {project.location && (
          <div className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.26em] text-[#BF9972] mb-3">
            <MapPin size={11} strokeWidth={1.5} /> {project.location}
          </div>
        )}
        <Link to={`/gallery/${slug}`} data-testid={`gallery-project-link-${index}`}>
          <h2 className="font-serif text-xl md:text-2xl leading-tight text-white group-hover:text-[#D4AF37] transition-colors line-clamp-3">{project.title}</h2>
        </Link>

        {primaryProduct && (
          <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-white/45 line-clamp-2">
            {primaryProduct.name} · {primaryProduct.sku}
          </div>
        )}

        {project.note && (
          <p className="text-white/58 leading-relaxed text-sm mt-3 line-clamp-3">{project.note}</p>
        )}

        <div className="mt-auto pt-5">
          <Link to={`/gallery/${slug}`} className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[#D4AF37] hover:text-[#B5952F]">
            View project <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      <Lightbox open={open} onClose={() => setOpen(false)} src={cover ? api.resolveImage(cover) : ""} alt={project.title} />
    </article>
  );
}

export default function Gallery() {
  const { hp } = useSettings();
  const g = hp.gallery || {};
  const items = (g.items || []).filter((p) => (p?.title || "").trim() || (p?.images || []).some(Boolean));
  const slugs = buildProjectSlugs(items);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.listAllProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const productsByProject = useMemo(() => items.map((project) => (project.products || []).map((id) => productMap.get(id)).filter(Boolean)), [items, productMap]);

  return (
    <div data-testid="page-gallery">
      <SEO
        title={`Projects & Installations · Samrat Glass Emporium`}
        description={g.tagline || "Real Samrat Glass Emporium chandelier and decorative-lighting installations in homes, hotels and luxury interiors across India."}
        path="/gallery"
      />

      <section className="relative overflow-hidden grain border-b border-white/5">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(22,7,15,0.55) 0%, rgba(22,7,15,0.88) 70%, #16070f 100%)" }}></div>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 30%, rgba(163,99,80,0.3), transparent 55%)" }}></div>
        </div>
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-12 md:pt-20 md:pb-14 text-center">
          <div className="eyebrow mb-4">Projects & Installations</div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
            Real spaces. <span className="brand-gradient-text italic">Real Samrat lighting.</span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-white/65 text-sm md:text-base leading-relaxed">
            Client installations linked to the actual pieces from our catalogue — including custom finishes, residential projects and statement lighting across India.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10 md:py-14">
        <div className="flex items-end justify-between gap-4 mb-7 md:mb-9">
          <div>
            <div className="eyebrow mb-2">Project archive</div>
            <h2 className="font-serif text-2xl md:text-3xl">Installed across India</h2>
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">{items.length} project{items.length === 1 ? "" : "s"}</div>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 items-start">
            {items.map((p, i) => (
              <ProjectCard key={i} project={p} index={i} slug={slugs[i]} linkedProducts={productsByProject[i]} />
            ))}
          </div>
        ) : (
          <div className="border border-white/10 py-20 text-center text-white/50">
            <p className="font-serif italic max-w-md mx-auto leading-relaxed">
              Our recent installations will appear here soon — homes, hotels and luxury interiors that carry a piece from our atelier.
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
