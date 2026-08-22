import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowLeft, X, ChevronLeft, ChevronRight, ArrowUpRight, ShoppingBag } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useCatalog } from "../context/CatalogContext";
import { api, formatProductPrice } from "../lib/api";
import { findProjectBySlug, buildProjectSlugs } from "../lib/slug";
import { waGalleryProductLink } from "../lib/whatsapp";
import { productPath } from "../lib/productUrl";
import { productImageAlt, galleryImageAlt } from "../lib/imageSeo";
import { projectProductPresentation, projectQuickAnswer } from "../lib/projectProducts";
import SEO from "../components/SEO";
import { toast } from "sonner";

function Lightbox({ open, index, images, project, onClose, onNav }) {
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
      <button aria-label="Close" onClick={onClose} className="absolute top-4 right-4 w-10 h-10 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 flex items-center justify-center z-10"><X size={18} /></button>
      {images.length > 1 && <>
        <button aria-label="Previous" onClick={(e) => { e.stopPropagation(); onNav(-1); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 flex items-center justify-center z-10"><ChevronLeft size={18} /></button>
        <button aria-label="Next" onClick={(e) => { e.stopPropagation(); onNav(1); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 flex items-center justify-center z-10"><ChevronRight size={18} /></button>
      </>}
      <img src={api.resolveImage(images[index])} alt={galleryImageAlt({ title: project.title, location: project.location, view: index + 1 })} className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
      {images.length > 1 && <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-[0.28em] text-white/60">{String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</div>}
    </div>
  );
}

const SnapshotItem = ({ label, value }) => value ? (
  <div className="border-t border-white/8 pt-3">
    <div className="text-[9px] uppercase tracking-[0.24em] text-[#BF9972] mb-1">{label}</div>
    <div className="text-sm text-white/80 leading-relaxed">{value}</div>
  </div>
) : null;

const TocLink = ({ href, children }) => (
  <a href={href} className="text-white/65 hover:text-[#D4AF37] underline underline-offset-4 decoration-white/20 hover:decoration-[#D4AF37]/60 transition-colors">
    {children}
  </a>
);

function ProductStories({ products }) {
  if (!products?.length) return null;
  const isMulti = products.length > 1;

  return (
    <section id="catalogue-piece" className="border-t border-[#BF9972]/15 scroll-mt-28">
      <div className="max-w-5xl mx-auto px-6 py-14 md:py-18">
        <div className="eyebrow mb-3">{isMulti ? "The catalogue pieces" : "The catalogue piece"}</div>
        <div className={isMulti ? "space-y-12" : ""}>
          {products.map((product, productIndex) => {
            const description = product.short_description || product.description;
            const specs = product.specs && typeof product.specs === "object"
              ? Object.entries(product.specs).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "").slice(0, 8)
              : [];

            return (
              <article key={product.id || product.sku || product.name} className={productIndex > 0 ? "pt-10 border-t border-white/8" : ""}>
                {isMulti && <div className="text-[9px] uppercase tracking-[0.24em] text-white/35 mb-3">Catalogue piece {productIndex + 1} of {products.length}</div>}
                <h2 className="font-serif text-3xl md:text-5xl leading-tight">{product.name}</h2>
                <div className="mt-3 text-[10px] uppercase tracking-[0.24em] text-[#BF9972]">{product.category} · {product.sku}</div>
                {description && <p className="mt-6 text-white/70 text-base md:text-lg leading-relaxed max-w-3xl">{description}</p>}
                {specs.length > 0 && (
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 border-y border-white/8">
                    {specs.map(([label, value]) => (
                      <div key={label} className="py-3 border-b border-white/8 sm:[&:nth-last-child(-n+2)]:border-b-0">
                        <div className="text-[9px] uppercase tracking-[0.22em] text-white/40">{label.replace(/_/g, " ")}</div>
                        <div className="mt-1 text-sm text-white/75">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                )}
                <Link to={productPath(product)} className="mt-7 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#D4AF37] hover:text-[#B5952F]">
                  View catalogue piece <ArrowUpRight size={12} />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
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

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" }); }, [slug]);
  useEffect(() => { api.listAllProducts().then(setAllProducts).catch(() => {}); }, []);

  const linkedProducts = useMemo(() => {
    if (!project) return [];
    const ids = new Set(project.products || []);
    return allProducts.filter((p) => ids.has(p.id));
  }, [project, allProducts]);

  if (settings === null) return <div className="max-w-7xl mx-auto px-6 py-24 text-white/40 text-sm">Loading project…</div>;
  if (!project) return <Navigate to="/gallery" replace />;

  const images = (project.images || []).filter(Boolean);
  const cover = images[0];
  const prevIdx = (index - 1 + items.length) % items.length;
  const nextIdx = (index + 1) % items.length;
  const prevProject = items[prevIdx];
  const nextProject = items[nextIdx];
  const productPresentation = projectProductPresentation(linkedProducts);

  const optionalSnapshot = [
    ["Project type", project.project_type],
    ["Space", project.space_type],
    ["Client", project.client_type],
    ["Customisation", project.customisation],
    ["Completion", project.completion_year],
    ["Architect / designer", project.architect_designer],
  ];
  const hasExtendedSnapshot = optionalSnapshot.some(([, value]) => Boolean(value));

  const quickAnswer = projectQuickAnswer({
    location: project.location,
    customisation: project.customisation,
    products: linkedProducts,
  });

  const creativeWorkSchema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.note || undefined,
    url: `https://samratglass.com/gallery/${slug}`,
    image: images.map((img) => api.resolveImage(img)),
    contentLocation: project.location ? { "@type": "Place", name: project.location } : undefined,
    creator: { "@type": "Organization", name: "Samrat Glass Emporium", url: "https://samratglass.com" },
    about: linkedProducts.length ? linkedProducts.map((p) => ({ "@type": "Product", name: p.name, sku: p.sku, url: `https://samratglass.com${productPath(p)}` })) : undefined,
  };

  const faqItems = [
    linkedProducts.length ? {
      q: productPresentation.faqQuestion,
      a: productPresentation.faqAnswer,
    } : null,
    {
      q: "Can Samrat Glass Emporium discuss a similar installation for my space?",
      a: "Yes. Share your room photographs, ceiling height and the fixture you are considering. Project requirements and available finish or sizing options can be discussed before quotation.",
    },
    {
      q: "Are these real installation photographs?",
      a: "Yes. The images shown in this project gallery are photographs from client installations supplied by Samrat Glass Emporium.",
    },
  ].filter(Boolean);

  return (
    <div data-testid={`page-gallery-project-${slug}`}>
      <SEO
        title={`${project.title} | Samrat Glass Project`}
        description={(project.note || "").slice(0, 155) || `${project.title} — a Samrat Glass Emporium installation in ${project.location || "India"}.`}
        image={cover ? api.resolveImage(cover) : undefined}
        path={`/gallery/${slug}`}
        type="article"
      />
      <script type="application/ld+json" data-schema="project-creativework">{JSON.stringify(creativeWorkSchema)}</script>

      <section className="relative overflow-hidden border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 pt-12 md:pt-16 pb-6">
          <Link to="/gallery" data-testid="project-back-link" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-white/55 hover:text-white mb-5"><ArrowLeft size={13} /> Projects & installations</Link>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="max-w-4xl">
            {project.location && <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#BF9972] mb-4"><MapPin size={12} strokeWidth={1.5} /> {project.location}</div>}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-[1.04] text-white">{project.title}</h1>
            {linkedProducts.length > 0 && <div className="mt-5 text-[10px] uppercase tracking-[0.22em] text-white/45">{productPresentation.heroLabel}</div>}
          </motion.div>
        </div>
        {cover && <div className="max-w-7xl mx-auto px-6 pb-10 md:pb-14"><button type="button" onClick={() => setLbIdx(0)} className="block w-full group" data-testid="project-cover"><div className="bg-black flex items-center justify-center overflow-hidden"><img src={api.resolveImage(cover)} alt={galleryImageAlt({ title: project.title, location: project.location })} className="w-full max-h-[78vh] object-contain transition-opacity duration-300" /></div></button></div>}
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        <div className="border border-[#BF9972]/20 bg-black/20 p-6 md:p-8">
          <p className="text-white/75 text-base md:text-lg leading-relaxed"><span className="font-serif italic text-white">Quick answer:</span> {quickAnswer}</p>
          <div className="mt-7 pt-6 border-t border-white/8">
            <div className="eyebrow mb-4">On this page</div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm md:text-base">
              <li>• <TocLink href="#project-story">Project story</TocLink></li>
              <li>• <TocLink href="#project-at-a-glance">Project at a glance</TocLink></li>
              {linkedProducts.length > 0 && <li>• <TocLink href="#catalogue-piece">{productPresentation.tocLabel}</TocLink></li>}
              <li>• <TocLink href="#installed-views">Real photos from the site</TocLink></li>
              {(project.customisation || project.fixture_details) && <li>• <TocLink href="#project-details">Fixture & customisation details</TocLink></li>}
              <li>• <TocLink href="#manufacturer">Made in Firozabad since 1981</TocLink></li>
              <li>• <TocLink href="#project-enquiry">Planning a similar space?</TocLink></li>
              <li>• <TocLink href="#project-faq">Project FAQs</TocLink></li>
            </ul>
          </div>
        </div>
      </section>

      <section id="project-story" className="max-w-7xl mx-auto px-6 pb-14 md:pb-18 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 scroll-mt-28">
        <div className="lg:col-span-8">
          <div className="eyebrow mb-4">Project story</div>
          {project.note ? <p className="text-white/80 leading-relaxed text-lg md:text-xl whitespace-pre-line">{project.note}</p> : <p className="text-white/50 leading-relaxed">Project details will be added soon.</p>}

          {(project.fixture_details || project.customisation) && <div id="project-details" className="scroll-mt-28">
            {project.fixture_details && <div className="mt-10"><div className="eyebrow mb-3">Fixture details</div><p className="text-white/70 leading-relaxed">{project.fixture_details}</p></div>}
            {project.customisation && <div className="mt-10"><div className="eyebrow mb-3">Customisation</div><p className="text-white/70 leading-relaxed">{project.customisation}</p></div>}
          </div>}
        </div>
        <aside id="project-at-a-glance" className="lg:col-span-4 scroll-mt-28">
          <div className="border border-[#BF9972]/20 bg-black/20 p-6 md:p-7 lg:sticky lg:top-28">
            <div className="eyebrow mb-5">Project at a glance</div>
            <div className="space-y-4">
              <SnapshotItem label="Location" value={project.location} />
              {linkedProducts.length > 0 && <SnapshotItem label={productPresentation.snapshotLabel} value={productPresentation.snapshotValue} />}
              {hasExtendedSnapshot && optionalSnapshot.map(([label, value]) => <SnapshotItem key={label} label={label} value={value} />)}
            </div>
          </div>
        </aside>
      </section>

      <ProductStories products={linkedProducts} />

      {images.length > 0 && <section id="installed-views" className="border-t border-[#BF9972]/15 scroll-mt-28"><div className="max-w-7xl mx-auto px-6 py-14 md:py-18"><div className="eyebrow mb-3">Real photos from the site</div><h2 className="font-serif text-3xl md:text-5xl">Installed in the client space.</h2><p className="mt-3 text-white/60 max-w-2xl">These are project photographs from the actual installation, not stock-room renders.</p><div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">{images.map((img, i) => <button key={i} onClick={() => setLbIdx(i)} data-testid={`project-thumb-${i}`} className={`${i === 0 && images.length > 2 ? "md:col-span-2" : ""} min-h-[260px] md:min-h-[360px] overflow-hidden bg-black group flex items-center justify-center`}><img src={api.resolveImage(img)} alt={galleryImageAlt({ title: project.title, location: project.location, view: i + 1 })} loading={i === 0 ? "eager" : "lazy"} className="w-full h-full max-h-[75vh] object-contain transition-opacity duration-300" /></button>)}</div></div></section>}

      <section id="manufacturer" className="border-t border-[#BF9972]/15 scroll-mt-28">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-18">
          <div className="eyebrow mb-3">Made in Firozabad since 1981</div>
          <h2 className="font-serif text-3xl md:text-5xl leading-tight">A real installation, connected back to the maker.</h2>
          <p className="mt-5 text-white/70 text-base md:text-lg leading-relaxed max-w-3xl">Samrat Glass Emporium is a decorative-lighting manufacturer in Firozabad. Our project pages connect client installations to the actual catalogue pieces so buyers, designers and search engines can trace the installed fixture back to the Samrat product and its manufacturing source.</p>
          <Link to="/chandelier-manufacturer-india" className="mt-7 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#D4AF37] hover:text-[#B5952F]">Read our Firozabad manufacturing story <ArrowUpRight size={12} /></Link>
        </div>
      </section>

      {linkedProducts.length > 0 && <section className="border-t border-[#BF9972]/15" data-testid="project-linked-products"><div className="max-w-7xl mx-auto px-6 py-14 md:py-18"><div className="mb-8"><div className="eyebrow mb-3">Products in this project</div><h2 className="font-serif text-2xl md:text-4xl leading-tight">The exact catalogue pieces <span className="brand-gradient-text italic">used here.</span></h2><p className="mt-3 text-white/60 max-w-2xl text-sm md:text-base">Explore the linked {linkedProducts.length > 1 ? "products" : "product"}, then inquire about sizing, finish options or adapting the same {linkedProducts.length > 1 ? "pieces" : "piece"} for your space.</p></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">{linkedProducts.map((p) => {
        const img = api.resolveImage(p.images?.[0]);
        const waHref = waGalleryProductLink(settings?.whatsapp_number, p, project);
        const handleAdd = (e) => { e.preventDefault(); e.stopPropagation(); addToCart(p); toast.success(`${p.name} added to inquiry`); };
        const fp = formatProductPrice(p);
        return <div key={p.id} data-testid={`project-product-${p.id}`} className="group border border-white/8 hover:border-[#D4AF37]/50 bg-[#0e0510] transition-colors flex flex-col"><Link to={productPath(p)} className="block"><div className="aspect-[4/5] overflow-hidden bg-[#0e0510] flex items-center justify-center">{img ? <img src={img} alt={productImageAlt({ name: p.name, category: p.category, sku: p.sku })} loading="lazy" className="w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" /> : <span className="font-serif italic text-[#D4AF37]/15 text-8xl">S</span>}</div></Link><div className="p-5 flex flex-col flex-1"><div className="eyebrow truncate">{p.category} · {p.sku}</div><Link to={productPath(p)} className="font-serif text-lg leading-snug text-white group-hover:text-[#D4AF37] transition-colors line-clamp-2 mt-2 min-h-[3rem]">{p.name}</Link><div className="mt-3">{fp.onRequest ? <span className="text-[#D4AF37] font-serif text-base italic">Price on request</span> : <span className="text-[#D4AF37] font-serif text-lg">{fp.primary}</span>}</div><div className="mt-auto pt-4 grid grid-cols-2 gap-2"><button onClick={handleAdd} data-testid={`project-product-add-${p.id}`} className="inline-flex items-center justify-center gap-1 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 px-2 py-2.5 text-[10px] uppercase tracking-[0.16em]"><ShoppingBag size={11} /> Inquire</button>{waHref && <a href={waHref} target="_blank" rel="noreferrer" data-testid={`project-product-wa-${p.id}`} className="inline-flex items-center justify-center bg-[#D4AF37] text-black px-2 py-2.5 text-[10px] uppercase tracking-[0.16em] hover:bg-[#B5952F]">WhatsApp</a>}</div></div></div>;
      })}</div></div></section>}

      <section id="project-enquiry" className="border-t border-[#BF9972]/15 scroll-mt-28"><div className="max-w-7xl mx-auto px-6 py-14 md:py-16 text-center"><div className="eyebrow mb-3">Planning a similar space?</div><h2 className="font-serif text-3xl md:text-5xl">Bring us your room. <span className="brand-gradient-text italic">We’ll help with the light.</span></h2><p className="mt-4 text-white/60 max-w-2xl mx-auto">Share your ceiling height, room photographs and the Samrat piece you like. We can discuss finish and project requirements before quotation.</p><Link to="/contact" className="mt-7 inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 text-[10px] uppercase tracking-[0.22em] hover:bg-[#B5952F]">Discuss your project <ArrowUpRight size={12} /></Link></div></section>

      <section id="project-faq" className="border-t border-[#BF9972]/15 scroll-mt-28">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-18">
          <div className="eyebrow mb-3">Project FAQs</div>
          <h2 className="font-serif text-3xl md:text-5xl">Useful details before you enquire.</h2>
          <div className="mt-8 divide-y divide-white/8 border-y border-white/8">
            {faqItems.map((item) => <div key={item.q} className="py-5"><h3 className="font-serif text-xl md:text-2xl">{item.q}</h3><p className="mt-2 text-white/65 leading-relaxed">{item.a}</p></div>)}
          </div>
        </div>
      </section>

      {items.length > 1 && <section className="border-t border-[#BF9972]/15"><div className="max-w-7xl mx-auto px-6 py-10 md:py-12 grid grid-cols-1 md:grid-cols-2 gap-5"><Link to={`/gallery/${allSlugs[prevIdx]}`} data-testid="project-prev-link" className="group border border-white/8 hover:border-[#D4AF37]/50 p-6 transition-colors"><div className="text-[10px] uppercase tracking-[0.26em] text-white/40 flex items-center gap-2 mb-2"><ArrowLeft size={12} /> Previous project</div><div className="font-serif text-lg md:text-xl group-hover:text-[#D4AF37] transition-colors">{prevProject.title}</div></Link><Link to={`/gallery/${allSlugs[nextIdx]}`} data-testid="project-next-link" className="group border border-white/8 hover:border-[#D4AF37]/50 p-6 transition-colors text-right"><div className="text-[10px] uppercase tracking-[0.26em] text-white/40 flex items-center justify-end gap-2 mb-2">Next project <ArrowUpRight size={12} /></div><div className="font-serif text-lg md:text-xl group-hover:text-[#D4AF37] transition-colors">{nextProject.title}</div></Link></div></section>}

      <Lightbox open={lbIdx !== null} index={lbIdx ?? 0} images={images} project={project} onClose={() => setLbIdx(null)} onNav={(dir) => setLbIdx((i) => (i + dir + images.length) % images.length)} />
    </div>
  );
}
