import React, { useMemo, useState } from "react";
import { CheckCircle2, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useSettings } from "../context/SettingsContext";

const PRESETS = [
  ["component-preparation", "Component preparation", "WhatsApp Video 2026-08-15 at 9.07.03 AM.mp4", "Decorative lighting components being assembled and prepared by hand in our Firozabad workshop."],
  ["shaping-finishing", "Shaping & finishing", "WhatsApp Video 2026-08-15 at 9.17.25 AM (1).mp4", "A glass component being shaped and refined using workshop grinding equipment."],
  ["surface-edge-work", "Surface & edge work", "WhatsApp Video 2026-08-15 at 9.21.32 AM (2).mp4", "Decorative glass pattern and edge work being refined by hand."],
  ["cleaning-preparation", "Cleaning & preparation", "WhatsApp Video 2026-08-15 at 9.23.39 AM.mp4", "Finished glass components being cleaned and prepared before fitting or final assembly."],
  ["fitting-assembly", "Fitting & assembly", "WhatsApp Video 2026-08-15 at 9.21.32 AM (4).mp4", "Decorative glass components being handled and fitted by hand during production."],
  ["inspection-packing", "Inspection & packing", "WhatsApp Video 2026-08-15 at 9.23.45 AM.mp4", "Finished components being handled, checked and prepared for the next stage or dispatch."],
  ["manual-finishing-detail", "Manual finishing detail", "WhatsApp Video 2026-08-15 at 9.17.26 AM.mp4", "Close-up of manual finishing on an individual decorative glass piece."],
  ["final-handling-detail", "Final handling detail", "WhatsApp Video 2026-08-15 at 9.23.48 AM.mp4", "Finished glass pieces being individually handled before final fixture assembly."],
].map(([key, title, filename, caption]) => ({ key, title, filename, caption }));

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

export default function AdminCraftProof() {
  const { settings, refresh } = useSettings();
  const saved = settings?.homepage_content?.craft_proof?.clips || [];
  const [clips, setClips] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const byKey = useMemo(() => Object.fromEntries((clips || []).filter((c) => c?.key).map((c) => [c.key, c])), [clips]);

  const persist = async (nextClips) => {
    await api.updateSettings({
      homepage_content: {
        ...(settings?.homepage_content || {}),
        craft_proof: { clips: nextClips },
      },
    });
    setClips(nextClips);
    await refresh();
  };

  const upsert = (current, preset, url) => {
    const next = (current || []).filter((c) => c?.key !== preset.key);
    next.push({ key: preset.key, title: preset.title, video_url: url, thumbnail_url: "", caption: preset.caption });
    return PRESETS.map((p) => next.find((c) => c?.key === p.key)).filter(Boolean);
  };

  const batchUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const lookup = Object.fromEntries(files.map((f) => [norm(f.name), f]));
    const matched = PRESETS.map((preset) => ({ preset, file: lookup[norm(preset.filename)] })).filter((x) => x.file);
    if (!matched.length) {
      toast.error("None of the selected filenames matched the approved workshop clips.");
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      let next = clips || [];
      for (let i = 0; i < matched.length; i += 1) {
        const { preset, file } = matched[i];
        setProgress(`Uploading ${i + 1}/${matched.length}: ${preset.title}`);
        const { url } = await api.upload(file);
        next = upsert(next, preset, url);
      }
      setProgress("Saving workshop proof…");
      await persist(next);
      toast.success(matched.length === 8 ? "All 8 workshop proof clips uploaded and saved." : `${matched.length} matching workshop clips uploaded and saved.`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Workshop video upload failed");
    } finally {
      setBusy(false);
      setProgress("");
      e.target.value = "";
    }
  };

  const uploadOne = async (preset, file) => {
    if (!file) return;
    setBusy(true);
    try {
      setProgress(`Uploading ${preset.title}…`);
      const { url } = await api.upload(file);
      await persist(upsert(clips || [], preset, url));
      toast.success(`${preset.title} uploaded and saved.`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Upload failed");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const removeOne = async (preset) => {
    setBusy(true);
    try {
      await persist((clips || []).filter((c) => c?.key !== preset.key));
      toast.success(`${preset.title} removed from the Craft page.`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Could not save change");
    } finally {
      setBusy(false);
    }
  };

  const uploadedCount = PRESETS.filter((p) => byKey[p.key]?.video_url).length;

  return (
    <section data-testid="admin-craft-proof" className="border border-[#D4AF37]/35 bg-[#0c0509] mb-5">
      <div className="p-5 border-b border-white/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" style={{ background: "linear-gradient(90deg, rgba(163,99,80,0.14), transparent)" }}>
        <div>
          <div className="eyebrow mb-1">Manufacturing Proof · The Craft</div>
          <div className="font-serif text-xl">Upload the approved Firozabad workshop evidence</div>
          <p className="text-xs text-white/50 mt-1">Choose all eight approved videos together. Their filenames are matched automatically, captions are already fixed, and the result saves directly to the public Craft page.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-white/55"><span className="text-[#D4AF37]">{uploadedCount}/8</span> uploaded</span>
          <label className={`inline-flex items-center gap-2 bg-[#D4AF37] text-black px-5 py-3 uppercase text-[10px] tracking-[0.22em] ${busy ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-[#B5952F]"}`}>
            <Upload size={13} /> {busy ? "Uploading…" : "Select all 8 videos"}
            <input type="file" accept="video/*" multiple disabled={busy} onChange={batchUpload} className="hidden" />
          </label>
        </div>
      </div>
      {progress && <div className="px-5 py-3 text-xs text-[#D4AF37] border-b border-white/10">{progress}</div>}
      <div className="p-5 grid md:grid-cols-2 gap-3">
        {PRESETS.map((preset, index) => {
          const clip = byKey[preset.key];
          const ready = !!clip?.video_url;
          return (
            <div key={preset.key} className="border border-white/10 p-4 bg-black/20 flex gap-4 items-start">
              <div className={`w-9 h-9 flex-shrink-0 border flex items-center justify-center ${ready ? "border-[#D4AF37]/60 text-[#D4AF37]" : "border-white/15 text-white/35"}`}>
                {ready ? <CheckCircle2 size={16} /> : <Video size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#D4AF37]">{String(index + 1).padStart(2, "0")}</div>
                <div className="font-serif text-lg mt-1">{preset.title}</div>
                <div className="text-[10px] text-white/35 mt-1 break-all">{preset.filename}</div>
                <p className="text-xs text-white/50 mt-2 leading-relaxed">{preset.caption}</p>
                {ready && <video src={api.resolveImage(clip.video_url)} controls preload="metadata" playsInline className="mt-3 w-full max-w-xs aspect-video bg-black object-contain border border-white/10" />}
                <div className="mt-3 flex gap-2 flex-wrap">
                  <label className={`inline-flex items-center gap-1.5 border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-widest ${busy ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-[#D4AF37]"}`}>
                    <Upload size={11} /> {ready ? "Replace" : "Upload"}
                    <input type="file" accept="video/*" disabled={busy} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; uploadOne(preset, f); e.target.value = ""; }} />
                  </label>
                  {ready && (
                    <button type="button" disabled={busy} onClick={() => removeOne(preset)} className="inline-flex items-center gap-1.5 border border-white/15 hover:border-red-500 hover:text-red-400 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/55 disabled:opacity-40">
                      <X size={11} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
