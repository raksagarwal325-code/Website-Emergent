import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { mergeHomepage } from "../lib/homepageDefaults";
import { useSettings } from "../context/SettingsContext";

const FIELDS = [
  ["project_type", "Project type", "e.g. Residential installation"],
  ["space_type", "Space type", "e.g. Double-height living room"],
  ["client_type", "Client type", "e.g. Private residential client"],
  ["customisation", "Customisation", "e.g. Chrome finish customised to gold"],
  ["completion_year", "Completion year", "e.g. 2026"],
  ["architect_designer", "Architect / Interior Designer", "Leave blank when none"],
];

const Input = ({ label, value, placeholder, onChange }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">{label}</span>
    <input
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2 text-sm text-white"
    />
  </label>
);

export default function AdminProjectCaseStudies() {
  const { settings, refresh } = useSettings();
  const homepage = useMemo(() => mergeHomepage(settings?.homepage_content || {}), [settings]);
  const projects = homepage.gallery?.items || [];
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projects.length) {
      setSelected(0);
      setDraft(null);
      return;
    }
    const safeIndex = Math.min(selected, projects.length - 1);
    if (safeIndex !== selected) setSelected(safeIndex);
    setDraft({ ...projects[safeIndex] });
  }, [settings, projects.length, selected]);

  if (!projects.length) return null;
  if (!draft) return null;

  const featured = Array.isArray(homepage.gallery?.home_featured_indices)
    ? homepage.gallery.home_featured_indices
    : [];
  const usesAutomaticAll = featured.length === 0;
  const showOnHome = usesAutomaticAll || featured.includes(selected);

  const patch = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const current = mergeHomepage(settings?.homepage_content || {});
      const items = [...(current.gallery?.items || [])];
      items[selected] = { ...items[selected], ...draft };
      const next = {
        ...current,
        gallery: {
          ...current.gallery,
          items,
        },
      };
      await api.updateSettings({ homepage_content: next });
      toast.success("Project case-study details saved");
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const setHomepageVisibility = async (checked) => {
    setSaving(true);
    try {
      const current = mergeHomepage(settings?.homepage_content || {});
      const items = current.gallery?.items || [];
      const currentFeatured = Array.isArray(current.gallery?.home_featured_indices)
        ? current.gallery.home_featured_indices
        : [];
      let nextFeatured;
      if (currentFeatured.length === 0) {
        nextFeatured = checked ? [] : items.map((_, i) => i).filter((i) => i !== selected);
      } else {
        nextFeatured = checked
          ? Array.from(new Set([...currentFeatured, selected]))
          : currentFeatured.filter((i) => i !== selected);
      }
      const next = {
        ...current,
        gallery: {
          ...current.gallery,
          home_featured_indices: nextFeatured,
        },
      };
      await api.updateSettings({ homepage_content: next });
      toast.success(checked ? "Project added to homepage carousel" : "Project removed from homepage carousel");
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const resetHomepageToAll = async () => {
    setSaving(true);
    try {
      const current = mergeHomepage(settings?.homepage_content || {});
      await api.updateSettings({
        homepage_content: {
          ...current,
          gallery: { ...current.gallery, home_featured_indices: [] },
        },
      });
      toast.success("Homepage carousel reset to show all projects");
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border border-[#D4AF37]/25 bg-black/20 p-5 md:p-6" data-testid="admin-project-case-study-fields">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="eyebrow mb-1">Project case-study details</div>
          <h2 className="font-serif text-xl md:text-2xl">Add the richer information used on project pages.</h2>
          <p className="text-xs text-white/45 mt-2 max-w-2xl">These fields feed Project at a Glance and the richer case-study sections. Leave anything unknown blank.</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-[#D4AF37] text-black px-5 py-2.5 uppercase text-[10px] tracking-[0.24em] hover:bg-[#B5952F] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save project details"}
        </button>
      </div>

      <label className="block mb-5">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">Choose project</span>
        <select
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
          className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2 text-sm text-white"
        >
          {projects.map((p, i) => (
            <option key={i} value={i}>{p.title || `Project ${i + 1}`}{p.location ? ` — ${p.location}` : ""}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(([key, label, placeholder]) => (
          <Input key={key} label={label} value={draft[key]} placeholder={placeholder} onChange={(v) => patch(key, v)} />
        ))}
      </div>

      <label className="block mt-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">Fixture details</span>
        <textarea
          value={draft.fixture_details || ""}
          onChange={(e) => patch("fixture_details", e.target.value)}
          rows={4}
          placeholder="Useful technical or project notes, e.g. twelve-light, two-tier chandelier; custom finish; special mounting notes."
          className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2 text-sm text-white resize-none"
        />
      </label>

      <div className="mt-6 pt-5 border-t border-white/10">
        <div className="eyebrow mb-2">Homepage attachment</div>
        <label className="flex items-start gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={showOnHome}
            disabled={saving}
            onChange={(e) => setHomepageVisibility(e.target.checked)}
            className="mt-1"
          />
          <span>
            Show this project in the homepage gallery carousel
            <span className="block text-[11px] text-white/40 mt-1">
              {usesAutomaticAll
                ? "Homepage is currently in automatic mode, so all projects are included."
                : "Homepage is using a selected-project list."}
            </span>
          </span>
        </label>
        {!usesAutomaticAll && (
          <button
            type="button"
            onClick={resetHomepageToAll}
            disabled={saving}
            className="mt-3 text-[10px] uppercase tracking-[0.22em] text-[#D4AF37] hover:text-[#E0C15D] disabled:opacity-50"
          >
            Reset homepage to show all projects
          </button>
        )}
      </div>
    </section>
  );
}
