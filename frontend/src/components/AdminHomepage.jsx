import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Trash2, Upload } from "lucide-react";
import { api } from "../lib/api";
import { HOMEPAGE_DEFAULTS, mergeHomepage } from "../lib/homepageDefaults";
import { useSettings } from "../context/SettingsContext";

const SECTIONS = [
  { key: "hero", label: "Hero Section" },
  { key: "trusted_by", label: "Trusted By Strip" },
  { key: "collage", label: "1000+ Light Options" },
  { key: "featured", label: "Pieces of the Season" },
  { key: "google_reviews_fallback", label: "Google Reviews Fallback" },
  { key: "manual_reviews", label: "Manual Reviews / Testimonials" },
  { key: "about", label: "About Page" },
  { key: "craft", label: "The Craft Page" },
  { key: "reasons", label: "Reasons Why We Are Better" },
  { key: "atelier", label: "The Atelier Section" },
  { key: "footer", label: "Footer Content" },
];

// Reusable inputs -----
const Text = ({ label, value, onChange, "data-testid": tid, ...rest }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">{label}</span>
    <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} data-testid={tid} {...rest}
      className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2 text-sm text-white" />
  </label>
);

const TextArea = ({ label, value, onChange, rows = 4, "data-testid": tid }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">{label}</span>
    <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={rows} data-testid={tid}
      className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2 text-sm text-white resize-none" />
  </label>
);

