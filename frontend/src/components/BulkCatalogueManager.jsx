import React, { useEffect, useMemo, useState } from "react";
import { Check, Layers, SearchCheck, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

const EMPTY_CHANGES = {
  category: "",
  status: "",
  featured: "",
  price_display: "",
  badge: "",
};

const FIELD_LABELS = {
  category: "Category",
  status: "Status",
  featured: "Homepage featured",
  price_display: "Price display",
  fixed_price: "Fixed-price compatibility",
  badge: "Badge",
};

const showValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).replaceAll("_", " ");
};

export default function BulkCatalogueManager({
  selectedIds,
  visibleProducts,
  categories,
  onSelectVisible,
  onClear,
  onApplied,
}) {
  const [changes, setChanges] = useState(EMPTY_CHANGES);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const selected = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectionKey = selected.join("|");

  useEffect(() => { setPreview(null); }, [selectionKey]);

  const setField = (field, value) => {
    setChanges((current) => ({ ...current, [field]: value }));
    setPreview(null);
  };

  const payloadChanges = () => Object.fromEntries(
    Object.entries(changes)
      .filter(([, value]) => value !== "")
      .map(([field, value]) => [field, field === "featured" ? value === "true" : value]),
  );

  const runPreview = async () => {
    if (!selected.length) {
      toast.error("Select at least one product");
      return;
    }
    const patch = payloadChanges();
    if (!Object.keys(patch).length) {
      toast.error("Choose at least one field to change");
      return;
    }
    setPreviewing(true);
    try {
      setPreview(await api.previewBulkProductUpdate(selected, patch));
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not generate preview");
    } finally {
      setPreviewing(false);
    }
  };

  const apply = async () => {
    if (!preview?.preview_token || !preview.change_count) return;
    if (!window.confirm(`Apply the reviewed changes to ${preview.change_count} products?`)) return;
    setApplying(true);
    try {
      const result = await api.applyBulkProductUpdate(
        selected,
        payloadChanges(),
        preview.preview_token,
        reason || "Bulk catalogue update",
      );
      toast.success(`${result.updated_count} products updated with restore points`);
      setPreview(null);
      setChanges(EMPTY_CHANGES);
      setReason("");
      onClear();
      await onApplied();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Bulk update failed");
      setPreview(null);
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className="border border-[#D4AF37]/35 bg-black/20 p-5 space-y-4" data-testid="bulk-catalogue-manager">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
            <Layers size={14} /> Bulk catalogue manager
          </div>
          <p className="text-xs text-white/50 mt-2">
            Select products, choose only the fields to change, then review every difference before applying.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSelectVisible} className="border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.16em] hover:border-[#D4AF37]" data-testid="bulk-select-filtered">
            Select filtered ({visibleProducts.length})
          </button>
          {selected.length > 0 && (
            <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-white/50 hover:text-white" data-testid="bulk-clear-selection">
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="text-sm text-white/80" data-testid="bulk-selected-count">
        <span className="font-serif text-xl text-white">{selected.length}</span> selected
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <label className="space-y-1">
          <span className="eyebrow">Category</span>
          <select value={changes.category} onChange={(e) => setField("category", e.target.value)} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-xs" data-testid="bulk-category">
            <option value="">No change</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="eyebrow">Status</span>
          <select value={changes.status} onChange={(e) => setField("status", e.target.value)} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-xs" data-testid="bulk-status">
            <option value="">No change</option>
            <option value="draft">Draft / Needs review</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="eyebrow">Homepage</span>
          <select value={changes.featured} onChange={(e) => setField("featured", e.target.value)} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-xs" data-testid="bulk-featured">
            <option value="">No change</option>
            <option value="true">Featured</option>
            <option value="false">Not featured</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="eyebrow">Price display</span>
          <select value={changes.price_display} onChange={(e) => setField("price_display", e.target.value)} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-xs" data-testid="bulk-price-display">
            <option value="">No change</option>
            <option value="on_request">Price on request</option>
            <option value="starting_from">Starting from</option>
            <option value="fixed">Fixed price</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="eyebrow">Badge</span>
          <input value={changes.badge} onChange={(e) => setField("badge", e.target.value)} placeholder="No change" className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-xs" data-testid="bulk-badge" />
        </label>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <label className="space-y-1 flex-1 min-w-[260px]">
          <span className="eyebrow">Reason for change</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: Correct category after catalogue review" className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-xs" data-testid="bulk-reason" />
        </label>
        <button type="button" onClick={runPreview} disabled={previewing || applying} className="inline-flex items-center gap-2 border border-[#D4AF37] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#D4AF37] disabled:opacity-40" data-testid="bulk-preview">
          <SearchCheck size={13} /> {previewing ? "Preparing…" : "Preview changes"}
        </button>
      </div>

      {preview && (
        <div className="border-t border-white/10 pt-4 space-y-3" data-testid="bulk-preview-panel">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-white/80">
              <strong>{preview.change_count}</strong> products will change
              {preview.unchanged_count ? ` · ${preview.unchanged_count} already match` : ""}
            </p>
            <button type="button" onClick={apply} disabled={applying || !preview.change_count} className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-5 py-2 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40" data-testid="bulk-apply">
              <Check size={13} /> {applying ? "Applying…" : `Confirm ${preview.change_count} updates`}
            </button>
          </div>
          <div className="max-h-72 overflow-auto border border-white/10 divide-y divide-white/10">
            {preview.items.map((item) => (
              <div key={item.id} className="p-3 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2 text-xs">
                <div>
                  <div className="text-white">{item.name}</div>
                  <div className="text-[#BF9972] text-[10px] mt-1">{item.sku || "No SKU"}</div>
                </div>
                <div className="space-y-1">
                  {item.changes.map((change) => (
                    <div key={change.field} className="grid grid-cols-[150px_1fr] gap-2">
                      <span className="text-white/45">{FIELD_LABELS[change.field] || change.field}</span>
                      <span><span className="text-red-200/70 line-through">{showValue(change.old)}</span><span className="text-white/30 mx-2">→</span><span className="text-green-200/80">{showValue(change.new)}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
