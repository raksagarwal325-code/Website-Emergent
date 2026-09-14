import React, { useEffect, useState } from "react";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { api } from "../lib/api";

export default function CollectionsIndex() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api.getCollectionsIndex()
      .then((items) => { if (active) setCollections(items || []); })
      .catch(() => { if (active) setCollections([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <div data-testid="collections-index" className="max-w-7xl mx-auto px-6 py-16 md:py-20">
    <SEO title="Design Collections · Samrat Glass Emporium" description="Explore coordinated design collections from Samrat Glass Emporium across chandeliers, floor chandeliers, table lamps and more." path="/collections" />
    <header className="max-w-4xl mb-12 md:mb-16"><div className="eyebrow text-[#D4AF37] mb-4">Coordinated lighting series</div><h1 className="font-serif text-5xl md:text-7xl leading-[0.95]">Design Collections</h1><p className="text-white/55 mt-6 max-w-2xl text-base md:text-lg leading-relaxed">Explore coordinated lighting collections united by shared forms, finishes and glass colours across chandeliers, lamps and decorative pieces.</p></header>
    {loading ? <div className="py-20 text-white/40">Loading collections…</div> : collections.length === 0 ? <div className="border border-white/10 p-10 text-white/50">Collections are being prepared.</div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">{collections.map((collection) => { const image = collection.cover_image ? api.resolveImage(collection.cover_image) : ""; return <Link key={collection.slug} to={`/collection/${collection.slug}`} data-testid={`collection-card-${collection.slug}`} className="group border border-white/10 bg-white/[0.02] hover:border-[#D4AF37]/50 transition-colors overflow-hidden"><div className="aspect-[16/9] bg-black/40 overflow-hidden flex items-center justify-center">{image ? <img src={image} alt={`${collection.name} collection · ${collection.cover_sku}`} className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500" /> : <Layers3 size={36} className="text-white/20" strokeWidth={1} />}</div><div className="p-6 md:p-8"><div className="flex items-start justify-between gap-6"><div><div className="eyebrow text-[#D4AF37] mb-3">{collection.category_count} {collection.category_count === 1 ? "category" : "categories"}</div><h2 className="font-serif text-3xl md:text-4xl">{collection.name}</h2></div><ArrowUpRight size={18} className="text-[#D4AF37] shrink-0 mt-1" /></div><p className="text-white/50 text-sm leading-relaxed mt-4">{collection.description}</p><div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.24em] text-white/35"><span>{collection.piece_count} {collection.piece_count === 1 ? "piece" : "pieces"}</span>{collection.cover_sku && <span>Cover · {collection.cover_sku}</span>}</div></div></Link>; })}</div>}
  </div>;
}
