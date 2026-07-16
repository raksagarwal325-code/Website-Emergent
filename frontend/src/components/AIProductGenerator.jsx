import React, { useState } from "react";
import { Sparkles, Upload, Loader2, CheckCircle2, AlertCircle, X, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

// Small pill for the per-image status.
const StatusPill = ({ state, error }) => {
  if (state === "pending")
    return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/40"><Loader2 size={10} className="animate-spin" /> Queued</span>;
  if (state === "analyzing")
    return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#D4AF37]"><Loader2 size={10} className="animate-spin" /> Analyzing…</span>;
  if (state === "done")
    return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-400"><CheckCircle2 size={11} /> Draft created</span>;
  if (state === "error")
    return <span title={error} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-red-400"><AlertCircle size={11} /> Failed</span>;
  return null;
};

/**
 * AI Product Generator
 * - Bulk-upload N images
 * - Each is uploaded to /api/upload (watermarked as usual)
 * - Then /api/ai/generate-product is called with the stored image URL
 * - Each success creates a draft product (status: "draft", badge: "Needs Review")
 * - When done, the admin can click "Edit & Review" to open the standard product form
 */
export default function AIProductGenerator({ onDone, setEditingProduct }) {
  const [items, setItems] = useState([]); // { file, preview, state, error?, imageUrl?, draft? }
  const [busy, setBusy] = useState(false);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    const nextItems = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      state: "pending",
    }));
    setItems((cur) => [...cur, ...nextItems]);
  };

  const removeItem = (idx) => setItems((cur) => cur.filter((_, i) => i !== idx));

  const runAll = async () => {
    if (busy || items.length === 0) return;
    setBusy(true);
    // Snapshot the pending list we're about to process
    const pendingIdxs = items.map((it, i) => (it.state === "pending" ? i : -1)).filter((i) => i >= 0);
    for (const idx of pendingIdxs) {
      // 1) Upload the image
      setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, state: "analyzing" } : it)));
      try {
        const uploaded = await api.upload(items[idx].file);
        // 2) Ask AI to generate the draft product
        const draft = await api.aiGenerateProduct(uploaded.url);
        setItems((cur) =>
          cur.map((it, i) =>
            i === idx ? { ...it, state: "done", imageUrl: uploaded.url, draft } : it,
          ),
        );
      } catch (e) {
        setItems((cur) =>
          cur.map((it, i) =>
            i === idx
              ? { ...it, state: "error", error: e?.response?.data?.detail || e?.message || "Failed" }
              : it,
          ),
        );
      }
    }
    setBusy(false);
    const created = items.filter((it) => it.state === "done").length; // stale snapshot — recompute
    if (created >= 0) toast.success("AI drafts ready — click Review to edit each one");
    onDone?.();
  };

  const readyCount = items.filter((it) => it.state === "done").length;
  const errorCount = items.filter((it) => it.state === "error").length;

  return (
    <div className="border border-[#D4AF37]/35 p-5 md:p-6 space-y-4"
      style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.05), transparent), #0d0510" }}
      data-testid="ai-product-generator">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 flex items-center justify-center rounded-full border border-[#D4AF37]/60 text-[#D4AF37] flex-shrink-0">
          <Sparkles size={16} strokeWidth={1.7} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.28em] text-[#BF9972]">AI Product Details Generator</div>
          <div className="font-serif text-lg leading-tight mt-0.5">Draft product details from a product photograph.</div>
          <p className="text-xs text-white/50 mt-1 leading-relaxed">
            Upload one or many images. AI drafts the name, category, description, tags, SKU and specifications for each.
            <span className="text-[#BF9972]"> All drafts are saved as <b>Needs Review</b> — nothing is auto-published.</span>
          </p>
        </div>
      </div>

      {/* Dropzone */}
      <label className="block border-2 border-dashed border-[#D4AF37]/25 hover:border-[#D4AF37]/60 transition-colors cursor-pointer p-6 text-center"
        data-testid="ai-gen-dropzone">
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          className="hidden"
          data-testid="ai-gen-file-input"
        />
        <Upload size={20} className="mx-auto text-[#D4AF37]" />
        <div className="text-sm mt-2 text-white/80">Drop product photos here — or click to select</div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">JPG · PNG · WEBP</div>
      </label>

      {/* Grid of queued items */}
      {items.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2 flex items-center justify-between">
            <span>{items.length} photo{items.length === 1 ? "" : "s"} queued</span>
            {readyCount + errorCount > 0 && (
              <span>{readyCount} drafts · {errorCount} errors</span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((it, i) => (
              <div key={i} className="relative border border-white/10 p-2 bg-black/40" data-testid={`ai-gen-item-${i}`}>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-black/60 text-white/60 hover:text-red-400 z-10"
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
                <div className="aspect-square bg-black overflow-hidden">
                  <img src={it.preview} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="pt-2 pb-1">
                  <StatusPill state={it.state} error={it.error} />
                  {it.state === "done" && it.draft && (
                    <>
                      <div className="text-[11px] text-white/85 mt-1 font-serif leading-tight line-clamp-2">
                        {it.draft.name}
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-[#BF9972]/80 mt-0.5">
                        {it.draft.category} · {it.draft.sku}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingProduct?.(it.draft)}
                        data-testid={`ai-gen-review-${i}`}
                        className="mt-2 w-full inline-flex items-center justify-center gap-1 border border-[#D4AF37]/60 text-[#D4AF37] px-2 py-1.5 text-[10px] uppercase tracking-widest hover:bg-[#D4AF37]/10"
                      >
                        <Edit3 size={10} /> Review & edit
                      </button>
                    </>
                  )}
                  {it.state === "error" && (
                    <div className="text-[10px] text-red-400/80 mt-1 line-clamp-3">{it.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center pt-2">
        <button
          type="button"
          onClick={runAll}
          disabled={busy || items.length === 0 || items.every((it) => it.state !== "pending")}
          data-testid="ai-gen-run-btn"
          className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> Generate drafts</>}
        </button>
        {items.length > 0 && !busy && (
          <button
            type="button"
            onClick={() => setItems([])}
            className="text-[10px] uppercase tracking-widest text-white/40 hover:text-red-400"
          >
            Clear all
          </button>
        )}
        <div className="ml-auto text-[10px] uppercase tracking-widest text-white/35">
          ~10–15s per image · drafts stay unpublished
        </div>
      </div>
    </div>
  );
}