const ImagePicker = ({ label, value, onChange, "data-testid": tid }) => {
  const [busy, setBusy] = useState(false);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await api.upload(file);
      onChange(url);
      toast.success("Uploaded");
    } catch { toast.error("Upload failed"); }
    finally { setBusy(false); e.target.value = ""; }
  };
  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">{label}</span>
      <div className="flex gap-2 items-start">
        {value && (
          <div className="relative w-16 h-16 border border-white/10 bg-black flex-shrink-0">
            <img src={api.resolveImage(value)} alt="" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="/path or https://..." data-testid={tid}
            className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2 text-xs text-white" />
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-1 border border-white/15 hover:border-[#D4AF37] px-3 py-1.5 text-[10px] uppercase tracking-widest cursor-pointer">
              <Upload size={11} /> {busy ? "Uploading…" : "Upload"}
              <input type="file" accept="image/*" onChange={upload} className="hidden" />
            </label>
            {value && (
              <button type="button" onClick={() => onChange("")} className="border border-white/15 hover:border-red-500 hover:text-red-400 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/60">Clear</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// List editor for arrays of objects (used for stats, reasons, atelier images, quick_links, hero trust) -----
function ListEditor({ items, onChange, fields, defaultItem, testId }) {
  const update = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const add = () => onChange([...(items || []), defaultItem]);
  return (
    <div className="space-y-3">
      {(items || []).map((it, i) => (
        <div key={i} className="border border-white/10 p-3 space-y-2 relative" data-testid={`${testId}-${i}`}>
          <button type="button" onClick={() => remove(i)} className="absolute top-2 right-2 text-white/40 hover:text-red-400" aria-label="Remove"><Trash2 size={12} /></button>
          {fields.map((f) => (
            f.type === "image" ? (
              <ImagePicker key={f.name} label={f.label} value={it[f.name]} onChange={(v) => update(i, { [f.name]: v })} data-testid={`${testId}-${i}-${f.name}`} />
            ) : f.type === "textarea" ? (
              <TextArea key={f.name} label={f.label} value={it[f.name]} onChange={(v) => update(i, { [f.name]: v })} data-testid={`${testId}-${i}-${f.name}`} />
            ) : (
              <Text key={f.name} label={f.label} value={it[f.name]} onChange={(v) => update(i, { [f.name]: v })} data-testid={`${testId}-${i}-${f.name}`}
                type={f.type || "text"} min={f.min} max={f.max} />
            )
          ))}
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 px-3 py-2 text-[10px] uppercase tracking-widest">
        <Plus size={11} /> Add
      </button>
    </div>
  );
}

// Section renderers -----
function SectionEditor({ sectionKey, data, patch }) {
  const set = (k, v) => patch({ ...data, [k]: v });
  switch (sectionKey) {
    case "hero":
      return (
        <div className="space-y-4">
          <Text label="Small label (eyebrow)" value={data.eyebrow} onChange={(v)=>set("eyebrow",v)} data-testid="hp-hero-eyebrow" />
          <Text label="Main headline (line 1)" value={data.headline_line1} onChange={(v)=>set("headline_line1",v)} data-testid="hp-hero-h1" />
          <Text label="Highlight (line 2, italic gradient)" value={data.headline_line2} onChange={(v)=>set("headline_line2",v)} data-testid="hp-hero-h2" />
          <TextArea label="Description" value={data.description} onChange={(v)=>set("description",v)} data-testid="hp-hero-desc" />
          <div className="grid grid-cols-2 gap-3">
            <Text label="Primary CTA text" value={data.primary_cta_text} onChange={(v)=>set("primary_cta_text",v)} data-testid="hp-hero-cta1" />
            <Text label="Primary CTA link" value={data.primary_cta_link} onChange={(v)=>set("primary_cta_link",v)} data-testid="hp-hero-cta1-link" />
            <Text label="Secondary CTA text" value={data.secondary_cta_text} onChange={(v)=>set("secondary_cta_text",v)} data-testid="hp-hero-cta2" />
            <Text label="Secondary CTA link (blank = WhatsApp)" value={data.secondary_cta_link} onChange={(v)=>set("secondary_cta_link",v)} data-testid="hp-hero-cta2-link" />
          </div>
          <div>
            <div className="eyebrow mb-2 mt-2">Trust points</div>
            <ListEditor items={data.trust || []} onChange={(v)=>set("trust",v)} defaultItem={{value:"",label:""}}
              fields={[{name:"value",label:"Value"},{name:"label",label:"Label"}]} testId="hp-hero-trust" />
          </div>
        </div>
      );
    case "trusted_by":
      return (
        <div className="space-y-4">
          <p className="text-[11px] text-white/40">This strip sits directly below the hero. It stays completely hidden on the site until you add at least one client/venue below.</p>
          <div className="grid grid-cols-2 gap-3">
            <Text label="Eyebrow label" value={data.eyebrow} onChange={(v)=>set("eyebrow",v)} data-testid="hp-trusted-eyebrow" />
            <Text label="Tagline (italic, optional)" value={data.tagline} onChange={(v)=>set("tagline",v)} data-testid="hp-trusted-tagline" />
          </div>
          <div>
            <div className="eyebrow mb-2 mt-2">Clients &amp; venues</div>
            <ListEditor items={data.items || []} onChange={(v)=>set("items",v)} defaultItem={{name:"",logo:""}}
              fields={[{name:"name",label:"Client / venue name"},{name:"logo",label:"Logo (optional, transparent PNG best)",type:"image"}]} testId="hp-trusted-item" />
          </div>
        </div>
      );
    case "collage":
      return (
        <div className="space-y-4">
          <Text label="Eyebrow" value={data.eyebrow} onChange={(v)=>set("eyebrow",v)} />
          <Text label="Title (gradient)" value={data.title} onChange={(v)=>set("title",v)} />
          <Text label="Highlight (white, appears on next line)" value={data.highlight} onChange={(v)=>set("highlight",v)} />
          <Text label="Subtitle (italic terracotta)" value={data.subtitle} onChange={(v)=>set("subtitle",v)} />
          <TextArea label="Description" value={data.description} onChange={(v)=>set("description",v)} />
          <div>
            <div className="eyebrow mb-2 mt-2">Stat cards (4 recommended)</div>
            <ListEditor items={data.stats || []} onChange={(v)=>set("stats",v)} defaultItem={{value:"",label:""}}
              fields={[{name:"value",label:"Value"},{name:"label",label:"Label"}]} testId="hp-collage-stat" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Text label="Primary CTA text" value={data.primary_cta_text} onChange={(v)=>set("primary_cta_text",v)} />
            <Text label="Primary CTA link" value={data.primary_cta_link} onChange={(v)=>set("primary_cta_link",v)} />
            <Text label="Secondary CTA text" value={data.secondary_cta_text} onChange={(v)=>set("secondary_cta_text",v)} />
            <Text label="Secondary CTA link (blank = WhatsApp)" value={data.secondary_cta_link} onChange={(v)=>set("secondary_cta_link",v)} />
          </div>
        </div>
      );
    case "featured":
      return (
        <div className="space-y-4">
          <Text label="Eyebrow" value={data.eyebrow} onChange={(v)=>set("eyebrow",v)} />
          <Text label="Section title" value={data.title} onChange={(v)=>set("title",v)} />
          <div className="grid grid-cols-2 gap-3">
            <Text label="View-all text" value={data.view_all_text} onChange={(v)=>set("view_all_text",v)} />
            <Text label="View-all link" value={data.view_all_link} onChange={(v)=>set("view_all_link",v)} />
          </div>
          <Text label="Max cards to show" type="number" value={data.limit} onChange={(v)=>set("limit", parseInt(v)||8)} />
          <p className="text-[11px] text-white/40">Which products appear is controlled by the &quot;Featured&quot; toggle on each product (Admin → Products → Edit).</p>
        </div>
      );
    case "google_reviews_fallback":
      return (
        <div className="space-y-4">
          <p className="text-[11px] text-white/40">These only render if the live Places API is not configured. Once Place ID + API key are set in Settings, live reviews replace these.</p>
          <div className="grid grid-cols-2 gap-3">
            <Text label="Fallback rating (e.g. 4.8)" value={data.fallback_rating} onChange={(v)=>set("fallback_rating",v)} />
            <Text label="Fallback review count" value={data.fallback_total} onChange={(v)=>set("fallback_total",v)} />
          </div>
          <Text label="Write-review URL override (optional)" value={data.write_review_override} onChange={(v)=>set("write_review_override",v)} />
        </div>
      );
    case "manual_reviews":
      return (
        <div className="space-y-4">
          <p className="text-[11px] text-white/40">
            Add hand-picked customer testimonials here. They appear in the same slider on the homepage alongside live Google reviews (your curated ones show first). Great for reviews you received on WhatsApp, email, or before Google reviews existed.
          </p>
          <div>
            <div className="eyebrow mb-2 mt-2">Testimonials</div>
            <ListEditor
              items={data.items || []}
              onChange={(v)=>set("items",v)}
              defaultItem={{author_name:"", rating:5, text:"", relative_time_description:""}}
              testId="hp-manual-review"
              fields={[
                {name:"author_name", label:"Customer name"},
                {name:"rating", label:"Rating (1–5)", type:"number", min:1, max:5},
                {name:"relative_time_description", label:"When (e.g. Last week, 2 months ago) — optional"},
                {name:"text", label:"Review text", type:"textarea"},
              ]}
            />
          </div>
        </div>
      );
    case "about": {
      const founder = data.founder || {};
      const setFounder = (k, v) => set("founder", { ...founder, [k]: v });
      return (
        <div className="space-y-4">
          <p className="text-[11px] text-white/40">Controls the <span className="text-white/70">/about</span> page — hero, story, founder callout, stats and the closing CTA.</p>

          <div className="eyebrow mb-1 mt-4">Hero</div>
          <Text label="Eyebrow" value={data.eyebrow} onChange={(v)=>set("eyebrow",v)} data-testid="hp-about-eyebrow" />
          <div className="grid grid-cols-2 gap-3">
            <Text label="Title (white part)" value={data.title_pre} onChange={(v)=>set("title_pre",v)} data-testid="hp-about-title-pre" />
            <Text label="Title (gold gradient part)" value={data.title_highlight} onChange={(v)=>set("title_highlight",v)} data-testid="hp-about-title-highlight" />
          </div>
          <TextArea label="Tagline (italic, copper)" value={data.tagline} onChange={(v)=>set("tagline",v)} rows={2} data-testid="hp-about-tagline" />

          <div className="eyebrow mb-1 mt-6">Story paragraphs</div>
          <ListEditor items={data.story_paragraphs || []} onChange={(v)=>set("story_paragraphs",v)}
            defaultItem={{text:""}}
            fields={[{name:"text", label:"Paragraph", type:"textarea"}]}
            testId="hp-about-para" />

          <div className="eyebrow mb-1 mt-6">Founder callout</div>
          <div className="grid grid-cols-2 gap-3">
            <Text label="Eyebrow" value={founder.eyebrow} onChange={(v)=>setFounder("eyebrow",v)} data-testid="hp-about-founder-eyebrow" />
            <Text label="Circle initial (1 letter)" value={founder.initial} onChange={(v)=>setFounder("initial",(v||"").slice(0,1))} data-testid="hp-about-founder-initial" />
          </div>
          <Text label="Founder name" value={founder.name} onChange={(v)=>setFounder("name",v)} data-testid="hp-about-founder-name" />
          <TextArea label="Founder description" value={founder.description} onChange={(v)=>setFounder("description",v)} rows={4} data-testid="hp-about-founder-desc" />

          <div className="eyebrow mb-1 mt-6">Stats (4 tiles)</div>
          <ListEditor items={data.stats || []} onChange={(v)=>set("stats",v)}
            defaultItem={{value:"", label:""}}
            fields={[{name:"value", label:"Value"}, {name:"label", label:"Label"}]}
            testId="hp-about-stat" />

          <div className="eyebrow mb-1 mt-6">Closing CTA</div>
          <Text label="Heading" value={data.cta_heading} onChange={(v)=>set("cta_heading",v)} data-testid="hp-about-cta-heading" />
          <div className="grid grid-cols-2 gap-3">
            <Text label="Primary CTA text" value={data.cta_primary_text} onChange={(v)=>set("cta_primary_text",v)} data-testid="hp-about-cta1" />
            <Text label="Primary CTA link" value={data.cta_primary_link} onChange={(v)=>set("cta_primary_link",v)} data-testid="hp-about-cta1-link" />
            <Text label="Secondary CTA text" value={data.cta_secondary_text} onChange={(v)=>set("cta_secondary_text",v)} data-testid="hp-about-cta2" />
            <Text label="Secondary CTA link" value={data.cta_secondary_link} onChange={(v)=>set("cta_secondary_link",v)} data-testid="hp-about-cta2-link" />
          </div>
        </div>
      );
    }
    case "craft":
      return (
        <div className="space-y-4">
          <p className="text-[11px] text-white/40">Controls the <span className="text-white/70">/craft</span> page — hero, the 5 process steps, closing quote, and CTAs. Icons for each step stay fixed (Design · Flame · Scissors · Wrench · Award) mapped by position.</p>

          <div className="eyebrow mb-1 mt-4">Hero</div>
          <Text label="Eyebrow" value={data.eyebrow} onChange={(v)=>set("eyebrow",v)} data-testid="hp-craft-eyebrow" />
          <div className="grid grid-cols-2 gap-3">
            <Text label="Headline (white)" value={data.headline_pre} onChange={(v)=>set("headline_pre",v)} data-testid="hp-craft-h1" />
            <Text label="Headline (gold italic)" value={data.headline_highlight} onChange={(v)=>set("headline_highlight",v)} data-testid="hp-craft-h2" />
          </div>
          <TextArea label="Intro paragraph" value={data.intro} onChange={(v)=>set("intro",v)} rows={3} data-testid="hp-craft-intro" />

          <div className="eyebrow mb-1 mt-6">Process steps (add / remove / reorder)</div>
          <ListEditor items={data.items || []} onChange={(v)=>set("items",v)}
            defaultItem={{num:"", kicker:"", title:"", body:""}}
            fields={[
              {name:"num", label:"Number label (e.g. 01)"},
              {name:"kicker", label:"Kicker caption (small caps)"},
              {name:"title", label:"Step title"},
              {name:"body", label:"Description", type:"textarea"},
            ]}
            testId="hp-craft-item" />

          <div className="eyebrow mb-1 mt-6">Closing quote</div>
          <Text label="Eyebrow above the quote" value={data.closer_eyebrow} onChange={(v)=>set("closer_eyebrow",v)} data-testid="hp-craft-closer-eyebrow" />
          <TextArea label="Founder quote" value={data.founder_quote} onChange={(v)=>set("founder_quote",v)} rows={3} data-testid="hp-craft-quote" />
          <Text label="Founder credit (e.g. — Mr. Sunil Kumar Agarwal, Founder)" value={data.founder_credit} onChange={(v)=>set("founder_credit",v)} data-testid="hp-craft-credit" />

          <div className="eyebrow mb-1 mt-6">Closing CTA</div>
          <div className="grid grid-cols-2 gap-3">
            <Text label="Primary CTA text" value={data.cta_primary_text} onChange={(v)=>set("cta_primary_text",v)} data-testid="hp-craft-cta1" />
            <Text label="Primary CTA link" value={data.cta_primary_link} onChange={(v)=>set("cta_primary_link",v)} data-testid="hp-craft-cta1-link" />
            <Text label="Secondary CTA text" value={data.cta_secondary_text} onChange={(v)=>set("cta_secondary_text",v)} data-testid="hp-craft-cta2" />
            <Text label="Secondary CTA link" value={data.cta_secondary_link} onChange={(v)=>set("cta_secondary_link",v)} data-testid="hp-craft-cta2-link" />
          </div>
        </div>
      );
    case "reasons":
      return (
        <div className="space-y-4">
          <Text label="Eyebrow" value={data.eyebrow} onChange={(v)=>set("eyebrow",v)} />
          <Text label="Section heading" value={data.heading} onChange={(v)=>set("heading",v)} />
          <div>
            <div className="eyebrow mb-2 mt-2">Reason cards</div>
            <ListEditor items={data.items || []} onChange={(v)=>set("items",v)} defaultItem={{title:"",body:""}}
              fields={[{name:"title",label:"Title"},{name:"body",label:"Description",type:"textarea"}]} testId="hp-reason" />
          </div>
        </div>
      );
    case "atelier":
      return (
        <div className="space-y-4">
          <Text label="Small label (eyebrow)" value={data.eyebrow} onChange={(v)=>set("eyebrow",v)} data-testid="hp-atelier-eyebrow" />
          <Text label="Headline" value={data.headline} onChange={(v)=>set("headline",v)} data-testid="hp-atelier-headline" />
          <TextArea label="Paragraph" value={data.paragraph} onChange={(v)=>set("paragraph",v)} rows={6} data-testid="hp-atelier-paragraph" />
          <div className="grid grid-cols-2 gap-3">
            <Text label="CTA text" value={data.cta_text} onChange={(v)=>set("cta_text",v)} data-testid="hp-atelier-cta" />
            <Text label="CTA link" value={data.cta_link} onChange={(v)=>set("cta_link",v)} data-testid="hp-atelier-cta-link" />
          </div>
          <div>
            <div className="eyebrow mb-2 mt-2">Showcase images (auto cross-fade every 6s)</div>
            <ListEditor items={data.images || []} onChange={(v)=>set("images",v)} defaultItem={{src:"",caption:""}}
              fields={[{name:"src",label:"Image",type:"image"},{name:"caption",label:"Caption / product name (shown as chip)"}]} testId="hp-atelier-img" />
          </div>
        </div>
      );
    case "footer":
      return (
        <div className="space-y-4">
          <TextArea label="Brand description" value={data.description} onChange={(v)=>set("description",v)} data-testid="hp-footer-desc" />
          <p className="text-[11px] text-white/40">Address, GSTIN, WhatsApp and Email are edited under Admin → Settings (they flow into the footer automatically).</p>
          <div>
            <div className="eyebrow mb-2 mt-2">Quick links</div>
            <ListEditor items={data.quick_links || []} onChange={(v)=>set("quick_links",v)} defaultItem={{label:"",href:""}}
              fields={[{name:"label",label:"Label"},{name:"href",label:"Link (URL or /path)"}]} testId="hp-footer-link" />
          </div>
        </div>
      );
    default: return null;
  }
}

// Main homepage editor -----
export default function AdminHomepage() {
  const { settings, refresh } = useSettings();
  const [state, setState] = useState(null);
  const [open, setOpen] = useState({ hero: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setState(mergeHomepage(settings.homepage_content));
  }, [settings]);

  if (!state) return <div className="text-white/50 text-sm py-12">Loading homepage content…</div>;

  const patchSection = (k) => (nextData) => setState({ ...state, [k]: nextData });

  const resetSection = (k) => {
    setState({ ...state, [k]: JSON.parse(JSON.stringify(HOMEPAGE_DEFAULTS[k])) });
    toast.success(`${SECTIONS.find(s=>s.key===k)?.label} reset — click Save to publish`);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSettings({ homepage_content: state });
      toast.success("Homepage saved — refresh the site to see changes");
      await refresh();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div data-testid="admin-homepage-editor" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-[#D4AF37]/30 p-5" style={{background:"linear-gradient(90deg, rgba(163,99,80,0.14), transparent)"}}>
        <div>
          <div className="eyebrow mb-1">Homepage Editor</div>
          <div className="font-serif text-xl">Edit every section of the homepage &amp; footer.</div>
          <div className="text-white/50 text-xs mt-1">Changes are live for all visitors as soon as you save.</div>
        </div>
        <button data-testid="hp-save-btn" onClick={save} disabled={saving} className="bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] disabled:opacity-60">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {SECTIONS.map(({ key, label }) => (
        <div key={key} className="border border-white/10" data-testid={`hp-section-${key}`}>
          <button type="button" onClick={() => setOpen({ ...open, [key]: !open[key] })}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02]">
            <div className="text-sm font-serif text-white">{label}</div>
            {open[key] ? <ChevronUp size={16} className="text-[#D4AF37]" /> : <ChevronDown size={16} className="text-white/50" />}
          </button>
          {open[key] && (
            <div className="border-t border-white/10 p-5">
              <SectionEditor sectionKey={key} data={state[key] || HOMEPAGE_DEFAULTS[key]} patch={patchSection(key)} />
              <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                <button type="button" onClick={() => resetSection(key)} className="text-[10px] uppercase tracking-widest text-white/40 hover:text-red-400">Reset section to defaults</button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="pt-4 flex justify-end">
        <button data-testid="hp-save-btn-bottom" onClick={save} disabled={saving} className="bg-[#D4AF37] text-black px-8 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] disabled:opacity-60">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
