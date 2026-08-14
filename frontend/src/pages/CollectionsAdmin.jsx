import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import {
  LEGACY_COLLECTIONS,
  collectionFeaturedTag,
  collectionLabelTag,
  collectionMembershipTag,
  getCollectionFromProducts,
  getExplicitCollectionSlugs,
  isCollectionControlTag,
  normalizeCollectionSlug,
  titleCaseCollectionSlug,
} from "../constants/collections";

const CATEGORY_ORDER = [
  "Chandelier", "Floor Chandelier", "Table Chandelier", "Hanging Light",
  "Wall Light", "Floor Lamp", "Table Lamp", "Candle Stand",
];

function getInitialSlugs(products) {
  return Array.from(new Set([
    ...Object.keys(LEGACY_COLLECTIONS),
    ...getExplicitCollectionSlugs(products),
  ])).sort();
}

export default function CollectionsAdmin() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState("gulzar");
  const [label, setLabel] = useState("Gulzar");
  const [draftSlug, setDraftSlug] = useState("gulzar");
  const [selectedSkus, setSelectedSkus] = useState(new Set());
  const [featuredSkus, setFeaturedSkus] = useState(new Set());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const items = await api.listAllProducts({ include_drafts: 1, limit: 5000 });
      setProducts(items);
    } catch {
      toast.error("Could not load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const slugs = useMemo(() => getInitialSlugs(products), [products]);

  useEffect(() => {
    if (!selectedSlug || products.length === 0) return;
    const collection = getCollectionFromProducts(products, selectedSlug);
    setDraftSlug(selectedSlug);
    setLabel(collection?.name || titleCaseCollectionSlug(selectedSlug));
    setSelectedSkus(new Set(collection?.memberSkus || []));
    setFeaturedSkus(new Set(collection?.featuredSkus || []));
  }, [selectedSlug, products]);

  const categories = useMemo(() => {
    const found = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return found.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a); const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.localeCompare(b);
    });
  }, [products]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return (p.sku || "").toLowerCase().includes(q) || (p.name || "").toLowerCase().includes(q);
    });
  }, [products, search, category]);

  const toggleSku = (sku) => {
    setSelectedSkus((current) => {
      const next = new Set(current);
      if (next.has(sku)) next.delete(sku); else next.add(sku);
      return next;
    });
  };

  const toggleFeatured = (sku) => {
    setFeaturedSkus((current) => {
      const next = new Set(current);
      if (next.has(sku)) next.delete(sku); else next.add(sku);
      return next;
    });
  };

  const startNew = () => {
    const name = window.prompt("Collection name, e.g. Rajdarbar");
    if (!name) return;
    const slug = normalizeCollectionSlug(name);
    if (!slug) return;
    setSelectedSlug(slug);
    setDraftSlug(slug);
    setLabel(name.trim());
    setSelectedSkus(new Set());
    setFeaturedSkus(new Set());
  };

  const save = async () => {
    const slug = normalizeCollectionSlug(draftSlug);
    if (!slug || !label.trim()) {
      toast.error("Collection name and slug are required");
      return;
    }
    if (selectedSkus.size === 0) {
      toast.error("Select at least one product");
      return;
    }
    setSaving(true);
    try {
      const previousSlug = normalizeCollectionSlug(selectedSlug || slug);
      const changed = [];
      for (const product of products) {
        const originalTags = Array.isArray(product.tags) ? product.tags : [];
        const belongs = selectedSkus.has(product.sku);
        const cleaned = originalTags.filter((tag) => {
          if (!isCollectionControlTag(tag)) return true;
          return !(
            tag === collectionMembershipTag(previousSlug) ||
            tag.startsWith(`collection-label:${previousSlug}:`) ||
            tag.startsWith(`collection-display:${previousSlug}:`) ||
            tag === collectionFeaturedTag(previousSlug)
          );
        });
        const nextTags = [...cleaned];
        if (belongs) {
          nextTags.push(collectionMembershipTag(slug));
          nextTags.push(collectionLabelTag(slug, label.trim()));
          if (featuredSkus.has(product.sku)) nextTags.push(collectionFeaturedTag(slug));
        }
        if (JSON.stringify(originalTags) !== JSON.stringify(nextTags)) {
          changed.push(api.updateProduct(product.id, { ...product, tags: nextTags }));
        }
      }
      await Promise.all(changed);
      toast.success(`Collection saved · ${selectedSkus.size} products · ${changed.length} records updated`);
      setSelectedSlug(slug);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Collection save failed");
    } finally {
      setSaving(false);
    }
  };

  const selectedByCategory = useMemo(() => {
    const map = {};
    products.filter((p) => selectedSkus.has(p.sku)).forEach((p) => {
      const cat = p.category || "Other";
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [products, selectedSkus]);

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-16 text-white/50">Loading Collection Manager…</div>;

  return (
    <div data-testid="collections-admin" className="max-w-7xl mx-auto px-6 py-12 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/50 hover:text-white mb-5">
            <ArrowLeft size={14} /> Admin dashboard
          </Link>
          <div className="eyebrow mb-3">Catalogue merchandising</div>
          <h1 className="font-serif text-4xl">Collection Manager</h1>
          <p className="text-white/50 text-sm mt-3 max-w-2xl">Assign products to coordinated families without changing code. Product cards always use the product's actual catalogue name.</p>
        </div>
        <button onClick={startNew} className="border border-[#D4AF37]/60 text-[#D4AF37] px-5 py-3 text-xs uppercase tracking-[0.22em] hover:bg-[#D4AF37] hover:text-black">New collection</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 border border-white/10 p-5 space-y-3 h-fit">
          <div className="text-xs uppercase tracking-[0.24em] text-white/40 mb-4">Collections</div>
          {slugs.map((slug) => (
            <button key={slug} onClick={() => setSelectedSlug(slug)} className={`w-full text-left px-4 py-3 border text-sm ${selectedSlug === slug ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/10 text-white/70"}`}>
              {getCollectionFromProducts(products, slug)?.name || titleCaseCollectionSlug(slug)}
            </button>
          ))}
        </aside>

        <div className="lg:col-span-9 space-y-6">
          <div className="border border-white/10 p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="space-y-2"><span className="text-xs uppercase tracking-[0.2em] text-white/50">Collection name</span><input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full bg-transparent border border-white/20 px-4 py-3" /></label>
            <label className="space-y-2"><span className="text-xs uppercase tracking-[0.2em] text-white/50">Slug</span><input value={draftSlug} onChange={(e) => setDraftSlug(normalizeCollectionSlug(e.target.value))} className="w-full bg-transparent border border-white/20 px-4 py-3" /></label>
            <div className="md:col-span-2 flex flex-wrap gap-3 text-xs text-white/55">
              <span>{selectedSkus.size} products selected</span>
              {Object.entries(selectedByCategory).map(([cat, count]) => <span key={cat} className="border border-white/10 px-3 py-1">{cat}: {count}</span>)}
            </div>
          </div>

          <div className="border border-white/10 p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1"><Search size={15} className="absolute left-3 top-3.5 text-white/40" /><input placeholder="Search SKU or product name" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent border border-white/20 pl-10 pr-4 py-3" /></div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-[#12080c] border border-white/20 px-4 py-3"><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
            </div>

            <div className="max-h-[65vh] overflow-auto divide-y divide-white/10">
              {visibleProducts.map((product) => {
                const selected = selectedSkus.has(product.sku);
                return (
                  <div key={product.id} className="py-4 grid grid-cols-[36px_1fr] md:grid-cols-[36px_1fr_110px] gap-3 items-center">
                    <button onClick={() => toggleSku(product.sku)} className={`w-7 h-7 border flex items-center justify-center ${selected ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/20"}`}>{selected ? <Check size={15} /> : null}</button>
                    <div className="min-w-0"><div className="font-serif text-lg truncate">{product.name}</div><div className="text-[10px] uppercase tracking-[0.18em] text-white/40">{product.sku} · {product.category}</div></div>
                    {selected ? <button title="Prefer in 5-card preview" onClick={() => toggleFeatured(product.sku)} className={`inline-flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.14em] ${featuredSkus.has(product.sku) ? "text-[#D4AF37]" : "text-white/35"}`}><Star size={14} fill={featuredSkus.has(product.sku) ? "currentColor" : "none"} /> Featured</button> : <div />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div className="text-xs text-white/40">Names come directly from Products. Collection Manager controls membership and featured preview only.</div>
            <button disabled={saving} onClick={save} className="bg-[#D4AF37] text-black px-7 py-3 uppercase text-xs tracking-[0.22em] disabled:opacity-50">{saving ? "Saving…" : "Save collection"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
