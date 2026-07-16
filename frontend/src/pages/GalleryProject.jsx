import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowLeft, X, ChevronLeft, ChevronRight, ArrowUpRight, ShoppingBag } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useCatalog } from "../context/CatalogContext";
import { api, formatPrice, formatProductPrice } from "../lib/api";
import { findProjectBySlug, buildProjectSlugs } from "../lib/slug";
import SEO from "../components/SEO";
import { toast } from "sonner";

/**
 * Single-project view at /gallery/:slug
 * Large editorial layout: cover hero → story → image grid with lightbox → prev/next projects.
 */
function Lightbox({ open, index, images, onClose, onNav }) {
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNav(-1);
      if (e.key === "ArrowRight") onNav(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onNav]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur flex items-center justify-center p-4" onClick={onClose} data-testid="project-lightbox">
      <button aria-label="Close" onClick={onClose} className="absolute top-4 right-4 w-10 h-10 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 flex items-center justify-center z-10">
        <X size={18} />
      </button>
      {images.length > 1 && (
        <>
          <button aria-label="Previous" onClick={(e) => { e.stopPropagation(); onNav(-1); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 flex items-center justify-center z-10">
            <ChevronLeft size={18} />
          </button>
          <button aria-label="Next" onClick={(e) => { e.stopPropagation(); onNav(1); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 flex items-center justify-center z-10">
            <ChevronRight size={18} />
          </button>
        </>
      )}
      <img src={api.resolveImage(images[index])} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
      {images.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-[0.28em] text-white/60">
          {String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
        </div>
      )}
    </div>
  );
}

export default function GalleryProject() {
  const { slug } = useParams();
  const { hp, settings } = useSettings();
  const { addToCart } = useCatalog();
  const items = hp.gallery?.items || [];
  const { project, index } = findProjectBySlug(items, slug);
  const allSlugs = buildProjectSlugs(items);
  const [lbIdx, setLbIdx] = useState(null);
  const [allProducts, setAllProducts] = useState([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [slug]);
  useEffect(() => { api.listAllProducts().then(setAllProducts).catch(() => {}); }, []);

  const linkedProducts = useMemo(() => {
    if (!project) return [];
    const ids = new Set(project.products || []);
    return allProducts.filter((p) => ids.has(p.id));
  }, [project, allProducts]);

  const waRaw = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");

  // Settings still loading — don't redirect yet
  if (settings === null) {
    return <div className="max-w-7xl mx-auto px-6 py-24 text-white/40 text-sm">Loading project…</div>;
  }
  if (!project) return <Navigate to="/gallery" replace />;

  const images = (project.images || []).filter(Boolean);
  const cover = images[0];
  const rest = images.slice(1);
  const openLightbox = (i) => setLbIdx(i);
  const closeLightbox = () => setLbIdx(null);
  const navLightbox = (dir) => setLbIdx((i) => (i + dir + images.length) % images.length);

  const prevIdx = (index - 1 + items.length) % items.length;
  const nextIdx = (index + 1) % items.length;
  const prevProject = items[prevIdx];
  const nextProject = items[nextIdx];

  return (
    <div data-testid={`page-gallery-project-${slug}`}>
      <SEO
        title={`${project.title} · Samrat Glass Emporium Gallery`}
        description={(project.note || "").slice(0, 155) || `${project.title} — a Samrat Glass Emporium installation in ${project.location || "India"}.`}
        image={cover ? api.resolveImage(cover) : undefined}
        path={`/gallery/${slug}`}
        type="article"
      />

      {/* Cover hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 pt-14 md:pt-20 pb-6">
          <Link to="/gallery" data-testid="project-back-link" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-white mb-6 link-underline">
            <ArrowLeft size={14} /> Back to gallery
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            {project.location && (
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-[#BF9972] mb-4">
                <MapPin size={12} strokeWidth={1.5} /> {project.location}
              </div>
            )}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-white">{project.title}</h1>
          </motion.div>
        </div>
        {cover && (
          <div className="max-w-7xl mx-auto px-6">
            <button type="button" onClick={() => openLightbox(0)} className="block w-full group" data-testid="project-cover">
              <div className="aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-black">
                <img src={api.resolveImage(cover)} alt={project.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
              </div>
            </button>
          </div>
        )}
      </section>

      {/* Story */}
      {project.note && (
        <section className="max-w-3xl mx-auto px-6 py-14 md:py-20">
          <p className="text-white/80 leading-relaxed text-lg md:text-xl first-letter:font-serif first-letter:text-5xl first-letter:text-[#D4AF37] first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:mt-1 whitespace-pre-line">
            {project.note}
          </p>
        </section>
      )}

      {/* Additional images grid */}
      {rest.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
          <div className="eyebrow mb-6">Detail views</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {rest.map((img, i) => (
              <button
                key={i}
                onClick={() => openLightbox(i + 1)}
                data-testid={`project-thumb-${i}`}
                className="aspect-[4/3] overflow-hidden bg-black group"
              >
                <img src={api.resolveImage(img)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Featured products in this project */}
      {linkedProducts.length > 0 && (
        <section className="border-t border-[#BF9972]/15" data-testid="project-linked-products">
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
            <div className="mb-8 md:mb-10">
              <div className="eyebrow mb-3">Featured Pieces</div>
              <h2 className="font-serif text-2xl md:text-4xl leading-tight">
                Pieces used in <span className="brand-gradient-text italic">this installation.</span>
              </h2>
              <p className="mt-3 text-white/60 max-w-xl text-sm md:text-base">Inquire directly about any piece below — we&apos;ll share sizing, finish options and a final quotation.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {linkedProducts.map((p) => {
                const img = api.resolveImage(p.images?.[0]);
                const waHref = waRaw
                  ? `https://wa.me/${waRaw}?text=${encodeURIComponent(`Hi Rakshit ji, I saw the ${p.name} (SKU: ${p.sku}) in your ${project.title} project on the website. Please share more details.`)}`
                  : "";
                const handleAdd = (e) => { e.preventDefault(); e.stopPropagation(); addToCart(p); toast.success(`${p.name} added to inquiry`); };
                return (
                  <div key={p.id} data-testid={`project-product-${p.id}`} className="group border border-white/8 hover:border-[#D4AF37]/50 bg-[#0e0510] transition-colors flex flex-col">
                    <Link to={`/product/${p.id}`} className="block">
                      <div className="aspect-[4/5] overflow-hidden bg-[#0e0510] flex items-center justify-center">
                        {img ? (
                          <img src={img} alt={p.name} loading="lazy" className="w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                        ) : (
                          <span className="font-serif italic text-[#D4AF37]/15 text-8xl">S</span>
                        )}
                      </div>
                    </Link>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="eyebrow truncate">{p.category}</div>
                      <Link to={`/product/${p.id}`} className="font-serif text-lg leading-snug text-white group-hover:text-[#D4AF37] transition-colors line-clamp-2 mt-2 min-h-[3rem]">{p.name}</Link>
                      {p.short_description && <p className="text-xs text-white/50 mt-2 line-clamp-2">{p.short_description}</p>}
                      <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                        {(() => {
                          const fp = formatProductPrice(p);
                          if (fp.onRequest) {
                            return <span className="text-[#D4AF37] font-serif text-base italic">Price on request</span>;
                          }
                          return (
                            <>
                              {fp.label && <span className="text-[10px] uppercase tracking-[0.22em] text-[#BF9972]">{fp.label}</span>}
                              <span className="text-[#D4AF37] font-serif text-lg">{fp.primary}</span>
                              {fp.compareAt && <span className="text-white/40 line-through text-xs">{fp.compareAt}</span>}
                            </>
                          );
                        })()}
                      </div>
                      <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
                        <button onClick={handleAdd} data-testid={`project-product-add-${p.id}`} className="inline-flex items-center justify-center gap-1 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 px-2 py-2.5 text-[10px] uppercase tracking-[0.16em] transition-colors">
                          <ShoppingBag size={11} /> Inquire
                        </button>
                        {waHref && (
                          <a href={waHref} target="_blank" rel="noreferrer" data-testid={`project-product-wa-${p.id}`} className="inline-flex items-center justify-center bg-[#D4AF37] text-black px-2 py-2.5 text-[10px] uppercase tracking-[0.16em] hover:bg-[#B5952F]">
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Prev / next projects */}
      {items.length > 1 && (
        <section className="border-t border-[#BF9972]/15">
          <div className="max-w-7xl mx-auto px-6 py-10 md:py-14 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to={`/gallery/${allSlugs[prevIdx]}`} data-testid="project-prev-link" className="group border border-white/8 hover:border-[#D4AF37]/50 p-6 transition-colors">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/40 flex items-center gap-2 mb-2"><ArrowLeft size={12} /> Previous project</div>
              <div className="font-serif text-lg md:text-xl group-hover:text-[#D4AF37] transition-colors">{prevProject.title}</div>
              {prevProject.location && <div className="text-xs text-[#BF9972] mt-1">{prevProject.location}</div>}
            </Link>
            <Link to={`/gallery/${allSlugs[nextIdx]}`} data-testid="project-next-link" className="group border border-white/8 hover:border-[#D4AF37]/50 p-6 transition-colors text-right">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/40 flex items-center justify-end gap-2 mb-2">Next project <ArrowUpRight size={12} /></div>
              <div className="font-serif text-lg md:text-xl group-hover:text-[#D4AF37] transition-colors">{nextProject.title}</div>
              {nextProject.location && <div className="text-xs text-[#BF9972] mt-1">{nextProject.location}</div>}
            </Link>
          </div>
        </section>
      )}

      <Lightbox open={lbIdx !== null} index={lbIdx ?? 0} images={images} onClose={closeLightbox} onNav={navLightbox} />
    </div>
  );
}
