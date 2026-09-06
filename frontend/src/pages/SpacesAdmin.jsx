import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../lib/api";
import { SHOP_BY_SPACE, spaceTag } from "../lib/spaces";
import { suggestionsForSpace } from "../lib/spaceSuggestions";

export default function SpacesAdmin() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("suggestions");
  const [selectedSpace, setSelectedSpace] = useState(SHOP_BY_SPACE[0]?.slug || "");
  const [confidence, setConfidence] = useState("strong");

  const load = async () => {
    setLoading(true);
    try {
      const items = await api.adminProductsExport();
      setProducts(Array.isArray(items) ? items : (items?.items || []));
    } catch {
      toast.error("Could not load published products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => (
    Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort()
  ), [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (category && product.category !== category) return false;
      if (!q) return true;
      return [product.name, product.sku, product.category]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [products, query, category]);

  const space = SHOP_BY_SPACE.find((item) => item.slug === selectedSpace) || SHOP_BY_SPACE[0];
  const suggestions = useMemo(() => {
    if (!space) return [];
    return suggestionsForSpace(visible, space).filter((row) => confidence === "all" || row.confidence === confidence);
  }, [visible, space, confidence]);

  const toggle = async (product, targetSpace) => {
    const tag = spaceTag(targetSpace);
    const tags = Array.isArray(product.tags) ? product.tags : [];
    const has = tags.includes(tag);
    const nextTags = has ? tags.filter((item) => item !== tag) : [...tags, tag];
    setSavingId(`${product.id}:${targetSpace.slug}`);
    try {
      const updated = await api.updateProduct(product.id, { ...product, tags: nextTags });
      setProducts((current) => current.map((item) => item.id === product.id ? (updated || { ...item, tags: nextTags }) : item));
      toast.success(`${targetSpace.label} ${has ? "removed" : "assigned"}`);
    } catch {
      toast.error("Space assignment failed");
    } finally {
      setSavingId(null);
    }
  };

  const approveAllStrong = async () => {
    if (!space) return;
    const strong = suggestionsForSpace(visible, space).filter((row) => row.confidence === "strong");
    if (!strong.length) {
      toast.message("No unassigned strong suggestions in the current filter");
      return;
    }
    for (const row of strong) {
      // Sequential writes avoid clobbering tags when a product is suggested for multiple spaces.
      // The admin can still remove any assignment individually afterwards.
      // eslint-disable-next-line no-await-in-loop
      await toggle(row.product, space);
    }
  };

  return (
    <div data-testid="spaces-admin" className="max-w-7xl mx-auto px-6 py-12">
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/55 hover:text-[#D4AF37]">
        <ArrowLeft size={14} /> Admin dashboard
      </Link>

      <div className="mt-8 mb-8">
        <div className="eyebrow mb-3">Catalogue curation</div>
        <h1 className="font-serif text-4xl md:text-5xl">Space Assignments</h1>
        <p className="mt-4 max-w-3xl text-white/55 leading-relaxed">
          Suggestions are generated from catalogue evidence such as category, product name and description. Nothing is published until you approve it. A product may belong to more than one space.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("suggestions")} className={`px-4 py-2.5 border text-xs uppercase tracking-[0.16em] ${mode === "suggestions" ? "border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10" : "border-white/15 text-white/55"}`}>
          <Sparkles size={13} className="inline mr-2" /> Suggested review
        </button>
        <button type="button" onClick={() => setMode("manual")} className={`px-4 py-2.5 border text-xs uppercase tracking-[0.16em] ${mode === "manual" ? "border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10" : "border-white/15 text-white/55"}`}>
          Manual assignments
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product name, SKU or category" className="w-full bg-[#0a0a0a] border border-white/15 pl-10 pr-3 py-3 text-sm" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-[#0a0a0a] border border-white/15 px-3 py-3 text-sm min-w-[220px]">
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {mode === "suggestions" && (
        <div className="mb-8 border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-5 md:p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 flex-1 max-w-3xl">
              <label className="text-xs uppercase tracking-[0.16em] text-white/50">Space
                <select value={selectedSpace} onChange={(e) => setSelectedSpace(e.target.value)} className="mt-2 block w-full bg-[#0a0a0a] border border-white/15 px-3 py-3 text-sm normal-case tracking-normal text-white">
                  {SHOP_BY_SPACE.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
                </select>
              </label>
              <label className="text-xs uppercase tracking-[0.16em] text-white/50">Confidence
                <select value={confidence} onChange={(e) => setConfidence(e.target.value)} className="mt-2 block w-full bg-[#0a0a0a] border border-white/15 px-3 py-3 text-sm normal-case tracking-normal text-white">
                  <option value="strong">Strong fit</option>
                  <option value="possible">Possible fit</option>
                  <option value="all">Strong + possible</option>
                </select>
              </label>
            </div>
            <button type="button" onClick={approveAllStrong} disabled={Boolean(savingId)} className="border border-[#D4AF37]/55 px-4 py-3 text-xs uppercase tracking-[0.18em] text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-40">
              Approve all strong in filter
            </button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/45">Strong suggestions are high-confidence catalogue matches. Possible suggestions always need closer review. Existing approved assignments are excluded from this list.</p>
        </div>
      )}

      {loading ? <div className="py-16 text-white/40">Loading products…</div> : mode === "suggestions" ? (
        <div className="space-y-3">
          {suggestions.map((row) => (
            <div key={row.product.id} className="border border-white/10 p-5 md:p-6">
              <div className="flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="font-serif text-xl">{row.product.name}</div>
                    <span className={`text-[10px] uppercase tracking-[0.16em] px-2 py-1 border ${row.confidence === "strong" ? "border-[#D4AF37]/55 text-[#D4AF37]" : "border-white/20 text-white/55"}`}>{row.confidence} · {row.score}/100</span>
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/40">{row.product.sku} · {row.product.category}</div>
                  <div className="mt-3 text-sm text-white/50">{row.reasons.join(" · ")}</div>
                </div>
                <button type="button" disabled={savingId === `${row.product.id}:${space.slug}`} onClick={() => toggle(row.product, space)} className="shrink-0 border border-[#D4AF37]/55 px-4 py-3 text-xs uppercase tracking-[0.18em] text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-40">
                  <Check size={13} className="inline mr-2" /> Approve for {space.label}
                </button>
              </div>
            </div>
          ))}
          {suggestions.length === 0 && <div className="border border-white/10 p-10 text-white/45">No unassigned suggestions match this space and filter.</div>}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((product) => (
            <div key={product.id} className="border border-white/10 p-5 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-5 justify-between">
                <div className="lg:w-[28%] shrink-0">
                  <div className="font-serif text-xl">{product.name}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/40">{product.sku} · {product.category}</div>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {SHOP_BY_SPACE.map((item) => {
                    const tag = spaceTag(item);
                    const checked = Array.isArray(product.tags) && product.tags.includes(tag);
                    const busy = savingId === `${product.id}:${item.slug}`;
                    return (
                      <button type="button" key={item.slug} disabled={busy} onClick={() => toggle(product, item)} className={`text-left border px-3 py-3 text-xs transition-colors ${checked ? "border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10" : "border-white/10 text-white/60 hover:border-white/30"}`}>
                        <span className="inline-flex items-center gap-2"><span className={`w-4 h-4 border inline-flex items-center justify-center ${checked ? "border-[#D4AF37]" : "border-white/25"}`}>{checked && <Check size={11} />}</span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          {visible.length === 0 && <div className="border border-white/10 p-10 text-white/45">No products match this filter.</div>}
        </div>
      )}
    </div>
  );
}
