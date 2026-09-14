import React, { useEffect, useMemo, useState } from "react";
import { Check, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import {
  getVariantFamilies,
  normalizeVariantSlug,
  suggestVariantFamilies,
  variantAxes,
  withVariantFamilies,
} from "../../constants/variantFamilies";

export default function VariantFamiliesAdmin() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [families, setFamilies] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  }, [selectedSlug, families]);

  const suggestions = useMemo(() => suggestVariantFamilies(products, families), [products, families]);
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(), [products]);
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => (!category || product.category === category) && (!q || `${product.name} ${product.sku}`.toLowerCase().includes(q)));
  }, [products, search, category]);
  const selectedProducts = useMemo(() => products.filter((product) => selectedIds.has(product.id)), [products, selectedIds]);
  const axes = useMemo(() => variantAxes(selectedProducts), [selectedProducts]);

  const startNew = () => {
    setSelectedSlug("");
    setName("");
    setSelectedIds(new Set());
  };
  const reviewSuggestion = (suggestion) => {
    setSelectedSlug("");
    setName(suggestion.name);
    setSelectedIds(new Set(suggestion.products.map((product) => product.id)));
    setSearch("");
    setCategory("");
  };
  const toggle = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    const cleanName = name.trim();
    const slug = normalizeVariantSlug(cleanName);
    if (!cleanName) return toast.error("Variant family name is required");
    if (selectedIds.size < 2) return toast.error("Select at least two exact products");
    if (families.some((row) => row.slug === slug && row.slug !== selectedSlug)) return toast.error("A variant family with this name already exists");
    setSaving(true);
    try {
      // A product can belong to only one variant family. Collections remain independent.
      const next = families
        .filter((row) => row.slug !== selectedSlug && row.slug !== slug)
        .map((row) => ({ ...row, product_ids: row.product_ids.filter((id) => !selectedIds.has(id)) }))
        .filter((row) => row.product_ids.length >= 2);
      next.push({ slug, name: cleanName, product_ids: Array.from(selectedIds) });
      next.sort((a, b) => a.name.localeCompare(b.name));
      const nextSettings = withVariantFamilies(settings, next);
      await api.updateSettings(nextSettings);
      setSettings(nextSettings);
      setFamilies(next);
      setSelectedSlug(slug);
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
        <details className="border border-white/10 p-5" open={!families.length}>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.22em] text-[#D4AF37]"><Sparkles size={14} className="inline mr-2" />Name-based suggestions ({suggestions.length})</summary>
          <div className="mt-4 grid gap-3">
            {suggestions.slice(0, 50).map((suggestion) => <div key={suggestion.slug} className="border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3"><div><div className="font-serif text-lg">{suggestion.name}</div><div className="text-xs text-white/40 mt-1">{suggestion.products.length} possible variants · {suggestion.products.map((p) => p.sku).join(", ")}</div></div><button onClick={() => reviewSuggestion(suggestion)} className="border border-white/20 hover:border-[#D4AF37] px-4 py-2 text-[10px] uppercase tracking-[0.18em]">Review group</button></div>)}
          </div>
        </details>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        <aside className="lg:col-span-3 border border-white/10 p-5 space-y-3 h-fit">
          <div className="text-xs uppercase tracking-[0.22em] text-white/40">Approved families</div>
          {families.map((family) => <button key={family.slug} onClick={() => setSelectedSlug(family.slug)} className={`w-full text-left border px-4 py-3 ${selectedSlug === family.slug ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/10 text-white/65"}`}><span className="block text-sm">{family.name}</span><span className="block text-[10px] mt-1 text-white/35">{family.product_ids.length} products</span></button>)}
          {!families.length && <div className="text-sm text-white/35">No approved variant families yet.</div>}
        </aside>

        <div className="lg:col-span-9 space-y-5">
          <div className="border border-white/10 p-5">
            <label className="block"><span className="text-xs uppercase tracking-[0.2em] text-white/50">Family name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Use the shared product/family name" className="mt-2 w-full bg-[#090909] border border-white/20 px-4 py-3" /></label>
            <div className="mt-4 text-sm text-white/55">{selectedIds.size} exact products selected</div>
            {axes.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{axes.map((axis) => <span key={axis.key} className="border border-[#D4AF37]/30 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-[#D4AF37]">Differs by {axis.label}</span>)}</div>}
          </div>

          <div className="border border-white/10 p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-3.5 text-white/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or SKU" className="w-full bg-[#090909] border border-white/20 pl-10 pr-4 py-3" /></div><select value={category} onChange={(event) => setCategory(event.target.value)} className="bg-[#090909] border border-white/20 px-4 py-3"><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="max-h-[60vh] overflow-auto divide-y divide-white/10">{visibleProducts.map((product) => { const selected = selectedIds.has(product.id); return <button key={product.id} onClick={() => toggle(product.id)} className="w-full text-left py-3 grid grid-cols-[30px_1fr] gap-3 items-center"><span className={`w-6 h-6 border flex items-center justify-center ${selected ? "bg-[#D4AF37] border-[#D4AF37] text-black" : "border-white/20"}`}>{selected && <Check size={14} />}</span><span><span className="block font-serif text-base">{product.name}</span><span className="block text-[10px] uppercase tracking-[0.15em] text-white/40">{product.sku} · {product.category}</span></span></button>; })}</div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5"><div className="text-xs text-white/40">Saving links products only; it never merges, renames or deletes them.</div><div className="flex gap-3">{selectedSlug && <button disabled={saving} onClick={remove} className="border border-red-400/40 text-red-300 px-5 py-3 text-xs uppercase tracking-[0.18em]"><Trash2 size={14} className="inline mr-2" />Delete family</button>}<button disabled={saving} onClick={save} className="bg-[#D4AF37] text-black px-7 py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-50">{saving ? "Saving…" : "Save reviewed family"}</button></div></div>
        </div>
      </div>
    </div>
  );
}
