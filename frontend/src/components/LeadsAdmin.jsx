import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CalendarClock, ChevronDown, ChevronUp, Mail, MessageCircle,
  Phone, Plus, RefreshCw, Save, Search, UserRound, UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatPrice } from "../lib/api";
import { gmailComposeUrl } from "../lib/gmailCompose";

const STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  quote_sent: "Quote Sent",
  won: "Won",
  lost: "Lost",
};

const SOURCE_LABELS = {
  website_cart: "Website cart",
  website_contact: "Contact form",
  whatsapp: "WhatsApp",
  google: "Google",
  instagram: "Instagram",
  pinterest: "Pinterest",
  referral: "Referral",
  walk_in: "Walk-in",
  manual: "Manual",
  other: "Other",
};

const inputClass = "w-full bg-[#080b0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2.5 text-sm";
const labelClass = "text-[10px] uppercase tracking-[0.22em] text-white/45 mb-1 block";
const OPEN_STATUSES = new Set(["new", "contacted", "qualified", "quote_sent"]);

const emptyManual = () => ({
  customer_name: "",
  mobile: "",
  email: "",
  city: "",
  source: "whatsapp",
  message: "",
  follow_up_at: "",
  assigned_to: "",
  high_value: false,
  estimated_value: "",
  requested_products: [{ name: "", sku: "", quantity: 1 }],
});

function localDateKey(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString();
}

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isOverdue(lead) {
  if (!lead.follow_up_at || !OPEN_STATUSES.has(lead.status)) return false;
  const due = new Date(lead.follow_up_at);
  return !Number.isNaN(due.getTime()) && due < new Date();
}

function isInactive(lead) {
  if (!OPEN_STATUSES.has(lead.status)) return false;
  const last = new Date(lead.last_activity_at || lead.created_at);
  return !Number.isNaN(last.getTime()) && Date.now() - last.getTime() > 14 * 86400000;
}

