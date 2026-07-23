import React, { useEffect, useRef, useState } from "react";
import { GripVertical, Trash2, Upload, Eye, EyeOff, Save, Plus } from "lucide-react";
import { api, authHeaders } from "../../lib/api";
import { toast } from "sonner";

export default function HeroSliderAdmin() {
  const [slides, setSlides] = useState([]);
  const [settings, setSettings] = useState({ display_duration: 6, transition_duration: 1.5 });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const dragFrom = useRef(null);
  const dragOver = useRef(null);

  const refresh = async () => {
    const [s, cfg] = await Promise.all([api.adminListHeroSlides(), api.adminGetHeroSettings()]);
    setSlides(Array.isArray(s) ? s : []);
    if (cfg) setSettings(cfg);
  };

  useEffect(() => { refresh().catch(() => toast.error("Failed to load hero slides")); }, []);

  const onUpload = async (fileList) => {
    if (!fileList?.length) return;
    setBusy(true);
    try {
      for (const file of fileList) {
        await api.adminUploadHeroSlide(file, file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
      }
      toast.success(`Uploaded ${fileList.length} image${fileList.length > 1 ? "s" : ""}`);
      await refresh();
    } catch (e) {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (slide) => {
    try {
      await api.adminUpdateHeroSlide(slide.id, { enabled: !slide.enabled });
      await refresh();
    } catch (e) {
      toast.error(e?.message || "Cannot disable — at least one enabled slide is required");
    }
  };

  const updateAlt = async (slide, alt) => {
    await api.adminUpdateHeroSlide(slide.id, { alt_text: alt });
    await refresh();
  };

  const doDelete = async (slide) => {
    try {
      await api.adminDeleteHeroSlide(slide.id);
      toast.success("Slide removed");
      setConfirmDelete(null);
      await refresh();
    } catch (e) {
      toast.error(e?.message || "Delete blocked — at least one enabled slide must remain");
    }
  };

  const onDragStart = (i) => (e) => { dragFrom.current = i; e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (i) => (e) => { e.preventDefault(); dragOver.current = i; };
  const onDrop = async () => {
    const from = dragFrom.current, to = dragOver.current;
    dragFrom.current = null; dragOver.current = null;
    if (from == null || to == null || from === to) return;
    const next = [...slides];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    setSlides(next);
    try {
      await api.adminReorderHeroSlides(next.map((s) => s.id));
    } catch { toast.error("Reorder failed"); refresh(); }
  };

  const saveSettings = async () => {
    try {
      await api.adminUpdateHeroSettings(settings);
      toast.success("Timing saved");
    } catch { toast.error("Could not save"); }
  };

  const enabledCount = slides.filter((s) => s.enabled).length;

  return (
    <div data-testid="admin-hero-slider">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl mb-1">Hero Slider</h2>
          <p className="text-white/50 text-sm">Homepage background slideshow · {enabledCount} enabled · drag to reorder</p>
        </div>
        <label data-testid="hero-upload-btn" className="cursor-pointer inline-flex items-center gap-2 border border-[#D4AF37] text-[#D4AF37] px-5 py-2.5 text-xs uppercase tracking-[0.24em] hover:bg-[#D4AF37]/10">
          <Upload size={14} /> Upload images
          <input type="file" accept="image/*" multiple hidden onChange={(e) => onUpload(Array.from(e.target.files || []))} disabled={busy} />
        </label>
      </div>

      {/* Global timing */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-5 border border-white/10 bg-white/5">
        <label className="block">
          <div className="text-[10px] uppercase tracking-[0.24em] text-white/50 mb-2">Display duration (sec)</div>
          <input
            data-testid="hero-display-duration"
            type="number" step="0.5" min="2" max="60"
            value={settings.display_duration}
            onChange={(e) => setSettings({ ...settings, display_duration: Number(e.target.value) })}
            className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <div className="text-[10px] uppercase tracking-[0.24em] text-white/50 mb-2">Transition duration (sec)</div>
          <input
            data-testid="hero-transition-duration"
            type="number" step="0.1" min="0.2" max="10"
            value={settings.transition_duration}
            onChange={(e) => setSettings({ ...settings, transition_duration: Number(e.target.value) })}
            className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm"
          />
        </label>
        <button data-testid="hero-save-settings" onClick={saveSettings} className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] text-black px-4 py-2 text-xs uppercase tracking-[0.24em]">
          <Save size={14} /> Save timing
        </button>
      </div>

      {slides.length === 0 && (
        <div className="border border-dashed border-white/15 p-12 text-center text-white/50">
          No hero slides yet. Upload one or more images to get started.
        </div>
      )}

      <div className="space-y-3">
        {slides.map((s, i) => (
          <div
            key={s.id}
            data-testid={`hero-slide-${s.id}`}
            draggable
            onDragStart={onDragStart(i)}
            onDragOver={onDragOver(i)}
            onDrop={onDrop}
            className="flex items-center gap-4 border border-white/10 bg-white/5 p-3"
          >
            <div className="cursor-grab text-white/40" title="Drag to reorder"><GripVertical size={18} /></div>
            <img src={s.image_url} alt={s.alt_text} className="w-28 h-16 object-cover flex-shrink-0" />
            <input
              data-testid={`hero-alt-${s.id}`}
              defaultValue={s.alt_text}
              onBlur={(e) => e.target.value !== s.alt_text && updateAlt(s, e.target.value)}
              placeholder="Alt text (for accessibility & SEO)"
              className="flex-1 bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm"
            />
            <button
              data-testid={`hero-toggle-${s.id}`}
              onClick={() => toggleEnabled(s)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.2em] border ${s.enabled ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/25 text-white/50"}`}
            >
              {s.enabled ? <><Eye size={13}/> Enabled</> : <><EyeOff size={13}/> Disabled</>}
            </button>
            <button
              data-testid={`hero-delete-${s.id}`}
              onClick={() => setConfirmDelete(s)}
              className="text-white/60 hover:text-red-400 p-2"
              title="Delete slide"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" data-testid="hero-delete-confirm">
          <div className="bg-[#1a0a13] border border-white/15 p-6 max-w-md w-full mx-4">
            <h3 className="font-serif text-xl mb-2">Delete this slide?</h3>
            <p className="text-white/60 text-sm mb-5">
              <em>“{confirmDelete.alt_text || "Untitled"}”</em> will be removed from the homepage slideshow. This cannot be undone.
            </p>
            <img src={confirmDelete.image_url} alt="" className="w-full max-h-40 object-cover mb-5" />
            <div className="flex justify-end gap-3">
              <button data-testid="hero-cancel-delete" onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/60 hover:text-white">Cancel</button>
              <button data-testid="hero-confirm-delete" onClick={() => doDelete(confirmDelete)} className="px-4 py-2 text-xs uppercase tracking-[0.24em] bg-red-600 hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
