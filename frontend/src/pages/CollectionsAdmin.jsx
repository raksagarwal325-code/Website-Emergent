import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import {
  LEGACY_COLLECTIONS,
  collectionFeaturedTag,
  collectionLabelTag,
  collectionMembershipTag,
  getCollectionFromProducts,
  isCollectionControlTag,
  normalizeCollectionSlug,
  titleCaseCollectionSlug,
} from "../constants/collections";
import {
  COLLECTIONS_REGISTRY_VERSION,
  COLLECTIONS_REGISTRY_VERSION_KEY,
  getRegisteredCollections,
  normalizeCollectionRegistry,
  withRegisteredCollections,
} from "../constants/collectionsRegistry";
import { suggestCollections } from "../constants/collectionSuggestions";
import VariantFamiliesAdmin from "../components/admin/VariantFamiliesAdmin";

const CATEGORY_ORDER = [
  "Chandelier", "Floor Chandelier", "Table Chandelier", "Hanging Light",
  "Wall Light", "Floor Lamp", "Table Lamp", "Candle Stand",
];

const uniqueRegistry = (items = []) => Array.from(new Map(items.map((item) => [item.slug, item])).values());

export default function CollectionsAdmin() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [label, setLabel] = useState("");
  const [draftSlug, setDraftSlug] = useState("");
  const [selectedSkus, setSelectedSkus] = useState(new Set());
  const [featuredSkus, setFeaturedSkus] = useState(new Set());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [managerMode, setManagerMode] = useState("collections");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [reviewingSuggestion, setReviewingSuggestion] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [items, currentSettings] = await Promise.all([
        // Collection membership lives in internal product tags. Admin must use
        // the raw records; the public product sanitizer intentionally removes
        // those tags.
        api.listAllProducts({ include_drafts: 1, limit: 5000, raw: true }),
        api.adminGetSettings(),
      ]);
      const homepage = currentSettings?.homepage_content || {};
      const raw = homepage.collections;
      let registry = getRegisteredCollections(currentSettings) || [];
      let effectiveSettings = currentSettings;

      // v2 repairs the earlier migration that made every historical tag live.
      // Tags are preserved and appear below as private suggestions instead.
      if (!Array.isArray(raw)) {
        registry = Object.values(LEGACY_COLLECTIONS).map(({ slug, name }) => ({ slug, name }));
      }
      const registryVersion = Number(homepage[COLLECTIONS_REGISTRY_VERSION_KEY] || 0);
      if (registryVersion < COLLECTIONS_REGISTRY_VERSION) {
        const previousCount = normalizeCollectionRegistry(raw).length;
        effectiveSettings = withRegisteredCollections(currentSettings, registry);
        await api.updateSettings(effectiveSettings);
        const returnedToReview = Math.max(0, previousCount - registry.length);
        toast.success(returnedToReview
          ? `${returnedToReview} unverified collections returned to private suggestions`
          : "Collection review safeguards enabled");
      }

      setProducts(items);
      setSettings(effectiveSettings);
      setCollections(registry);
      setSelectedSlug((current) => current || registry[0]?.slug || "");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not load collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedSlug || products.length === 0) {
      if (!selectedSlug && !reviewingSuggestion) {
        setLabel("");
        setDraftSlug("");
        setSelectedSkus(new Set());
        setFeaturedSkus(new Set());
      }
      return;
    }
    const collection = getCollectionFromProducts(products, selectedSlug, collections);
    const registered = collections.find((item) => item.slug === selectedSlug);
    setDraftSlug(selectedSlug);
    setLabel(registered?.name || collection?.name || titleCaseCollectionSlug(selectedSlug));
    setSelectedSkus(new Set(collection?.memberSkus || []));
    setFeaturedSkus(new Set(collection?.featuredSkus || []));
  }, [selectedSlug, products, collections, reviewingSuggestion]);

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
    }).sort((a, b) => {
      const selectedOrder = Number(selectedSkus.has(b.sku)) - Number(selectedSkus.has(a.sku));
      if (selectedOrder) return selectedOrder;
      const imageOrder = Number(Boolean(b.images?.[0])) - Number(Boolean(a.images?.[0]));
      if (imageOrder) return imageOrder;
      const statusOrder = Number(b.status === "published") - Number(a.status === "published");
      return statusOrder || String(a.sku || "").localeCompare(String(b.sku || ""));
    });
  }, [products, search, category, selectedSkus]);

  const suggestions = useMemo(
    () => suggestCollections(products, collections),
    [products, collections],
  );

  const toggleSku = (sku) => setSelectedSkus((current) => {
    const next = new Set(current);
    if (next.has(sku)) next.delete(sku); else next.add(sku);
    return next;
  });

  const toggleFeatured = (sku) => setFeaturedSkus((current) => {
    const next = new Set(current);
    if (next.has(sku)) next.delete(sku); else next.add(sku);
    return next;
  });

  const startNew = () => {
    setSelectedSlug("");
    setDraftSlug("");
    setLabel("");
    setSelectedSkus(new Set());
    setFeaturedSkus(new Set());
    setReviewingSuggestion("");
  };

  const reviewSuggestion = (suggestion) => {
    setSelectedSlug("");
    setLabel(suggestion.name);
    setDraftSlug(suggestion.slug);
    setSelectedSkus(new Set(suggestion.products.map((product) => product.sku)));
    setFeaturedSkus(new Set(suggestion.products.slice(0, 5).map((product) => product.sku)));
    setReviewingSuggestion(suggestion.slug);
    setSearch("");
    setCategory("");
    setShowSuggestions(false);
  };

  const save = async () => {
    const slug = normalizeCollectionSlug(draftSlug || label);
    const name = label.trim();
    if (!slug || !name) return toast.error("Collection name is required");
    if (collections.some((item) => item.slug === slug && item.slug !== selectedSlug)) {
      return toast.error("A collection with this slug already exists");
    }
    setSaving(true);
    try {
      const previousSlug = normalizeCollectionSlug(selectedSlug);
      const nextCollections = uniqueRegistry([
        ...collections.filter((item) => item.slug !== previousSlug && item.slug !== slug),
        { slug, name },
      ]).sort((a, b) => a.name.localeCompare(b.name));

      for (const product of products) {
        const originalTags = Array.isArray(product.tags) ? product.tags : [];
        const belongs = selectedSkus.has(product.sku);
        const cleaned = originalTags.filter((tag) => {
          if (!isCollectionControlTag(tag)) return true;
          return !(
            (previousSlug && tag === collectionMembershipTag(previousSlug)) ||
            (previousSlug && tag.startsWith(`collection-label:${previousSlug}:`)) ||
            (previousSlug && tag.startsWith(`collection-display:${previousSlug}:`)) ||
            (previousSlug && tag === collectionFeaturedTag(previousSlug)) ||
            (!previousSlug && tag === collectionMembershipTag(slug)) ||
            (!previousSlug && tag.startsWith(`collection-label:${slug}:`)) ||
            (!previousSlug && tag === collectionFeaturedTag(slug))
          );
        });
        const nextTags = [...cleaned];
        if (belongs) {
          nextTags.push(collectionMembershipTag(slug));
          nextTags.push(collectionLabelTag(slug, name));
          if (featuredSkus.has(product.sku)) nextTags.push(collectionFeaturedTag(slug));
        }
        if (JSON.stringify(originalTags) !== JSON.stringify(nextTags)) {
          await api.updateProduct(product.id, { ...product, tags: nextTags });
        }
      }

      const nextSettings = withRegisteredCollections(settings, nextCollections);
      await api.updateSettings(nextSettings);
      toast.success(`Collection saved · ${selectedSkus.size} products selected`);
      setSettings(nextSettings);
      setCollections(nextCollections);
      setSelectedSlug(slug);
      setReviewingSuggestion("");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Collection save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteCollection = async () => {
    if (!selectedSlug) return;
    const current = collections.find((item) => item.slug === selectedSlug);
    if (!window.confirm(`Delete the ${current?.name || selectedSlug} collection? Products will not be deleted.`)) return;
    setSaving(true);
    try {
      for (const product of products) {
        const originalTags = Array.isArray(product.tags) ? product.tags : [];
        const nextTags = originalTags.filter((tag) => !(
          tag === collectionMembershipTag(selectedSlug) ||
          tag.startsWith(`collection-label:${selectedSlug}:`) ||
          tag.startsWith(`collection-display:${selectedSlug}:`) ||
          tag === collectionFeaturedTag(selectedSlug)
        ));
        if (JSON.stringify(originalTags) !== JSON.stringify(nextTags)) {
          await api.updateProduct(product.id, { ...product, tags: nextTags });
        }
      }
      const nextCollections = collections.filter((item) => item.slug !== selectedSlug);
      const nextSettings = withRegisteredCollections(settings, nextCollections);
      await api.updateSettings(nextSettings);
      toast.success(`${current?.name || "Collection"} deleted`);
      setSettings(nextSettings);
      setCollections(nextCollections);
      setSelectedSlug(nextCollections[0]?.slug || "");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Collection deletion failed");
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

  if (managerMode === "variants") return (
    <div data-testid="collections-admin" className="max-w-7xl mx-auto px-6 py-12 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><Link to="/admin" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/50 hover:text-white mb-5"><ArrowLeft size={14} /> Admin dashboard</Link><div className="eyebrow mb-3">Catalogue merchandising</div><h1 className="font-serif text-4xl">Collection Manager</h1></div></div>
      <div className="flex gap-3 border-b border-white/10"><button onClick={() => setManagerMode("collections")} className="px-5 py-3 text-xs uppercase tracking-[0.2em] text-white/50">Design collections</button><button className="px-5 py-3 text-xs uppercase tracking-[0.2em] text-[#D4AF37] border-b border-[#D4AF37]">Variant families</button></div>
      <VariantFamiliesAdmin />
    </div>
  );

  return (
    <div data-testid="collections-admin" className="max-w-7xl mx-auto px-6 py-12 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/50 hover:text-white mb-5"><ArrowLeft size={14} /> Admin dashboard</Link>
          <div className="eyebrow mb-3">Catalogue merchandising</div>
          <h1 className="font-serif text-4xl">Collection Manager</h1>
          <p className="text-white/50 text-sm mt-3 max-w-2xl">Create and manage design collections without changing code. Product cards always use the product's actual catalogue name.</p>
        </div>
        <div className="flex gap-3"><button onClick={() => setManagerMode("variants")} className="border border-white/20 text-white/70 px-5 py-3 text-xs uppercase tracking-[0.18em] hover:border-[#D4AF37]">Variant families</button><button onClick={startNew} className="border border-[#D4AF37]/60 text-[#D4AF37] px-5 py-3 text-xs uppercase tracking-[0.22em] hover:bg-[#D4AF37] hover:text-black">New collection</button></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 border border-white/10 p-5 space-y-3 h-fit">
          <div className="text-xs uppercase tracking-[0.24em] text-white/40 mb-4">Collections</div>
          {collections.map((item) => (
            <button key={item.slug} onClick={() => { setReviewingSuggestion(""); setSelectedSlug(item.slug); }} className={`w-full text-left px-4 py-3 border text-sm ${selectedSlug === item.slug ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/10 text-white/70"}`}>{item.name}</button>
          ))}
          {collections.length === 0 && <div className="text-sm text-white/35">No collections yet.</div>}
        </aside>

        <div className="lg:col-span-9 space-y-6">
          <section className="border border-[#D4AF37]/35 bg-[#D4AF37]/[0.03]" data-testid="suggested-collections">
            <button onClick={() => setShowSuggestions((current) => !current)} className="w-full p-5 flex items-center justify-between gap-4 text-left">
              <span><span className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#D4AF37]"><Sparkles size={15} />Suggested collections</span><span className="block text-sm text-white/50 mt-2">{suggestions.length} likely groups found. Suggestions remain private until you review and approve them.</span></span>
              <ChevronDown size={18} className={`shrink-0 transition-transform ${showSuggestions ? "rotate-180" : ""}`} />
            </button>
            {showSuggestions && <div className="border-t border-white/10 p-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
              {suggestions.map((suggestion) => <article key={suggestion.slug} data-testid={`collection-suggestion-${suggestion.slug}`} className="border border-white/10 p-4 space-y-4">
                <div className="flex items-start justify-between gap-3"><div><div className="font-serif text-xl">{suggestion.name}</div><div className="text-[10px] uppercase tracking-[0.16em] text-white/40 mt-1">{suggestion.products.length} products · Not live</div></div><button onClick={() => reviewSuggestion(suggestion)} className="border border-[#D4AF37]/60 text-[#D4AF37] px-3 py-2 text-[10px] uppercase tracking-[0.16em] hover:bg-[#D4AF37] hover:text-black">Review</button></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{suggestion.products.slice(0, 4).map((product) => <div key={product.id} className="min-w-0"><div className="aspect-square bg-black/40 border border-white/10 overflow-hidden"><img src={api.resolveImage(product.images[0])} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-contain" /></div><div className="text-[10px] text-[#D4AF37] truncate mt-2">{product.sku}</div><div className="text-[10px] text-white/45 truncate">{product.name}</div><div className="text-[9px] text-white/30 truncate">{product.category}</div></div>)}</div>
              </article>)}
              {suggestions.length === 0 && <div className="xl:col-span-2 text-sm text-white/45 py-3">No safe suggestions found. Only repeated names among published products with images are suggested.</div>}
            </div>}
          </section>

          {reviewingSuggestion && <div className="border border-[#D4AF37]/50 px-5 py-4 text-sm text-white/65"><strong className="text-[#D4AF37] font-normal">Reviewing a private suggestion.</strong> Check the images, SKUs and selected products below. It will become visible to customers only after you approve it.</div>}
          <div className="border border-white/10 p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="space-y-2"><span className="text-xs uppercase tracking-[0.2em] text-white/50">Collection name</span><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Rajsri" className="w-full bg-transparent border border-white/20 px-4 py-3" /></label>
            <label className="space-y-2"><span className="text-xs uppercase tracking-[0.2em] text-white/50">Slug</span><input value={draftSlug} onChange={(e) => setDraftSlug(normalizeCollectionSlug(e.target.value))} placeholder="e.g. rajsri" className="w-full bg-transparent border border-white/20 px-4 py-3" /></label>
            <div className="md:col-span-2 flex flex-wrap gap-3 text-xs text-white/55"><span>{selectedSkus.size} products selected</span>{Object.entries(selectedByCategory).map(([cat, count]) => <span key={cat} className="border border-white/10 px-3 py-1">{cat}: {count}</span>)}</div>
          </div>

          <div className="border border-white/10 p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1"><Search size={15} className="absolute left-3 top-3.5 text-white/40" /><input placeholder="Search SKU or product name" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent border border-white/20 pl-10 pr-4 py-3" /></div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-[#12080c] border border-white/20 px-4 py-3"><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <div className="max-h-[65vh] overflow-auto divide-y divide-white/10">
              {visibleProducts.map((product) => {
                const selected = selectedSkus.has(product.sku);
                const image = product.images?.[0] ? api.resolveImage(product.images[0]) : "";
                return <div key={product.id} data-testid={`collection-product-${product.sku}`} className="py-4 grid grid-cols-[36px_64px_1fr] md:grid-cols-[36px_72px_1fr_110px] gap-3 items-center"><button aria-label={`${selected ? "Remove" : "Add"} ${product.sku}`} onClick={() => toggleSku(product.sku)} className={`w-7 h-7 border flex items-center justify-center ${selected ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/20"}`}>{selected ? <Check size={15} /> : null}</button><div className="h-16 md:h-[72px] bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">{image ? <img src={image} alt="" className="w-full h-full object-contain" /> : <span className="text-[9px] uppercase tracking-wider text-white/25">No image</span>}</div><div className="min-w-0"><div className="text-xs uppercase tracking-[0.18em] text-[#D4AF37] font-medium">{product.sku}</div><div className="font-serif text-lg truncate mt-1">{product.name}</div><div className="text-[10px] uppercase tracking-[0.16em] text-white/40 mt-1">{product.category} · {product.status === "published" ? "Published" : "Draft / Needs review"}</div></div>{selected ? <button title="Prefer in 5-card preview" onClick={() => toggleFeatured(product.sku)} className={`col-start-3 md:col-start-auto inline-flex items-center justify-start md:justify-center gap-1 text-[10px] uppercase tracking-[0.14em] ${featuredSkus.has(product.sku) ? "text-[#D4AF37]" : "text-white/35"}`}><Star size={14} fill={featuredSkus.has(product.sku) ? "currentColor" : "none"} /> Featured</button> : <div />}</div>;
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div className="text-xs text-white/40">Collection existence is controlled here. Membership uses existing product tags; deleting a collection never deletes products.</div>
            <div className="flex gap-3">
              {selectedSlug && <button disabled={saving} onClick={deleteCollection} className="border border-red-400/40 text-red-300 px-5 py-3 uppercase text-xs tracking-[0.18em] disabled:opacity-50"><Trash2 size={14} className="inline mr-2" />Delete collection</button>}
              <button disabled={saving} onClick={save} className="bg-[#D4AF37] text-black px-7 py-3 uppercase text-xs tracking-[0.22em] disabled:opacity-50">{saving ? "Saving…" : reviewingSuggestion ? "Approve & publish collection" : selectedSlug ? "Save collection" : "Create collection"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