export default function LeadsAdmin() {
  const [report, setReport] = useState({ leads: [], summary: {}, statuses: Object.keys(STATUS_LABELS), sources: Object.keys(SOURCE_LABELS) });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [expandedId, setExpandedId] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [manual, setManual] = useState(emptyManual);
  const [noteDraft, setNoteDraft] = useState({});

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.adminLeads();
      setReport({
        leads: Array.isArray(data?.leads) ? data.leads : [],
        summary: data?.summary || {},
        statuses: Array.isArray(data?.statuses) ? data.statuses : Object.keys(STATUS_LABELS),
        sources: Array.isArray(data?.sources) ? data.sources : Object.keys(SOURCE_LABELS),
      });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const today = localDateKey();
    return report.leads
      .filter((lead) => !statusFilter || lead.status === statusFilter)
      .filter((lead) => {
        if (quickFilter === "today") return localDateKey(lead.follow_up_at) === today && OPEN_STATUSES.has(lead.status);
        if (quickFilter === "overdue") return isOverdue(lead);
        if (quickFilter === "inactive") return isInactive(lead);
        if (quickFilter === "high_value") return lead.high_value;
        if (quickFilter === "duplicates") return lead.possible_duplicate;
        return true;
      })
      .filter((lead) => {
        if (!needle) return true;
        const products = (lead.requested_products || []).map((item) => `${item.name || ""} ${item.sku || ""}`).join(" ");
        return [
          lead.customer_name, lead.mobile, lead.email, lead.city, lead.message,
          lead.assigned_to, SOURCE_LABELS[lead.source], products,
        ].join(" ").toLowerCase().includes(needle);
      })
      .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)));
  }, [report.leads, search, statusFilter, quickFilter]);

  const updateLead = async (leadId, patch, successMessage = "Lead updated") => {
    setBusyId(leadId);
    try {
      await api.adminUpdateLead(leadId, patch);
      toast.success(successMessage);
      await reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not update lead");
    } finally {
      setBusyId("");
    }
  };

  const addNote = async (leadId) => {
    const note = String(noteDraft[leadId] || "").trim();
    if (!note) return;
    setBusyId(leadId);
    try {
      await api.adminAddLeadNote(leadId, note);
      setNoteDraft((current) => ({ ...current, [leadId]: "" }));
      toast.success("Note added");
      await reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not add note");
    } finally {
      setBusyId("");
    }
  };

  const createLead = async (event) => {
    event.preventDefault();
    const products = manual.requested_products
      .filter((item) => item.name.trim() || item.sku.trim())
      .map((item) => ({ ...item, quantity: Math.max(1, Number(item.quantity) || 1) }));
    const payload = {
      ...manual,
      requested_products: products,
      follow_up_at: manual.follow_up_at ? new Date(manual.follow_up_at).toISOString() : null,
      estimated_value: manual.estimated_value === "" ? null : Number(manual.estimated_value),
    };
    setBusyId("new");
    try {
      await api.adminCreateLead(payload);
      setManual(emptyManual());
      setShowNew(false);
      toast.success("WhatsApp/manual lead added");
      await reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not create lead");
    } finally {
      setBusyId("");
    }
  };

  const setProduct = (index, key, value) => {
    setManual((current) => ({
      ...current,
      requested_products: current.requested_products.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
  };

  if (loading && report.leads.length === 0) {
    return <div data-testid="leads-loading" className="border border-white/10 p-12 text-center text-white/50">Loading the Leads workspace…</div>;
  }

  if (error && report.leads.length === 0) {
    return (
      <div data-testid="leads-error" role="alert" className="border border-[#a36350]/50 bg-[#2a1113]/40 p-8 text-center">
        <AlertTriangle className="mx-auto text-[#E5B579]" size={22} />
        <div className="font-serif text-xl mt-3">We couldn't load leads</div>
        <div className="text-white/55 text-sm mt-2">{error}</div>
        <button onClick={reload} className="mt-5 inline-flex items-center gap-2 border border-[#D4AF37] text-[#D4AF37] px-5 py-2 uppercase text-xs tracking-[0.2em]">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div data-testid="leads-workspace" className="space-y-6">
      <section className="border border-white/10 p-6 lg:p-8 bg-black/10">
        <div className="flex flex-wrap gap-5 items-start justify-between">
          <div>
            <div className="eyebrow">Sales workspace</div>
            <h2 className="font-serif text-3xl mt-2">Leads</h2>
            <p className="text-white/55 text-sm mt-2 max-w-2xl">
              Website enquiries, contact forms and WhatsApp/manual conversations in one follow-up pipeline.
            </p>
          </div>
          <button
            data-testid="new-lead-button"
            onClick={() => setShowNew((value) => !value)}
            className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-5 py-3 uppercase text-xs tracking-[0.22em]"
          >
            <Plus size={14} /> New WhatsApp lead
          </button>
        </div>
      </section>

      {showNew && (
        <form data-testid="new-lead-form" onSubmit={createLead} className="border border-[#D4AF37]/40 p-6 space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <div className="eyebrow text-[#D4AF37]">Quick capture</div>
              <h3 className="font-serif text-2xl mt-1">Add enquiry from WhatsApp or elsewhere</h3>
            </div>
            <button type="button" onClick={() => setShowNew(false)} className="text-white/50 hover:text-white">Close</button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <label><span className={labelClass}>Customer name *</span><input required value={manual.customer_name} onChange={(e) => setManual({ ...manual, customer_name: e.target.value })} className={inputClass} /></label>
            <label><span className={labelClass}>Mobile / WhatsApp</span><input value={manual.mobile} onChange={(e) => setManual({ ...manual, mobile: e.target.value })} className={inputClass} /></label>
            <label><span className={labelClass}>Email</span><input type="email" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} className={inputClass} /></label>
            <label><span className={labelClass}>City</span><input value={manual.city} onChange={(e) => setManual({ ...manual, city: e.target.value })} className={inputClass} /></label>
            <label><span className={labelClass}>Source</span>
              <select value={manual.source} onChange={(e) => setManual({ ...manual, source: e.target.value })} className={inputClass}>
                {report.sources.filter((source) => !source.startsWith("website_")).map((source) => <option key={source} value={source}>{SOURCE_LABELS[source] || source}</option>)}
              </select>
            </label>
            <label><span className={labelClass}>Follow-up</span><input type="datetime-local" value={manual.follow_up_at} onChange={(e) => setManual({ ...manual, follow_up_at: e.target.value })} className={inputClass} /></label>
            <label><span className={labelClass}>Assigned staff</span><input value={manual.assigned_to} onChange={(e) => setManual({ ...manual, assigned_to: e.target.value })} className={inputClass} /></label>
            <label><span className={labelClass}>Estimated value</span><input type="number" min="0" value={manual.estimated_value} onChange={(e) => setManual({ ...manual, estimated_value: e.target.value })} className={inputClass} /></label>
          </div>
          <div>
            <div className={labelClass}>Requested products</div>
            <div className="space-y-2">
              {manual.requested_products.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2">
                  <input placeholder="Product name" value={item.name} onChange={(e) => setProduct(index, "name", e.target.value)} className={`${inputClass} col-span-6`} />
                  <input placeholder="SKU" value={item.sku} onChange={(e) => setProduct(index, "sku", e.target.value)} className={`${inputClass} col-span-4`} />
                  <input aria-label="Quantity" type="number" min="1" value={item.quantity} onChange={(e) => setProduct(index, "quantity", e.target.value)} className={`${inputClass} col-span-2`} />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setManual((current) => ({ ...current, requested_products: [...current.requested_products, { name: "", sku: "", quantity: 1 }] }))} className="text-[#D4AF37] text-xs uppercase tracking-[0.18em] mt-2">+ Add another product</button>
          </div>
          <label><span className={labelClass}>Customer requirement / copied WhatsApp message</span><textarea rows={3} value={manual.message} onChange={(e) => setManual({ ...manual, message: e.target.value })} className={inputClass} /></label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={manual.high_value} onChange={(e) => setManual({ ...manual, high_value: e.target.checked })} className="accent-[#D4AF37]" /> Mark as high-value enquiry</label>
          <button disabled={busyId === "new"} className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-7 py-3 uppercase text-xs tracking-[0.22em] disabled:opacity-50">
            <Save size={14} /> Save lead
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ["Total", report.summary.total || 0],
          ["Open", report.summary.open || 0],
          ["Overdue", report.summary.overdue || 0],
          ["High value", report.summary.high_value || 0],
          ["Possible duplicates", report.summary.possible_duplicates || 0],
        ].map(([label, value]) => (
          <div key={label} className="border border-white/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45">{label}</div>
            <div className="font-serif text-2xl mt-2">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_190px] gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
          <input data-testid="leads-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, mobile, email, city, SKU or requirement…" className={`${inputClass} pl-11`} />
        </div>
        <select data-testid="leads-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="">All pipeline stages</option>
          {report.statuses.map((status) => <option key={status} value={status}>{STATUS_LABELS[status] || status}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["all", "All leads"],
          ["today", "Today's follow-ups"],
          ["overdue", "Overdue"],
          ["inactive", "Inactive 14+ days"],
          ["high_value", "High value"],
          ["duplicates", "Possible duplicates"],
        ].map(([key, label]) => (
          <button key={key} data-testid={`lead-filter-${key}`} onClick={() => setQuickFilter(key)}
            className={`px-4 py-2 border text-[11px] uppercase tracking-[0.18em] ${quickFilter === key ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/15 text-white/55"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="text-xs text-white/40">{filtered.length} of {report.leads.length} leads shown</div>

      {filtered.length === 0 && <div className="border border-white/10 p-12 text-center text-white/45">No leads match these filters.</div>}

      <div className="space-y-3">
        {filtered.map((lead) => {
          const digits = phoneDigits(lead.mobile);
          const expanded = expandedId === lead.id;
          const overdue = isOverdue(lead);
          const mailLink = gmailComposeUrl({ to: lead.email, subject: "Your enquiry to Samrat Glass Emporium" });
          return (
            <article key={lead.id} data-testid={`lead-${lead.id}`} className={`border p-5 lg:p-6 ${overdue ? "border-[#a36350]/70 bg-[#a36350]/[0.05]" : "border-white/10"}`}>
              <div className="grid lg:grid-cols-[1fr_200px_44px] gap-4 items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-xl">{lead.customer_name || "Unnamed customer"}</h3>
                    <span className="border border-white/20 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em]">{SOURCE_LABELS[lead.source] || lead.source}</span>
                    {lead.high_value && <span className="border border-[#D4AF37] text-[#D4AF37] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em]">High value</span>}
                    {lead.possible_duplicate && <span className="border border-[#E5B579] text-[#E5B579] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em]">Possible duplicate · {lead.duplicate_lead_ids.length}</span>}
                    {lead.needs_status_review && <span className="text-[10px] text-[#E5B579]">Legacy “closed” — choose Won or Lost when known</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55 mt-2">
                    {lead.mobile && <a href={`tel:${lead.mobile}`} className="inline-flex items-center gap-1 hover:text-[#D4AF37]"><Phone size={12} /> {lead.mobile}</a>}
                    {lead.email && <a href={mailLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[#D4AF37]"><Mail size={12} /> {lead.email}</a>}
                    {lead.city && <span>{lead.city}</span>}
                    {lead.assigned_to && <span className="inline-flex items-center gap-1"><UserRound size={12} /> {lead.assigned_to}</span>}
                  </div>
                  {(lead.requested_products || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {lead.requested_products.map((item, index) => (
                        <span key={index} className="bg-black/30 border border-white/10 px-2 py-1 text-xs">
                          {item.name || item.sku || "Product"}{item.sku && item.name ? ` · ${item.sku}` : ""} × {item.quantity || 1}
                        </span>
                      ))}
                    </div>
                  )}
                  {lead.message && <p className="text-sm text-white/65 mt-3 line-clamp-2 whitespace-pre-wrap">{lead.message}</p>}
                  <div className={`inline-flex items-center gap-1.5 mt-3 text-xs ${overdue ? "text-[#E5B579]" : "text-white/45"}`}>
                    <CalendarClock size={13} /> Follow-up: {formatDate(lead.follow_up_at)}
                  </div>
                  {lead.estimated_value != null && <div className="text-xs text-[#D4AF37] mt-1">Estimated {formatPrice(lead.estimated_value)}</div>}
                </div>
                <select value={lead.status} disabled={busyId === lead.id} onChange={(e) => updateLead(lead.id, { status: e.target.value }, `Moved to ${STATUS_LABELS[e.target.value]}`)} className={inputClass}>
                  {report.statuses.map((status) => <option key={status} value={status}>{STATUS_LABELS[status] || status}</option>)}
                </select>
                <button aria-label="Expand lead" onClick={() => setExpandedId(expanded ? "" : lead.id)} className="border border-white/15 h-11 flex items-center justify-center hover:border-[#D4AF37] hover:text-[#D4AF37]">
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {expanded && (
                <div className="border-t border-white/10 mt-5 pt-5 space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {digits && <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] text-black px-4 py-2 text-xs uppercase tracking-[0.16em]"><MessageCircle size={14} /> Open WhatsApp</a>}
                    {lead.mobile && <a href={`tel:${lead.mobile}`} className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em]"><Phone size={14} /> Call</a>}
                    {lead.email && <a href={mailLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em]"><Mail size={14} /> Email</a>}
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <label><span className={labelClass}>Source</span><select defaultValue={lead.source} onChange={(e) => updateLead(lead.id, { source: e.target.value })} className={inputClass}>{report.sources.map((source) => <option key={source} value={source}>{SOURCE_LABELS[source] || source}</option>)}</select></label>
                    <label><span className={labelClass}>City</span><input defaultValue={lead.city} onBlur={(e) => { if (e.target.value !== lead.city) updateLead(lead.id, { city: e.target.value }); }} className={inputClass} /></label>
                    <label><span className={labelClass}>Assigned staff</span><input defaultValue={lead.assigned_to} onBlur={(e) => { if (e.target.value !== lead.assigned_to) updateLead(lead.id, { assigned_to: e.target.value }); }} className={inputClass} /></label>
                    <label><span className={labelClass}>Follow-up</span><input type="datetime-local" defaultValue={toLocalInput(lead.follow_up_at)} onBlur={(e) => updateLead(lead.id, { follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className={inputClass} /></label>
                    <label><span className={labelClass}>Estimated value</span><input type="number" min="0" defaultValue={lead.estimated_value ?? ""} onBlur={(e) => updateLead(lead.id, { estimated_value: e.target.value === "" ? null : Number(e.target.value) })} className={inputClass} /></label>
                    <label className="flex items-end pb-3 gap-2 text-sm"><input type="checkbox" defaultChecked={lead.high_value} onChange={(e) => updateLead(lead.id, { high_value: e.target.checked })} className="accent-[#D4AF37]" /> High-value enquiry</label>
                  </div>

                  <div>
                    <div className={labelClass}>Qualification / commercial requirement</div>
                    <textarea defaultValue={lead.qualification} onBlur={(e) => { if (e.target.value !== lead.qualification) updateLead(lead.id, { qualification: e.target.value }); }} rows={2} className={inputClass} placeholder="Budget, project type, decision-maker, required date…" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3"><UsersRound size={15} className="text-[#D4AF37]" /><span className="text-xs uppercase tracking-[0.2em]">Conversation & notes</span></div>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {(lead.activities || []).slice().reverse().map((activity) => (
                        <div key={activity.id} className="border-l border-white/15 pl-3 py-1">
                          <div className="text-sm text-white/70 whitespace-pre-wrap">{activity.text}</div>
                          <div className="text-[10px] text-white/35 mt-1">{activity.by} · {formatDate(activity.at)} · {activity.type}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <textarea value={noteDraft[lead.id] || ""} onChange={(e) => setNoteDraft((current) => ({ ...current, [lead.id]: e.target.value }))} rows={2} placeholder="Add internal note…" className={inputClass} />
                      <button disabled={busyId === lead.id || !String(noteDraft[lead.id] || "").trim()} onClick={() => addNote(lead.id)} className="border border-[#D4AF37] text-[#D4AF37] px-5 text-xs uppercase tracking-[0.16em] disabled:opacity-40">Add note</button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
