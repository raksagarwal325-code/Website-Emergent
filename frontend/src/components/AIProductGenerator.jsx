import React, { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Edit3, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

const CATEGORIES = ["Chandelier", "Hanging Light", "Wall Light", "Table Lamp", "Floor Lamp", "Candle Stand", "Floor Chandelier", "Table Chandelier", "Gate Light"];
const pairKey = (name) => name.replace(/\.[^.]+$/, "").replace(/[\s_-]*(?:a|white|light|off|black|dark|lit|on)$/i, "").trim().toLowerCase();
const isWhite = (name) => /(?:^|[\s_-])(?:a|white|light|off)(?:\.[^.]+)?$/i.test(name);

export const pairProductFiles = (files) => {
  const groups = new Map();
  Array.from(files || []).forEach((file) => {
    const key = pairKey(file.name) || file.name;
    groups.set(key, [...(groups.get(key) || []), file]);
  });
  return Array.from(groups.entries()).map(([key, group], index) => {
    const ordered = [...group].sort((a, b) => Number(isWhite(a.name)) - Number(isWhite(b.name))).slice(0, 2);
    return { client_id: `${Date.now()}-${index}-${key}`, files: ordered, previews: ordered.map(URL.createObjectURL), category: "Chandelier", height: "", width: "", notes: "", state: "queued", selected: true, warnings: group.length > 2 ? ["More than two matching images; only the first pair will be used."] : [] };
  });
};

const Status = ({ row }) => {
  if (["uploading", "analyzing", "creating"].includes(row.state)) return <span className="inline-flex items-center gap-1 text-[#D4AF37]"><Loader2 size={12} className="animate-spin" /> {row.state}</span>;
  if (row.state === "ready" || row.state === "created") return <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 size={12} /> {row.state === "created" ? "draft created" : "ready"}</span>;
  if (row.state === "error") return <span className="inline-flex items-center gap-1 text-red-400"><AlertCircle size={12} /> failed</span>;
  return <span className="text-white/45">{row.files.length === 2 ? "paired" : "one image"}</span>;
};

export default function AIProductGenerator({ onDone, setEditingProduct }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const patchRow = (id, patch) => setRows((cur) => cur.map((row) => row.client_id === id ? { ...row, ...patch } : row));
  const selectedReady = useMemo(() => rows.filter((r) => r.selected && r.state === "ready" && !(r.validation || []).length), [rows]);
  const update = (id, field, value) => patchRow(id, { [field]: value });
  const remove = (row) => { row.previews.forEach(URL.revokeObjectURL); setRows((cur) => cur.filter((r) => r.client_id !== row.client_id)); };
  const clear = () => { rows.forEach((r) => r.previews.forEach(URL.revokeObjectURL)); setRows([]); };

  const analyze = async () => {
    const pending = rows.filter((r) => r.selected && !["created", "ready"].includes(r.state));
    if (!pending.length || busy) return;
    setBusy(true);
    try {
      const uploaded = [];
      for (const row of pending) {
        patchRow(row.client_id, { state: "uploading", error: "" });
        try {
          const saved = [];
          for (const file of row.files) saved.push(await api.upload(file));
          uploaded.push({ ...row, imageUrls: saved.map((u) => u.url) });
          patchRow(row.client_id, { state: "analyzing", imageUrls: saved.map((u) => u.url) });
        } catch (e) { patchRow(row.client_id, { state: "error", error: e?.response?.data?.detail || e.message || "Upload failed" }); }
      }
      if (!uploaded.length) return;
      const response = await api.aiAnalyzeProductBatch(uploaded.map((r) => ({ client_id: r.client_id, image_urls: r.imageUrls, category: r.category, height: r.height, width: r.width, notes: r.notes })));
      response.results.forEach((result) => patchRow(result.client_id, result.success ? { state: "ready", draft: result.draft, warnings: result.warnings || [], validation: result.validation || [] } : { state: "error", error: result.error || "Analysis failed" }));
      toast.success("Batch analysed — review warnings, then create all drafts");
    } catch (e) { toast.error(e?.response?.data?.detail || e.message || "Batch analysis failed"); }
    finally { setBusy(false); }
  };

  const createAll = async () => {
    if (!selectedReady.length || busy) return;
    setBusy(true);
    selectedReady.forEach((r) => patchRow(r.client_id, { state: "creating" }));
    try {
      const response = await api.aiCommitProductBatch(selectedReady.map((r) => r.draft));
      response.results.forEach((result) => {
        const row = selectedReady.find((r) => r.draft.sku === result.sku);
        if (row) patchRow(row.client_id, result.success ? { state: "created", draft: result.product } : { state: "error", error: result.error });
      });
      toast.success(`${response.created} Needs Review draft${response.created === 1 ? "" : "s"} created`);
      onDone?.();
    } catch (e) { toast.error(e?.response?.data?.detail || e.message || "Could not create drafts"); }
    finally { setBusy(false); }
  };

  return <section className="border border-[#D4AF37]/35 bg-[#0d0510] p-5 md:p-6 space-y-5" data-testid="ai-product-generator">
    <div className="flex items-start gap-3"><div className="w-9 h-9 grid place-items-center rounded-full border border-[#D4AF37]/60 text-[#D4AF37]"><Sparkles size={16} /></div><div><div className="text-[10px] uppercase tracking-[0.28em] text-[#BF9972]">AI bulk product upload</div><h2 className="font-serif text-xl">Pair, analyse, review and create in one batch</h2><p className="text-xs text-white/50 mt-1">Files ending in A, white, light or off become the second image. Every listing stays unpublished as Needs Review.</p></div></div>
    <label className="block border-2 border-dashed border-[#D4AF37]/25 hover:border-[#D4AF37]/60 cursor-pointer p-6 text-center" data-testid="ai-gen-dropzone"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => { setRows((cur) => [...cur, ...pairProductFiles(e.target.files)]); e.target.value = ""; }} className="hidden" data-testid="ai-gen-file-input" /><Upload size={20} className="mx-auto text-[#D4AF37]" /><div className="text-sm mt-2">Choose all black-and-white product image pairs</div><div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Up to 30 products per batch</div></label>
    {rows.length > 0 && <div className="overflow-x-auto border border-white/10"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-black/40 text-[10px] uppercase tracking-widest text-white/45"><tr>{["Use", "Images", "Category", "Height", "Width", "Family / reference / facts", "Result", ""].map((h) => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.client_id} className="border-t border-white/10 align-top">
      <td className="p-3"><input type="checkbox" checked={row.selected} disabled={busy || row.state === "created"} onChange={(e) => update(row.client_id, "selected", e.target.checked)} /></td>
      <td className="p-3"><div className="flex gap-1">{row.previews.map((src, i) => <img key={src} src={src} alt={i ? "White background" : "Black background"} className="h-14 w-14 object-contain bg-black border border-white/10" />)}</div><div className="text-[10px] text-white/35 mt-1 max-w-40">{row.files.map((f) => f.name).join(" + ")}</div></td>
      <td className="p-3"><select value={row.category} disabled={busy || !!row.draft} onChange={(e) => update(row.client_id, "category", e.target.value)} className="bg-black border border-white/15 px-2 py-2">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></td>
      <td className="p-3"><input value={row.height} disabled={busy || !!row.draft} onChange={(e) => update(row.client_id, "height", e.target.value)} placeholder={'e.g. 24"'} className="w-24 bg-black border border-white/15 px-2 py-2" /></td>
      <td className="p-3"><input value={row.width} disabled={busy || !!row.draft} onChange={(e) => update(row.client_id, "width", e.target.value)} placeholder={'e.g. 18"'} className="w-24 bg-black border border-white/15 px-2 py-2" /></td>
      <td className="p-3"><textarea value={row.notes} disabled={busy || !!row.draft} onChange={(e) => update(row.client_id, "notes", e.target.value)} placeholder="Rajsi family; same as SGE-…; 6 lights…" rows={2} className="w-64 bg-black border border-white/15 px-2 py-2" /></td>
      <td className="p-3 max-w-xs"><div className="text-[10px] uppercase tracking-widest"><Status row={row} /></div>{row.draft && <><div className="font-serif mt-1">{row.draft.name}</div><div className="text-[10px] text-[#BF9972]">{row.draft.sku} · {Object.keys(row.draft.specs || {}).length} specifications</div></>}{[...(row.warnings || []), ...(row.validation || [])].map((w) => <div key={w} className="text-[10px] text-amber-300 mt-1">⚠ {w}</div>)}{row.error && <div className="text-[10px] text-red-400 mt-1">{row.error}</div>}{row.state === "created" && <button onClick={() => setEditingProduct?.(row.draft)} className="mt-2 text-[10px] uppercase tracking-widest text-[#D4AF37]"><Edit3 size={10} className="inline mr-1" />Review & edit</button>}</td>
      <td className="p-3"><button disabled={busy} onClick={() => remove(row)} aria-label="Remove product"><X size={14} /></button></td>
    </tr>)}</tbody></table></div>}
    <div className="flex flex-wrap gap-3"><button onClick={analyze} disabled={busy || !rows.some((r) => r.selected && !["ready", "created"].includes(r.state))} data-testid="ai-gen-run-btn" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.24em] disabled:opacity-40">{busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Analyse batch</button><button onClick={createAll} disabled={busy || !selectedReady.length} data-testid="ai-gen-create-btn" className="border border-emerald-500/60 text-emerald-300 px-6 py-3 uppercase text-xs tracking-[0.24em] disabled:opacity-40">Create all ready drafts ({selectedReady.length})</button>{!busy && rows.length > 0 && <button onClick={clear} className="text-xs text-white/40 px-3">Clear all</button>}</div>
  </section>;
}
