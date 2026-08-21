import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { mergeHomepage } from "../lib/homepageDefaults";
import { useSettings } from "../context/SettingsContext";

const emptyProject = {
  title: "",
  location: "",
  note: "",
  images: [],
  products: [],
  project_type: "",
  space_type: "",
  client_type: "",
  customisation: "",
  completion_year: "",
  architect_designer: "",
  fixture_details: "",
};

const Field = ({ label, value, onChange, placeholder = "", type = "text" }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">{label}</span>
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2 text-sm text-white"
    />
  </label>
);

const Area = ({ label, value, onChange, placeholder = "", rows = 4 }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">{label}</span>
    <textarea
      value={value ?? ""}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2 text-sm text-white resize-none"
    />
  </label>
);

function ProductPicker({ value, onChange }) {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => { api.listAllProducts().then(setProducts).catch(() => {}); }, []);
  const selected = Array.isArray(value) ? value : [];
  const needle = q.trim().toLowerCase();
  const filtered = products.filter((p) => !needle || `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(needle));
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const validCount = selected.filter((id) => products.some((p) => p.id === id)).length;
  const orphanCount = products.length ? selected.length - validCount : 0;

  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">Linked catalogue products</span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by product name, SKU or category…"
        className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2 text-xs mb-2"
      />
      <div className="max-h-52 overflow-y-auto border border-white/10 divide-y divide-white/5 bg-[#0a0510]">
        {filtered.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button key={p.id} type="button" onClick={() => toggle(p.id)} className={`w-full flex items-center gap-3 px-3 py-2 text-left ${on ? "bg-[#D4AF37]/10" : "hover:bg-white/[0.02]"}`}>
              <span className={`w-3.5 h-3.5 border ${on ? "bg-[#D4AF37] border-[#D4AF37]" : "border-white/25"} flex items-center justify-center text-black text-[8px]`}>{on ? "✓" : ""}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm text-white">{p.name}</span>
                <span className="block text-[10px] uppercase tracking-widest text-white/40">{p.category} · {p.sku}</span>
              </span>
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="mt-1 text-[10px] uppercase tracking-widest text-[#D4AF37]">
          {products.length ? validCount : selected.length} linked
          {orphanCount > 0 && <span className="text-[#E5B579]"> · {orphanCount} orphaned</span>}
        </div>
      )}
    </div>
  );
}

function ImagePicker({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const images = Array.isArray(value) ? value : [];
  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    const added = [];
    let failed = 0;
    for (const file of files) {
      try {
        const res = await api.upload(file);
        if (res?.url) added.push(res.url);
      } catch { failed += 1; }
    }
    if (added.length) onChange([...images, ...added]);
    if (added.length) toast.success(`${added.length} project image${added.length === 1 ? "" : "s"} uploaded`);
    if (failed) toast.error(`${failed} image${failed === 1 ? "" : "s"} failed to upload`);
    setBusy(false);
    e.target.value = "";
  };
  const move = (i, delta) => {
    const j = i + delta;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">Project images</span>
      <p className="text-[11px] text-white/40 mb-2">The first image is the cover. Reorder instead of cropping the installation.</p>
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={`${src}-${i}`} className="relative w-24 h-24 bg-black border border-white/10 group">
            <img src={api.resolveImage(src)} alt="" className="w-full h-full object-contain" />
            {i === 0 && <span className="absolute top-0 left-0 bg-[#D4AF37] text-black text-[8px] uppercase tracking-widest px-1.5 py-0.5">Cover</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/75 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-25"><ArrowUp size={12} className="-rotate-90" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="p-1 disabled:opacity-25"><ArrowDown size={12} className="-rotate-90" /></button>
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} className="p-1 text-red-300"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
        <label className="w-24 h-24 border border-dashed border-white/20 hover:border-[#D4AF37] text-white/55 hover:text-[#D4AF37] flex flex-col items-center justify-center gap-1 cursor-pointer text-[9px] uppercase tracking-widest">
          <Upload size={14} /> {busy ? "Uploading…" : "Add images"}
          <input type="file" accept="image/*" multiple disabled={busy} onChange={upload} className="hidden" />
        </label>
      </div>
    </div>
  );
}

export default function AdminProjectGallery() {
  const { settings, refresh } = useSettings();
  const homepage = useMemo(() => mergeHomepage(settings?.homepage_content || {}), [settings]);
  const [gallery, setGallery] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [openProject, setOpenProject] = useState(0);

  useEffect(() => {
    setGallery({ ...homepage.gallery, items: (homepage.gallery?.items || []).map((p) => ({ ...emptyProject, ...p })) });
  }, [homepage]);

  if (!gallery) return <div className="text-white/50 text-sm py-12">Loading project gallery…</div>;

  const patchGallery = (key, value) => setGallery((g) => ({ ...g, [key]: value }));
  const patchProject = (index, key, value) => setGallery((g) => ({
    ...g,
    items: g.items.map((p, i) => i === index ? { ...p, [key]: value } : p),
  }));

  const featured = Array.isArray(gallery.home_featured_indices) ? gallery.home_featured_indices : [];
  const isOnHomepage = (index) => featured.length === 0 || featured.includes(index);
  const toggleHomepage = (index, checked) => {
    const all = gallery.items.map((_, i) => i);
    let next;
    if (featured.length === 0) next = checked ? [] : all.filter((i) => i !== index);
    else next = checked ? Array.from(new Set([...featured, index])) : featured.filter((i) => i !== index);
    patchGallery("home_featured_indices", next);
  };

  const addProject = () => {
    const nextIndex = gallery.items.length;
    patchGallery("items", [...gallery.items, { ...emptyProject }]);
    setOpenProject(nextIndex);
  };

  const moveProject = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= gallery.items.length) return;
    setGallery((g) => {
      const items = [...g.items];
      [items[index], items[target]] = [items[target], items[index]];
      const currentFeatured = Array.isArray(g.home_featured_indices) ? g.home_featured_indices : [];
      const homeFeatured = currentFeatured.map((i) => {
        if (i === index) return target;
        if (i === target) return index;
        return i;
      });
      return { ...g, items, home_featured_indices: homeFeatured };
    });
    setOpenProject((current) => {
      if (current === index) return target;
      if (current === target) return index;
      return current;
    });
  };

  const removeProject = (index) => {
    if (!window.confirm("Remove this project from the gallery?")) return;
    const items = gallery.items.filter((_, i) => i !== index);
    const nextFeatured = featured
      .filter((i) => i !== index)
      .map((i) => i > index ? i - 1 : i);
    setGallery((g) => ({ ...g, items, home_featured_indices: nextFeatured }));
    setOpenProject((current) => {
      if (!items.length) return -1;
      if (current === index) return Math.min(index, items.length - 1);
      return current > index ? current - 1 : current;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const current = mergeHomepage(settings?.homepage_content || {});
      await api.updateSettings({ homepage_content: { ...current, gallery } });
      toast.success("Project gallery saved");
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Save failed");
    } finally { setSaving(false); }
  };

  const cleanOrphans = async () => {
    setCleaning(true);
    try {
      const report = await api.adminGalleryCleanupOrphans();
      const n = report?.orphans_removed_total || 0;
      toast.success(n ? `Removed ${n} orphaned product link${n === 1 ? "" : "s"}` : "No orphaned product links found");
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Cleanup failed");
    } finally { setCleaning(false); }
  };

  return (
    <div className="space-y-6" data-testid="admin-project-gallery">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#D4AF37]/30 p-5" style={{ background: "linear-gradient(90deg, rgba(163,99,80,0.14), transparent)" }}>
        <div>
          <div className="eyebrow mb-1">Project Gallery</div>
          <h2 className="font-serif text-2xl">Client installations &amp; SEO case studies</h2>
          <p className="text-xs text-white/50 mt-1">One editor for the public gallery, richer project-page details, linked catalogue pieces and homepage visibility.</p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] disabled:opacity-50">
          {saving ? "Saving…" : "Save project gallery"}
        </button>
      </div>

      <section className="border border-white/10 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Gallery page header</div>
            <p className="text-[11px] text-white/40 mt-1">Controls the heading shown on /gallery.</p>
          </div>
          <button type="button" onClick={cleanOrphans} disabled={cleaning} className="border border-[#D4AF37]/40 hover:border-[#D4AF37] px-4 py-2 text-[10px] uppercase tracking-[0.22em] disabled:opacity-50">
            {cleaning ? "Cleaning…" : "Clean orphaned product links"}
          </button>
        </div>
        <Field label="Eyebrow" value={gallery.eyebrow} onChange={(v) => patchGallery("eyebrow", v)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title — white" value={gallery.title_pre} onChange={(v) => patchGallery("title_pre", v)} />
          <Field label="Title — gold italic" value={gallery.title_highlight} onChange={(v) => patchGallery("title_highlight", v)} />
        </div>
        <Area label="Tagline" value={gallery.tagline} onChange={(v) => patchGallery("tagline", v)} rows={2} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Projects</div>
            <p className="text-[11px] text-white/40 mt-1">Each project has its own clearly separated card. Open one project at a time and use the arrow controls to reorder safely.</p>
          </div>
          <button type="button" onClick={addProject} className="inline-flex items-center gap-2 border border-[#D4AF37]/50 hover:border-[#D4AF37] text-[#D4AF37] px-4 py-2 text-[10px] uppercase tracking-[0.22em]"><Plus size={12} /> Add project</button>
        </div>

        {gallery.items.length === 0 && <div className="border border-dashed border-white/15 p-8 text-center text-sm text-white/45">No projects yet. Add the first client installation.</div>}

        <div className="space-y-5">
          {gallery.items.map((project, index) => {
            const isOpen = openProject === index;
            const imageCount = Array.isArray(project.images) ? project.images.length : 0;
            const productCount = Array.isArray(project.products) ? project.products.length : 0;
            return (
              <article
                key={index}
                className={`overflow-hidden border-2 ${isOpen ? "border-[#D4AF37]/70 bg-[#160B10]" : "border-white/15 bg-black/20"}`}
                data-testid={`project-editor-${index}`}
              >
                <div className={`flex flex-wrap items-center gap-3 px-4 py-4 md:px-5 ${isOpen ? "bg-[#D4AF37]/10" : "bg-white/[0.025]"}`}>
                  <button
                    type="button"
                    onClick={() => setOpenProject(isOpen ? -1 : index)}
                    className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center border font-serif text-lg ${isOpen ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/20 text-white/65"}`}>
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-lg md:text-xl text-white">{project.title || "Untitled project"}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-white/45">
                        <span>{project.location || "Location not set"}</span>
                        {project.project_type && <span>· {project.project_type}</span>}
                        <span>· {imageCount} image{imageCount === 1 ? "" : "s"}</span>
                        <span>· {productCount} product{productCount === 1 ? "" : "s"}</span>
                      </span>
                    </span>
                    {isOpen ? <ChevronUp size={18} className="shrink-0 text-[#D4AF37]" /> : <ChevronDown size={18} className="shrink-0 text-white/45" />}
                  </button>

                  <div className="ml-auto flex items-center gap-1 border-l border-white/10 pl-3">
                    <button type="button" onClick={() => moveProject(index, -1)} disabled={index === 0} className="p-2 text-white/55 hover:text-[#D4AF37] disabled:opacity-20" aria-label={`Move project ${index + 1} up`} title="Move project up"><ArrowUp size={15} /></button>
                    <button type="button" onClick={() => moveProject(index, 1)} disabled={index === gallery.items.length - 1} className="p-2 text-white/55 hover:text-[#D4AF37] disabled:opacity-20" aria-label={`Move project ${index + 1} down`} title="Move project down"><ArrowDown size={15} /></button>
                    <button type="button" onClick={() => removeProject(index)} className="p-2 text-white/40 hover:text-red-400" aria-label="Remove project" title="Remove project"><Trash2 size={15} /></button>
                  </div>
                </div>

                {isOpen && (
                  <div className="space-y-5 border-t border-[#D4AF37]/20 p-5 md:p-6">
                    <div className="rounded-sm border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/45">
                      Editing Project {index + 1} · {project.location || "Location not set"}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Project title" value={project.title} onChange={(v) => patchProject(index, "title", v)} placeholder="e.g. Noorvastra Darbar Crystal Chandelier — Mumbai Residence" />
                      <Field label="Location" value={project.location} onChange={(v) => patchProject(index, "location", v)} placeholder="e.g. Mumbai, Maharashtra" />
                    </div>
                    <Area label="Project story" value={project.note} onChange={(v) => patchProject(index, "note", v)} placeholder="Describe the real installation, client requirement and result." rows={5} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                      <Field label="Project type" value={project.project_type} onChange={(v) => patchProject(index, "project_type", v)} placeholder="e.g. Residential installation" />
                      <Field label="Space type" value={project.space_type} onChange={(v) => patchProject(index, "space_type", v)} placeholder="e.g. Double-height living room" />
                      <Field label="Client type" value={project.client_type} onChange={(v) => patchProject(index, "client_type", v)} placeholder="e.g. Private residential client" />
                      <Field label="Customisation" value={project.customisation} onChange={(v) => patchProject(index, "customisation", v)} placeholder="e.g. Chrome finish customised to gold" />
                      <Field label="Completion year" value={project.completion_year} onChange={(v) => patchProject(index, "completion_year", v)} placeholder="e.g. 2026" />
                      <Field label="Architect / Interior Designer" value={project.architect_designer} onChange={(v) => patchProject(index, "architect_designer", v)} placeholder="Leave blank when none" />
                    </div>
                    <Area label="Fixture details" value={project.fixture_details} onChange={(v) => patchProject(index, "fixture_details", v)} placeholder="e.g. Twelve-light, two-tier chandelier; custom gold finish; special mounting notes." rows={3} />

                    <ImagePicker value={project.images} onChange={(v) => patchProject(index, "images", v)} />
                    <ProductPicker value={project.products} onChange={(v) => patchProject(index, "products", v)} />

                    <div className="pt-4 border-t border-white/10">
                      <label className="flex items-start gap-3 text-sm text-white/80">
                        <input type="checkbox" className="mt-1" checked={isOnHomepage(index)} onChange={(e) => toggleHomepage(index, e.target.checked)} />
                        <span>
                          Show this project in the homepage gallery carousel
                          <span className="block text-[11px] text-white/40 mt-1">This controls only homepage placement; the project remains on /gallery either way.</span>
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="border border-white/10 p-5 space-y-4">
        <div>
          <div className="eyebrow">Homepage carousel behaviour</div>
          <p className="text-[11px] text-white/40 mt-1">These controls only affect the “Our Work in the Wild” carousel on the homepage.</p>
        </div>
        <label className="flex items-center gap-3 text-sm text-white/80">
          <input type="checkbox" checked={gallery.home_randomize !== false} onChange={(e) => patchGallery("home_randomize", e.target.checked)} />
          Randomize project order on every page load
        </label>
        <label className="flex items-center gap-3 text-sm text-white/80">
          <input type="checkbox" checked={gallery.home_autoplay !== false} onChange={(e) => patchGallery("home_autoplay", e.target.checked)} />
          Auto-slide every 4.5 seconds
        </label>
        <label className="block max-w-xs">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">Projects per slide — desktop</span>
          <select value={String(gallery.home_per_view || 3)} onChange={(e) => patchGallery("home_per_view", Number(e.target.value))} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm">
            <option value="3">3 — one row</option>
            <option value="6">6 — two rows</option>
            <option value="9">9 — three rows</option>
          </select>
        </label>
        {featured.length > 0 && (
          <button type="button" onClick={() => patchGallery("home_featured_indices", [])} className="text-[10px] uppercase tracking-[0.22em] text-[#D4AF37] hover:text-[#E0C15D]">Reset homepage to show all projects</button>
        )}
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="bg-[#D4AF37] text-black px-8 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] disabled:opacity-50">
          {saving ? "Saving…" : "Save project gallery"}
        </button>
      </div>
    </div>
  );
}
