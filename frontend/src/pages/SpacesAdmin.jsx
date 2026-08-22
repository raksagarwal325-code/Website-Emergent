import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../lib/api";
import { SHOP_BY_SPACE, spaceTag } from "../lib/spaces";

export default function SpacesAdmin() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const items = await api.listAllProducts({ include_drafts: 1, limit: 5000 });
      setProducts(items || []);
    } catch {
      toast.error("Could not load products");
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

  const toggle = async (product, space) => {
    const tag = spaceTag(space);
    const tags = Array.isArray(product.tags) ? product.tags : [];
    const has = tags.includes(tag);
    const nextTags = has ? tags.filter((item) => item !== tag) : [...tags, tag];
    setSavingId(`${product.id}:${space.slug}`);
    try {
      const updated = await api.updateProduct(product.id, { ...product, tags: nextTags });
      setProducts((current) => current.map((item) => item.id === product.id ? (updated || { ...item, tags: nextTags }) : item));
      toast.success(`${space.label} ${has ? "removed" : "assigned"}`);
    } catch {
      toast.error("Space assignment failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div data-testid="spaces-admin" className="max-w-7xl mx-auto px-6 py-12">
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/55 hover:text-[#D4AF37]">
        <ArrowLeft size={14} /> Admin dashboard
      </Link>

      <div className="mt-8 mb-10">
        <div className="eyebrow mb-3">Catalogue curation</div>
        <h1 className="font-serif text-4xl md:text-5xl">Space Assignments</h1>
        <p className="mt-4 max-w-3xl text-white/55 leading-relaxed">
          Assign only verified applications. A product may belong to more than one space. These selections power the public Shop by Space pages through controlled product tags.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product name, SKU or category"
            className="w-full bg-[#0a0a0a] border border-white/15 pl-10 pr-3 py-3 text-sm"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-[#0a0a0a] border border-white/15 px-3 py-3 text-sm min-w-[220px]"
        >
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {loading ? <div className="py-16 text-white/40">Loading products…</div> : (
        <div className="space-y-4">
          {visible.map((product) => (
            <div key={product.id} className="border border-white/10 p-5 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-5 justify-between">
                <div className="lg:w-[28%] shrink-0">
                  <div className="font-serif text-xl">{product.name}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/40">{product.sku} · {product.category}</div>
                  {product.status === "draft" && <div className="mt-2 text-xs text-[#D4AF37]">Draft</div>}
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {SHOP_BY_SPACE.map((space) => {
                    const tag = spaceTag(space);
                    const checked = Array.isArray(product.tags) && product.tags.includes(tag);
                    const busy = savingId === `${product.id}:${space.slug}`;
                    return (
                      <button
                        type="button"
                        key={space.slug}
                        disabled={busy}
                        onClick={() => toggle(product, space)}
                        className={`text-left border px-3 py-3 text-xs transition-colors ${checked ? "border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10" : "border-white/10 text-white/60 hover:border-white/30"}`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className={`w-4 h-4 border inline-flex items-center justify-center ${checked ? "border-[#D4AF37]" : "border-white/25"}`}>
                            {checked && <Check size={11} />}
                          </span>
                          {space.label}
                        </span>
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
