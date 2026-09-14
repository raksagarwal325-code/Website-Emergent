import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, History, RotateCcw } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

const FIELD_LABELS = {
  short_description: "Short description",
  compare_at_price: "MRP",
  price_display: "Price display",
  fixed_price: "Fixed price",
};

const labelFor = (field) => FIELD_LABELS[field]
  || field.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function ProductVersionHistory({ product, onRestored }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [restoring, setRestoring] = useState("");

  const load = useCallback(async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      setVersions(await api.listProductVersions(product.id));
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [product?.id]);

  useEffect(() => { load(); }, [load]);

  const restore = async (version) => {
    if (!window.confirm(`Restore ${product.name} to version ${version.version}? A new restore point will be created.`)) return;
    setRestoring(version.id);
    try {
      const restored = await api.restoreProductVersion(product.id, version.id);
      toast.success(`Restored version ${version.version}`);
      onRestored?.(restored);
      await load();
    } catch {
      toast.error("Restore failed");
    } finally {
      setRestoring("");
    }
  };

  return (
    <section className="border border-[#D4AF37]/30 bg-black/20" data-testid="product-version-history">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        data-testid="version-history-toggle"
      >
        <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
          <History size={14} /> Version history
        </span>
        <span className="inline-flex items-center gap-2 text-[10px] text-white/50">
          {loading ? "Loading…" : `${versions.length} restore point${versions.length === 1 ? "" : "s"}`}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/10 p-4 space-y-3" data-testid="version-history-list">
          {!loading && versions.length === 0 && (
            <p className="text-xs text-white/50">The first restore point will be created when this product is updated.</p>
          )}
          {versions.map((version, index) => (
            <article key={version.id} className="border border-white/10 p-3 space-y-2" data-testid={`product-version-${version.version}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-white/90">
                    Version {version.version}{index === 0 ? " · Current" : ""}
                  </div>
                  <div className="text-[10px] text-white/45 mt-1">
                    {new Date(version.created_at).toLocaleString("en-IN")} · {version.edited_by}
                  </div>
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    disabled={Boolean(restoring)}
                    onClick={() => restore(version)}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-[#D4AF37] disabled:opacity-40"
                    data-testid={`restore-version-${version.version}`}
                  >
                    <RotateCcw size={12} /> {restoring === version.id ? "Restoring…" : "Restore"}
                  </button>
                )}
              </div>
              <p className="text-xs text-[#BF9972]">{version.reason}</p>
              {(version.changes || []).map((change) => (
                <div key={change.field} className="grid grid-cols-[110px_1fr] gap-2 text-[10px] border-t border-white/5 pt-2">
                  <span className="text-white/50">{labelFor(change.field)}</span>
                  <span className="min-w-0">
                    <span className="text-red-200/70 line-through break-words">{displayValue(change.old)}</span>
                    <span className="text-white/30 mx-2">→</span>
                    <span className="text-green-200/80 break-words">{displayValue(change.new)}</span>
                  </span>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
