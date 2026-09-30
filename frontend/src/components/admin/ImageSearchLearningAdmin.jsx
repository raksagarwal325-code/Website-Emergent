import React, { useEffect, useMemo, useState } from "react";
import { Check, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export default function ImageSearchLearningAdmin({ products = [] }) {
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const response = await api.adminImageSearchReferences();
    setItems(response?.items || []);
  };

  useEffect(() => { refresh().catch(() => toast.error("Could not load verified search examples")); }, []);

  const choices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return products
      .filter((product) => product.status === "published")
      .filter((product) => !selected.includes(product.id))
      .filter((product) => `${product.sku || ""} ${product.name || ""} ${product.category || ""}`.toLowerCase().includes(needle))
      .slice(0, selected.length >= 12 ? 0 : 12);
  }, [products, query, selected]);

  const selectedProducts = selected.map((id) => products.find((product) => product.id === id)).filter(Boolean);

  const save = async () => {
    if (!file || !selected.length) return;
    setBusy(true);
    try {
      await api.adminAddImageSearchReference(file, selected);
      setFile(null);
      setSelected([]);
      setQuery("");
      await refresh();
      toast.success("This real-world example now improves the existing image search");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not verify this search example");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this verified example from image search?")) return;
    try {
      await api.adminDeleteImageSearchReference(id);
      setItems((current) => current.filter((item) => item.id !== id));
      toast.success("Verified example removed");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not remove this example");
    }
  };

  return (
    <section className="space-y-6" data-testid="admin-image-search-learning">
      <div>
        <div className="eyebrow mb-2">Improve the existing search</div>
        <h2 className="font-serif text-3xl">Verified real-world examples</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
          Upload a difficult client photo and select every correct catalogue product visible in it. The same website and quotation search will use this verified example for future room photos, screenshots and WhatsApp copies. The uploaded photo itself is discarded after its private search fingerprints are created.
        </p>
      </div>

      <div className="grid gap-5 border border-[#D4AF37]/30 bg-black/20 p-5 lg:grid-cols-[280px_1fr]">
        <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center border border-dashed border-white/20 px-5 text-center hover:border-[#D4AF37]/60">
          <Upload size={24} className="mb-3 text-[#D4AF37]" />
          <span className="text-sm text-white/75">{file ? file.name : "Choose a real client image"}</span>
          <span className="mt-2 text-xs text-white/35">JPG, PNG or WebP · up to 10 MB</span>
          <input data-testid="image-search-reference-file" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>

        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-white/45">Correct catalogue products</label>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by SKU or product name" className="mt-2 w-full border border-white/15 bg-black/40 p-3 text-sm" />
          {choices.length > 0 && <div className="max-h-48 overflow-auto border border-t-0 border-white/10">{choices.map((product) => (
            <button key={product.id} type="button" onClick={() => { setSelected((current) => [...current, product.id]); setQuery(""); }} className="flex w-full items-center justify-between border-b border-white/10 p-3 text-left text-sm hover:bg-white/5">
              <span>{product.sku || "No SKU"} · {product.name}</span><Check size={14} className="text-[#D4AF37]" />
            </button>
          ))}</div>}
          <div className="mt-3 flex flex-wrap gap-2">{selectedProducts.map((product) => (
            <span key={product.id} className="inline-flex items-center gap-2 border border-[#D4AF37]/40 px-3 py-2 text-xs text-[#D4AF37]">
              {product.sku || product.name}
              <button type="button" aria-label={`Remove ${product.sku || product.name}`} onClick={() => setSelected((current) => current.filter((id) => id !== product.id))}><X size={13} /></button>
            </span>
          ))}</div>
          <button data-testid="save-image-search-reference" type="button" disabled={!file || !selected.length || busy} onClick={save} className="mt-5 bg-[#D4AF37] px-5 py-3 text-xs uppercase tracking-[0.2em] text-black disabled:opacity-40">
            {busy ? "Verifying…" : "Add to existing search"}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/45">Verified examples · {items.length}</div>
        {!items.length && <div className="border border-white/10 p-5 text-sm text-white/40">No admin-verified examples have been added yet.</div>}
        <div className="space-y-2">{items.map((item) => (
          <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 border border-white/10 p-4">
            <div>
              <div className="text-sm text-white/75">{item.filename || "Verified client image"}</div>
              <div className="mt-1 text-xs text-[#BF9972]">{(item.products || []).map((product) => product.sku || product.name).join(" · ") || "Linked product unavailable"}</div>
            </div>
            <button type="button" aria-label="Remove verified example" onClick={() => remove(item.id)} className="p-2 text-red-300 hover:text-red-200"><Trash2 size={16} /></button>
          </article>
        ))}</div>
      </div>
    </section>
  );
}
