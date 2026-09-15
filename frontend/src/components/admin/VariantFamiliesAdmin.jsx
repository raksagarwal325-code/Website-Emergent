import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import {
  getVariantFamilies,
  normalizeVariantSlug,
  suggestVariantFamilies,
  VARIANT_SPEC_AXES,
  variantAxes,
  withVariantFamilies,
} from "../../constants/variantFamilies";

const AXIS_OPTIONS = [
  ...VARIANT_SPEC_AXES.map(({ key, label }) => ({ key, label })),
  { key: "use", label: "Form / use" },
];

export default function VariantFamiliesAdmin() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [families, setFamilies] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pinnedIds, setPinnedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewingSuggestion, setReviewingSuggestion] = useState("");
  const [selectedAxes, setSelectedAxes] = useState(new Set());
  const suggestionsRef = useRef(null);
  const reviewPanelRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [items, currentSettings] = await Promise.all([
        api.listAllProducts({ include_drafts: 1, limit: 5000, raw: true }),
        api.adminGetSettings(),
      ]);
      const rows = getVariantFamilies(currentSettings);
      setProducts(items);
      setSettings(currentSettings);
      setFamilies(rows);
      setSelectedSlug((current) => current || rows[0]?.slug || "");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not load variant families");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const family = families.find((row) => row.slug === selectedSlug);
    if (!family) return;
    setName(family.name);
    setSelectedIds(new Set(family.product_ids));
    setPinnedIds(new Set(family.product_ids));
    const familyProducts = products.filter((product) => family.product_ids.includes(product.id));
    const detected = variantAxes(familyProducts).map((axis) => axis.key);
    setSelectedAxes(new Set(family.axes?.length ? family.axes : detected));
  }, [selectedSlug, families, products]);

  const suggestions = useMemo(() => suggestVariantFamilies(products, families), [products, families]);
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(), [products]);
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((product) => (!category || product.category === category) && (!q || `${product.name} ${product.sku}`.toLowerCase().includes(q)))
      .sort((a, b) => {
        const pinnedOrder = Number(pinnedIds.has(b.id)) - Number(pinnedIds.has(a.id));
        if (pinnedOrder) return pinnedOrder;
        const imageOrder = Number(Boolean(b.images?.[0])) - Number(Boolean(a.images?.[0]));
        if (imageOrder) return imageOrder;
        const statusOrder = Number(b.status === "published") - Number(a.status === "published");
        return statusOrder || String(a.sku || "").localeCompare(String(b.sku || ""));
      });
  }, [products, search, category, pinnedIds]);
  const selectedProducts = useMemo(() => products.filter((product) => selectedIds.has(product.id)), [products, selectedIds]);
  const axes = useMemo(() => variantAxes(selectedProducts), [selectedProducts]);

  const startNew = () => {
    setSelectedSlug("");
    setName("");
    setSelectedIds(new Set());
    setPinnedIds(new Set());
    setReviewingSuggestion("");
    setSelectedAxes(new Set());
  };
  const reviewSuggestion = (suggestion) => {
    setSelectedSlug("");
    setName(suggestion.name);
    const suggestionIds = new Set(suggestion.products.map((product) => product.id));
    setSelectedIds(suggestionIds);
    setPinnedIds(suggestionIds);
    setSearch("");
    setCategory("");
    setReviewingSuggestion(suggestion.slug);
    setSelectedAxes(new Set(variantAxes(suggestion.products).map((axis) => axis.key)));
    if (suggestionsRef.current) suggestionsRef.current.open = false;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      reviewPanelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }));
  };
  const toggle = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectVisibleProducts = () => setSelectedIds((current) => {
    const next = new Set(current);
    visibleProducts.forEach((product) => next.add(product.id));
    return next;
  });
  const clearVisibleProducts = () => setSelectedIds((current) => {
    const next = new Set(current);
    visibleProducts.forEach((product) => next.delete(product.id));
    return next;
  });
  const toggleAxis = (key) => setSelectedAxes((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const save = async () => {
    const cleanName = name.trim();
    const slug = normalizeVariantSlug(cleanName);
    if (!cleanName) return toast.error("Variant family name is required");
    if (selectedIds.size < 2) return toast.error("Select at least two exact products");
    if (selectedAxes.size < 1) return toast.error("Select at least one applicable difference");
    if (families.some((row) => row.slug === slug && row.slug !== selectedSlug)) return toast.error("A variant family with this name already exists");
    setSaving(true);
    try {
      // A product can belong to only one variant family. Collections remain independent.
      const next = families
        .filter((row) => row.slug !== selectedSlug && row.slug !== slug)
        .map((row) => ({ ...row, product_ids: row.product_ids.filter((id) => !selectedIds.has(id)) }))
        .filter((row) => row.product_ids.length >= 2);
      next.push({ slug, name: cleanName, product_ids: Array.from(selectedIds), axes: Array.from(selectedAxes) });
      next.sort((a, b) => a.name.localeCompare(b.name));
      const nextSettings = withVariantFamilies(settings, next);
      await api.updateSettings(nextSettings);
      setSettings(nextSettings);
      setFamilies(next);
      setSelectedSlug(slug);
      setReviewingSuggestion("");
      toast.success(`Variant family saved · ${selectedIds.size} products linked`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Variant family save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const family = families.find((row) => row.slug === selectedSlug);
    if (!family || !window.confirm(`Delete the ${family.name} variant family? Products will not be deleted.`)) return;
    setSaving(true);
    try {
      const next = families.filter((row) => row.slug !== selectedSlug);
      const nextSettings = withVariantFamilies(settings, next);
      await api.updateSettings(nextSettings);
      setSettings(nextSettings);
      setFamilies(next);
      setSelectedSlug(next[0]?.slug || "");
      if (!next.length) startNew();
      toast.success("Variant family deleted; catalogue products were unchanged");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Variant family deletion failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="border border-white/10 p-8 text-white/45">Loading variant families…</div>;

  return (
    <div data-testid="variant-families-admin" className="space-y-7">
      <div className="border border-[#D4AF37]/35 bg-[#D4AF37]/[0.03] p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl"><div className="eyebrow text-[#D4AF37] mb-2">Same design · exact alternatives</div><h2 className="font-serif text-3xl">Variant Families</h2><p className="text-sm text-white/55 mt-3 leading-relaxed">Link only products that are the same underlying design. Colour, finish, size, light count, mechanism and form can differ. Suggestions use existing names, but nothing appears publicly until you review and save it.</p></div>
          <button onClick={startNew} className="border border-[#D4AF37]/60 px-5 py-3 text-xs uppercase tracking-[0.2em] text-[#D4AF37]">New family</button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <details ref={suggestionsRef} className="border border-white/10 p-5" open={!families.length}>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.22em] text-[#D4AF37]"><Sparkles size={14} className="inline mr-2" />Name-based suggestions ({suggestions.length})</summary>
          <div className="mt-4 grid gap-3">
            {suggestions.slice(0, 50).map((suggestion) => <div key={suggestion.slug} className="border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3"><div><div className="font-serif text-lg">{suggestion.name}</div><div className="text-xs text-white/40 mt-1">{suggestion.products.length} possible variants · {suggestion.products.map((p) => p.sku).join(", ")}</div></div><button onClick={() => reviewSuggestion(suggestion)} className="border border-white/20 hover:border-[#D4AF37] px-4 py-2 text-[10px] uppercase tracking-[0.18em]">Review group</button></div>)}
          </div>
        </details>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        <aside className="lg:col-span-3 border border-white/10 p-5 space-y-3 h-fit">
          <div className="text-xs uppercase tracking-[0.22em] text-white/40">Approved families</div>
          {families.map((family) => <button key={family.slug} onClick={() => { setReviewingSuggestion(""); setSelectedSlug(family.slug); }} className={`w-full text-left border px-4 py-3 ${selectedSlug === family.slug ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/10 text-white/65"}`}><span className="block text-sm">{family.name}</span><span className="block text-[10px] mt-1 text-white/35">{family.product_ids.length} products</span></button>)}
          {!families.length && <div className="text-sm text-white/35">No approved variant families yet.</div>}
        </aside>

        <div className="lg:col-span-9 space-y-5">
          <div ref={reviewPanelRef} className="border border-white/10 p-5 scroll-mt-28">
            {reviewingSuggestion && <div className="mb-5 border border-[#D4AF37]/50 p-4 flex flex-wrap items-center justify-between gap-4"><div className="text-sm text-white/65"><strong className="block text-[#D4AF37] font-normal mb-1">Reviewing a private variant suggestion</strong>Confirm the products and select only the differences customers should be able to choose. Nothing becomes public until you approve it.</div><button disabled={saving || selectedIds.size < 2 || selectedAxes.size < 1} onClick={save} className="shrink-0 bg-[#D4AF37] text-black px-6 py-3 text-xs uppercase tracking-[0.18em] disabled:opacity-50">{saving ? "Saving…" : "Approve reviewed family"}</button></div>}
            <label className="block"><span className="text-xs uppercase tracking-[0.2em] text-white/50">Family name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Use the shared product/family name" className="mt-2 w-full bg-[#090909] border border-white/20 px-4 py-3" /></label>
            <div className="mt-4 text-sm text-white/55">{selectedIds.size} exact products selected</div>
            <div className="mt-4"><div className="text-[10px] uppercase tracking-[0.18em] text-white/45 mb-2">Select applicable differences</div><div className="flex flex-wrap gap-2">{AXIS_OPTIONS.map((axis) => { const active = selectedAxes.has(axis.key); const detected = axes.some((item) => item.key === axis.key); return <button key={axis.key} type="button" aria-pressed={active} onClick={() => toggleAxis(axis.key)} className={`border px-3 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors ${active ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/20 text-white/50 hover:border-[#D4AF37]/60"}`}>{active && <Check size={12} className="inline mr-1" />}Differs by {axis.label}{detected ? "" : " · verify"}</button>; })}</div><div className="text-[10px] text-white/35 mt-2">Suggested selections are based on saved product specifications. You can add or remove any option after checking the products.</div></div>
            {selectedProducts.length > 0 && <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">{selectedProducts.slice(0, 4).map((product) => <div key={product.id} className="min-w-0"><div className="aspect-square bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">{product.images?.[0] ? <img src={api.resolveImage(product.images[0])} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-contain" /> : <span className="text-[9px] uppercase tracking-wider text-white/25">No image</span>}</div><div className="text-[10px] text-[#D4AF37] truncate mt-2">{product.sku}</div><div className="text-[10px] text-white/45 truncate">{product.name}</div></div>)}</div>}
          </div>

          <div className="border border-white/10 p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-3.5 text-white/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or SKU" className="w-full bg-[#090909] border border-white/20 pl-10 pr-4 py-3" /></div><select value={category} onChange={(event) => setCategory(event.target.value)} className="bg-[#090909] border border-white/20 px-4 py-3"><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-3">
              <div className="text-xs text-white/45">{visibleProducts.length} products shown · selections stay in place</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={selectVisibleProducts} disabled={!visibleProducts.length || visibleProducts.every((product) => selectedIds.has(product.id))} className="border border-[#D4AF37]/50 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[#D4AF37] disabled:opacity-35">Select all shown ({visibleProducts.length})</button>
                <button type="button" onClick={clearVisibleProducts} disabled={!visibleProducts.some((product) => selectedIds.has(product.id))} className="border border-white/20 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-white/55 disabled:opacity-35">Clear shown</button>
              </div>
            </div>
            <div data-testid="variant-product-list" className="max-h-[60vh] overflow-auto divide-y divide-white/10">{visibleProducts.map((product) => { const selected = selectedIds.has(product.id); const image = product.images?.[0] ? api.resolveImage(product.images[0]) : ""; return <button key={product.id} type="button" aria-pressed={selected} data-testid={`variant-product-${product.sku}`} onClick={() => toggle(product.id)} className="w-full text-left py-3 grid grid-cols-[30px_56px_1fr] gap-3 items-center"><span className={`w-6 h-6 border flex items-center justify-center ${selected ? "bg-[#D4AF37] border-[#D4AF37] text-black" : "border-white/20"}`}>{selected && <Check size={14} />}</span><span className="w-14 h-14 bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">{image ? <img src={image} alt="" loading="lazy" decoding="async" className="w-full h-full object-contain" /> : <span className="text-[8px] uppercase tracking-wider text-white/25">No image</span>}</span><span className="min-w-0"><span className="block text-[10px] uppercase tracking-[0.15em] text-[#D4AF37]">{product.sku}</span><span className="block font-serif text-base truncate mt-1">{product.name}</span><span className="block text-[10px] uppercase tracking-[0.15em] text-white/40">{product.category} · {product.status === "published" ? "Published" : "Draft / Needs review"}</span></span></button>; })}</div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5"><div className="text-xs text-white/40">Saving links products only; it never merges, renames or deletes them.</div><div className="flex gap-3">{selectedSlug && <button disabled={saving} onClick={remove} className="border border-red-400/40 text-red-300 px-5 py-3 text-xs uppercase tracking-[0.18em]"><Trash2 size={14} className="inline mr-2" />Delete family</button>}<button disabled={saving || selectedIds.size < 2 || selectedAxes.size < 1} onClick={save} className="bg-[#D4AF37] text-black px-7 py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-50">{saving ? "Saving…" : reviewingSuggestion ? "Approve reviewed family" : "Save family"}</button></div></div>
        </div>
      </div>
    </div>
  );
}
