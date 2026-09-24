import React, { useEffect, useMemo, useState } from "react";
import { Download, History, LoaderCircle, MessageCircle, Save, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { createQuotationPdf } from "../lib/quotationPdf";

export { createQuotationPdf } from "../lib/quotationPdf";

const money = (value) => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0,
  maximumFractionDigits: 2,
});

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(row => `${(row.loc || []).slice(1).join(" / ")}: ${row.msg || "Invalid value"}`).join("; ");
  return error?.message || fallback;
};

const createLocalId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const REFERENCE_CATEGORIES = [
  ["shade_design", "Shade design", "SD"],
  ["metal_finish", "Metal finish", "MF"],
  ["crystal_arrangement", "Crystal arrangement", "CR"],
  ["body_design", "Body design", "BD"],
  ["dimensions", "Dimensions", "DM"],
  ["other", "Other reference", "RF"],
];
const MATCHING_COMPONENTS = [
  ["glass_arms", "Glass arm(s)"],
  ["crystal_bobeche", "Crystal bobeche"],
  ["crystal_drops", "Crystal drops"],
  ["metal_finish", "Coordinated metal finish"],
];
const normaliseItem = (item = {}) => ({
  product_id: item.product_id || null,
  line_id: item.line_id || createLocalId("line"),
  name: item.name || "",
  sku: item.sku || "",
  quantity: item.quantity || 1,
  unit_price: item.unit_price ?? item.price ?? 0,
  image: item.image || null,
  is_custom: Boolean(item.is_custom),
  body_basis: item.body_basis || "product",
  body_reference_line_id: item.body_reference_line_id || null,
  matching_components: Array.isArray(item.matching_components) ? item.matching_components : [],
  customisation_notes: item.customisation_notes || "",
  approval_required: Boolean(item.approval_required),
});

const initialForm = (inquiry) => ({
  customer_name: inquiry.customer_name || "",
  customer_email: inquiry.customer_email || "",
  customer_phone: inquiry.customer_phone || "",
  billing_address: "",
  shipping_address: "",
  customer_gstin: "",
  items: (inquiry.items || []).map(normaliseItem),
  design_references: (inquiry.design_references || []).map((reference) => ({
    id: reference.id || createLocalId("reference"),
    code: reference.code || "RF-01",
    category: reference.category || "other",
    title: reference.title || "",
    image: reference.image || null,
    applies_to: Array.isArray(reference.applies_to) ? reference.applies_to : [],
    use_details: reference.use_details || "",
    exclude_details: reference.exclude_details || "",
  })),
  discount: 0,
  shipping: 0,
  tax_rate: 0,
  validity_days: 15,
  terms: "",
  notes: "",
});
const quotationForm = (source = {}) => {
  const base = initialForm(source);
  return {
    ...base,
    ...source,
    items: base.items,
    design_references: base.design_references,
    customer_email: source.customer_email || "",
  };
};

export default function InquiryQuotationBuilder({ inquiry = {}, onClose, onSaved }) {
  const draftKey = `quotation-draft:${inquiry.id || "standalone"}`;
  const [draft] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(draftKey) || "null"); } catch { return null; }
  });
  const [form, setForm] = useState(() => quotationForm(draft?.form || inquiry));
  const [editingId, setEditingId] = useState(draft?.editingId || null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify({ form, editingId })); } catch { /* Storage may be unavailable. */ }
  }, [draftKey, form, editingId]);
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [savedQuote, setSavedQuote] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [catalogue, setCatalogue] = useState([]);
  const [search, setSearch] = useState("");
  const [aiReferenceImage, setAiReferenceImage] = useState(null);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiDraft, setAiDraft] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    api.adminProductsExport().then(rows => { if (alive) setCatalogue(Array.isArray(rows) ? rows : rows.items || []); }).catch(() => toast.error("Could not load catalogue; you can still add a custom item"));
    return () => { alive = false; };
  }, []);
  const addItem = (product = {}) => change({ items: [...form.items, normaliseItem({ product_id: product.id || null, name: product.name || "", sku: product.sku || "", quantity: 1, unit_price: product.price || 0, image: product.images?.[0] || null })] });

  useEffect(() => {
    let alive = true;
    (inquiry.id ? api.listInquiryQuotations(inquiry.id) : api.listStandaloneQuotations())
      .then((rows) => { if (alive) setSavedQuotes(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (alive) toast.error("Could not load earlier quotations"); })
      .finally(() => { if (alive) setLoadingHistory(false); });
    return () => { alive = false; };
  }, [inquiry.id]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + numberValue(item.quantity) * numberValue(item.unit_price), 0);
    const taxable = Math.max(0, subtotal - numberValue(form.discount) + numberValue(form.shipping));
    const tax = taxable * numberValue(form.tax_rate) / 100;
    return { subtotal, tax, total: taxable + tax };
  }, [form]);

  const change = (patch) => { setSavedQuote(null); setForm((current) => ({ ...current, ...patch })); };
  const changeItem = (index, patch) => {
    setSavedQuote(null);
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };
  const removeItem = (index) => {
    setSavedQuote(null);
    setForm((current) => {
      const removed = current.items[index];
      return {
        ...current,
        items: current.items.filter((_, itemIndex) => itemIndex !== index).map((item) => (
          item.body_reference_line_id === removed?.line_id
            ? { ...item, body_basis: "drawing_pending", body_reference_line_id: null, approval_required: true }
            : item
        )),
        design_references: current.design_references.map((reference) => ({
          ...reference,
          applies_to: reference.applies_to.filter((lineId) => lineId !== removed?.line_id),
        })).filter((reference) => reference.applies_to.length),
      };
    });
  };

  const nextReferenceCode = (category = "shade_design") => {
    const prefix = REFERENCE_CATEGORIES.find(([value]) => value === category)?.[2] || "RF";
    const used = new Set(form.design_references.map((reference) => reference.code));
    let sequence = 1;
    while (used.has(`${prefix}-${String(sequence).padStart(2, "0")}`)) sequence += 1;
    return `${prefix}-${String(sequence).padStart(2, "0")}`;
  };
  const addReference = () => change({
    design_references: [...form.design_references, {
      id: createLocalId("reference"),
      code: nextReferenceCode("shade_design"),
      category: "shade_design",
      title: "Hand-cut glass-shade design",
      image: null,
      applies_to: form.items.map((item) => item.line_id),
      use_details: "",
      exclude_details: "",
    }],
  });
  const changeReference = (index, patch) => {
    setSavedQuote(null);
    setForm((current) => ({
      ...current,
      design_references: current.design_references.map((reference, referenceIndex) => referenceIndex === index ? { ...reference, ...patch } : reference),
    }));
  };
  const removeReference = (index) => change({ design_references: form.design_references.filter((_, referenceIndex) => referenceIndex !== index) });

  const save = async () => {
    if (!form.customer_name.trim() || !form.items.length || form.items.some((item) => !item.name.trim())) {
      toast.error("Customer name and at least one complete product are required");
      return null;
    }
    const invalidMatch = form.items.find((item) => item.is_custom && item.body_basis === "match_item" && !item.body_reference_line_id);
    if (invalidMatch) {
      toast.error(`Choose the product body that ${invalidMatch.name || "the custom item"} should match`);
      return null;
    }
    const invalidReference = form.design_references.find((reference) => !reference.code.trim() || !reference.title.trim() || !reference.applies_to.length);
    if (invalidReference) {
      toast.error("Every design reference needs a code, title and at least one applicable product");
      return null;
    }
    if (numberValue(form.discount) > totals.subtotal) {
      toast.error("Discount cannot exceed the product subtotal");
      return null;
    }
    setSaving(true);
    try {
      const create = editingId ? (data) => api.updateQuotation(editingId, data) : inquiry.id ? (data) => api.createInquiryQuotation(inquiry.id, data) : api.createStandaloneQuotation;
      const quote = await create({
        ...form,
        items: form.items.map((item) => ({
          ...item,
          quantity: Math.max(1, Math.round(numberValue(item.quantity))),
          unit_price: numberValue(item.unit_price),
        })),
        discount: numberValue(form.discount),
        shipping: numberValue(form.shipping),
        tax_rate: numberValue(form.tax_rate),
        validity_days: Math.max(1, Math.round(numberValue(form.validity_days))),
      });
      setForm(quotationForm(quote));
      setSavedQuote(quote);
      setEditingId(quote.id);
      setSavedQuotes((current) => [quote, ...current.filter((row) => row.id !== quote.id)]);
      onSaved?.(quote);
      toast.success(`Quotation ${quote.quote_number} saved`);
      return quote;
    } catch (error) {
      toast.error(errorMessage(error, "Could not save quotation"));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const editQuote = (quote) => {
    setForm(quotationForm(quote));
    setEditingId(quote.id);
    setSavedQuote(quote);
    setHistoryOpen(false);
  };
  const deleteQuote = async (quote) => {
    if (!window.confirm(`Delete quotation ${quote.quote_number}? This cannot be undone.`)) return;
    setDeletingId(quote.id);
    try {
      await api.deleteQuotation(quote.id);
      setSavedQuotes((current) => current.filter((row) => row.id !== quote.id));
      if (editingId === quote.id) {
        setForm(quotationForm(inquiry));
        setEditingId(null);
        setSavedQuote(null);
      }
      toast.success(`Quotation ${quote.quote_number} deleted`);
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete quotation"));
    } finally {
      setDeletingId(null);
    }
  };
  const uploadImage = async (index, file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error("Choose a JPG, PNG or WebP image"); return; }
    setUploading(true);
    try {
      const result = await api.upload(file);
      changeItem(index, { image: result.url });
    } catch (error) { toast.error(errorMessage(error, "Could not upload image")); }
    finally { setUploading(false); }
  };
  const uploadReferenceImage = async (index, file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error("Choose a JPG, PNG or WebP image"); return; }
    setUploading(true);
    try {
      const result = await api.upload(file);
      changeReference(index, { image: result.url });
    } catch (error) { toast.error(errorMessage(error, "Could not upload reference image")); }
    finally { setUploading(false); }
  };

  const uploadAiReference = async (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error("Choose a JPG, PNG or WebP image"); return; }
    setUploading(true);
    setAiDraft(null);
    try {
      const result = await api.upload(file);
      setAiReferenceImage(result.url);
    } catch (error) { toast.error(errorMessage(error, "Could not upload reference image")); }
    finally { setUploading(false); }
  };

  const analyseCustomisation = async () => {
    if (!aiReferenceImage) { toast.error("Upload the reference image first"); return; }
    if (aiInstruction.trim().length < 3) { toast.error("Tell the assistant what to use or change"); return; }
    if (!form.items.length || form.items.some((item) => !item.name.trim())) { toast.error("Add and name the quotation products first"); return; }
    setAiBusy(true);
    setAiDraft(null);
    try {
      const result = await api.aiQuotationCustomisation({
        image_url: aiReferenceImage,
        instruction: aiInstruction.trim(),
        items: form.items.map(({ line_id, name, sku }) => ({ line_id, name, sku: sku || null })),
      });
      setAiDraft(result.draft);
    } catch (error) { toast.error(errorMessage(error, "Could not analyse the reference")); }
    finally { setAiBusy(false); }
  };

  const applyAiDraft = () => {
    if (!aiDraft) return;
    setSavedQuote(null);
    setForm((current) => {
      const known = new Set(current.items.map((item) => item.line_id));
      const category = aiDraft.reference.category || "other";
      const prefix = REFERENCE_CATEGORIES.find(([value]) => value === category)?.[2] || "RF";
      const used = new Set(current.design_references.map((reference) => reference.code));
      let sequence = 1;
      while (used.has(`${prefix}-${String(sequence).padStart(2, "0")}`)) sequence += 1;
      const code = `${prefix}-${String(sequence).padStart(2, "0")}`;
      const updates = new Map(aiDraft.item_updates.map((item) => [item.line_id, item]));
      return {
        ...current,
        items: current.items.map((item) => {
          const update = updates.get(item.line_id);
          if (!update) return item;
          return {
            ...item,
            name: update.suggested_name?.trim() || item.name,
            is_custom: true,
            body_basis: update.body_basis,
            body_reference_line_id: update.body_reference_line_id || null,
            matching_components: update.matching_components || [],
            customisation_notes: update.customisation_notes || "",
            approval_required: Boolean(update.approval_required),
          };
        }),
        design_references: [...current.design_references, {
          id: createLocalId("reference"),
          code,
          category,
          title: aiDraft.reference.title,
          image: aiReferenceImage,
          applies_to: aiDraft.reference.applies_to.filter((lineId) => known.has(lineId)),
          use_details: aiDraft.reference.use_details,
          exclude_details: aiDraft.reference.exclude_details || "",
        }],
      };
    });
    toast.success("AI customisation draft applied — please review before saving");
    setAiDraft(null);
    setAiReferenceImage(null);
    setAiInstruction("");
  };

  const ensureSaved = async () => savedQuote || save();
  const download = async (existingQuote = null) => {
    const quote = existingQuote || await ensureSaved();
    if (!quote) return;
    const { doc, filename } = await createQuotationPdf(quote);
    doc.save(filename);
  };
  const shareOnWhatsApp = async (existingQuote = null) => {
    const quote = existingQuote || await ensureSaved();
    if (!quote) return;
    const { doc, filename } = await createQuotationPdf(quote);
    const blob = doc.output("blob");
    const file = typeof File === "function" ? new File([blob], filename, { type: "application/pdf" }) : null;
    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: quote.quote_number, text: `Quotation from Samrat Glass Emporium · ${quote.quote_number}` });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    doc.save(filename);
    const digits = String(quote.customer_phone || "").replace(/\D/g, "");
    const message = `Hi ${quote.customer_name}, please find quotation ${quote.quote_number} from Samrat Glass Emporium for INR ${money(quote.total)}. The PDF has been downloaded; please attach it here.`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    toast.success("PDF downloaded — attach it in the opened WhatsApp chat");
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm overflow-y-auto p-4 md:p-8" role="dialog" aria-modal="true" aria-labelledby="quotation-builder-title" data-testid="quotation-builder">
      <div className="mx-auto max-w-5xl border border-[#D4AF37]/35 bg-[#12080b] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#12080b]/95 px-5 py-4 backdrop-blur">
          <div><div className="eyebrow">Inquiry quotation</div><h2 id="quotation-builder-title" className="font-serif text-2xl">{inquiry.id ? `Create quote for ${inquiry.customer_name}` : "New quotation"}</h2></div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={`Saved quotations (${savedQuotes.length})`} onClick={() => setHistoryOpen(true)} className="flex items-center gap-2 border border-[#D4AF37]/40 px-3 py-2 text-[10px] uppercase tracking-wider text-[#D4AF37] hover:bg-[#D4AF37]/10"><History size={15} /> Saved quotations ({savedQuotes.length})</button>
            <button type="button" onClick={onClose} aria-label="Close quotation builder" className="p-2 text-white/60 hover:text-white"><X size={20} /></button>
          </div>
        </div>

        {historyOpen && <div className="fixed inset-0 z-[90] flex justify-end bg-black/75" role="dialog" aria-modal="true" aria-labelledby="quotation-history-title">
          <button type="button" aria-label="Close saved quotations" onClick={() => setHistoryOpen(false)} className="absolute inset-0 cursor-default" />
          <section className="relative h-full w-full max-w-md overflow-y-auto border-l border-[#D4AF37]/35 bg-[#12080b] p-5 shadow-2xl">
            <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-5 flex items-center justify-between border-b border-white/10 bg-[#12080b]/95 px-5 py-4 backdrop-blur">
              <div><div className="eyebrow">Quotation history</div><h3 id="quotation-history-title" className="font-serif text-2xl">Saved quotations</h3></div>
              <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close quotation history" className="p-2 text-white/60 hover:text-white"><X size={20} /></button>
            </div>
            <p className="mb-4 text-xs text-white/50">Edit, download, share or delete any saved quotation.</p>
            {loadingHistory && <div className="text-xs text-white/40">Loading…</div>}
            {!loadingHistory && !savedQuotes.length && <div className="text-xs text-white/40">No saved quotations yet.</div>}
            <div className="space-y-3">{savedQuotes.map((quote) => <article key={quote.id} className="border border-white/10 p-4">
              <div className="text-sm text-[#D4AF37]">{quote.quote_number}</div>
              <div className="mt-1 text-sm text-white/70">{quote.customer_name}</div>
              <div className="mt-1 text-xs text-white/45">₹{money(quote.total)} · {new Date(quote.created_at).toLocaleDateString("en-IN")}</div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                <button type="button" onClick={() => download(quote)} className="text-[10px] uppercase tracking-wider text-white/65 hover:text-white">PDF</button>
                <button type="button" disabled={saving || uploading} onClick={() => editQuote(quote)} className="text-[10px] uppercase tracking-wider text-[#D4AF37] disabled:opacity-40">Edit</button>
                <button type="button" onClick={() => shareOnWhatsApp(quote)} className="text-[10px] uppercase tracking-wider text-[#25D366]">WhatsApp</button>
                <button type="button" disabled={deletingId === quote.id} onClick={() => deleteQuote(quote)} aria-label={`Delete quotation ${quote.quote_number}`} className="text-[10px] uppercase tracking-wider text-red-300 disabled:opacity-40">{deletingId === quote.id ? "Deleting…" : "Delete"}</button>
              </div>
            </article>)}</div>
          </section>
        </div>}

        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <section className="grid gap-3 md:grid-cols-3">
              <label className="text-xs text-white/55">Customer name<input aria-label="Customer name" value={form.customer_name} onChange={(e) => change({ customer_name: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
              <label className="text-xs text-white/55">WhatsApp number<input aria-label="WhatsApp number" value={form.customer_phone} onChange={(e) => change({ customer_phone: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
              <label className="text-xs text-white/55">Email<input aria-label="Customer email" value={form.customer_email} onChange={(e) => change({ customer_email: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
            </section>

            <section className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-white/55">Billing address<textarea aria-label="Billing address" rows="4" value={form.billing_address} onChange={(e) => change({ billing_address: e.target.value })} placeholder="Customer/company and complete billing address" className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
              <label className="text-xs text-white/55">Shipping address<textarea aria-label="Shipping address" rows="4" value={form.shipping_address} onChange={(e) => change({ shipping_address: e.target.value })} placeholder="Leave blank to show Same as Billing Address" className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
              <label className="text-xs text-white/55 md:col-span-2 md:max-w-sm">Customer GSTIN (optional)<input aria-label="Customer GSTIN" value={form.customer_gstin} onChange={(e) => change({ customer_gstin: e.target.value.toUpperCase() })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
            </section>

            <section>
              <div className="mb-2 eyebrow">Products</div>
              <input aria-label="Search catalogue for quotation" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product name or SKU to add" className="mb-2 w-full border border-white/15 bg-black/40 p-3" />
              {search.trim() && <div className="max-h-48 overflow-auto">{catalogue.filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase())).slice(0, 30).map(p => <button type="button" key={p.id} onClick={() => { addItem(p); setSearch(""); }} className="block w-full border-b border-white/10 p-2 text-left text-sm">{p.sku} · {p.name}</button>)}</div>}
              <button type="button" onClick={() => addItem()} className="mb-3 text-sm text-[#D4AF37]">+ Add custom item</button>
              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={item.line_id} className="border border-white/10 p-3">
                    <div className="grid gap-2 md:grid-cols-[1fr_90px_130px_40px] md:items-end">
                      <label className="text-xs text-white/55">Product<input aria-label={`Product ${index + 1}`} value={item.name} onChange={(e) => changeItem(index, { name: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /><span className="mt-1 block text-[10px] uppercase tracking-wider text-[#BF9972]">{item.sku ? `SKU ${item.sku}` : "Custom line"}</span></label>
                      <label className="text-xs text-white/55">Quantity<input aria-label={`Quantity ${index + 1}`} type="number" min="1" value={item.quantity} onChange={(e) => changeItem(index, { quantity: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                      <label className="text-xs text-white/55">Unit price (₹)<input aria-label={`Unit price ${index + 1}`} type="number" min="0" value={item.unit_price} onChange={(e) => changeItem(index, { unit_price: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                      <button type="button" disabled={uploading} aria-label={`Remove product ${index + 1}`} onClick={() => removeItem(index)} className="mb-0.5 p-2 text-white/45 hover:text-red-300"><Trash2 size={15} /></button>
                      <div className="md:col-span-4 flex flex-wrap items-center gap-3">
                        {item.image && <img src={api.resolveImage(item.image)} alt={item.name || "Item image"} className="h-16 w-16 object-contain" />}
                        <label className="text-xs text-[#D4AF37] cursor-pointer">{uploading ? "Uploading…" : item.image ? "Replace image" : "Add image"}<input className="block mt-1 max-w-full" type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Image for product ${index + 1}`} disabled={uploading || saving} onChange={e => uploadImage(index, e.target.files?.[0])} /></label>
                        {item.image && <button type="button" disabled={uploading} onClick={() => changeItem(index, { image: null })} className="text-xs text-white/60">Remove image</button>}
                        <label className="ml-auto flex items-center gap-2 text-xs text-white/70"><input type="checkbox" aria-label={`Customized product ${index + 1}`} checked={item.is_custom} onChange={(e) => changeItem(index, { is_custom: e.target.checked })} /> Customized product</label>
                      </div>
                    </div>

                    {item.is_custom && <div className="mt-4 grid gap-3 border-t border-[#D4AF37]/20 pt-4 md:grid-cols-2">
                      <label className="text-xs text-white/55">Body design
                        <select aria-label={`Body design for product ${index + 1}`} value={item.body_basis} onChange={(e) => changeItem(index, { body_basis: e.target.value, body_reference_line_id: e.target.value === "match_item" ? item.body_reference_line_id : null })} className="mt-1 w-full border border-white/15 bg-black/70 px-3 py-2 text-white">
                          <option value="product">Keep this product design</option>
                          <option value="match_item">Match another quotation item</option>
                          <option value="drawing">Use uploaded / approved drawing</option>
                          <option value="drawing_pending">Final design drawing pending</option>
                        </select>
                      </label>
                      {item.body_basis === "match_item" && <label className="text-xs text-white/55">Match body to
                        <select aria-label={`Body reference for product ${index + 1}`} value={item.body_reference_line_id || ""} onChange={(e) => changeItem(index, { body_reference_line_id: e.target.value || null })} className="mt-1 w-full border border-white/15 bg-black/70 px-3 py-2 text-white">
                          <option value="">Select another item</option>
                          {form.items.map((candidate, candidateIndex) => candidate.line_id !== item.line_id && <option key={candidate.line_id} value={candidate.line_id} label={`Item ${candidateIndex + 1} · ${candidate.name || "Unnamed product"}`} />)}
                        </select>
                      </label>}
                      {item.body_basis === "match_item" && <fieldset className="md:col-span-2">
                        <legend className="mb-2 text-xs text-white/55">Components to match</legend>
                        <div className="flex flex-wrap gap-3">{MATCHING_COMPONENTS.map(([value, label]) => <label key={value} className="flex items-center gap-2 text-xs text-white/70"><input type="checkbox" aria-label={`${label} for product ${index + 1}`} checked={item.matching_components.includes(value)} onChange={(e) => changeItem(index, { matching_components: e.target.checked ? [...item.matching_components, value] : item.matching_components.filter((component) => component !== value) })} />{label}</label>)}</div>
                      </fieldset>}
                      <label className="text-xs text-white/55 md:col-span-2">Customization details<textarea aria-label={`Customization details for product ${index + 1}`} rows="3" value={item.customisation_notes} onChange={(e) => changeItem(index, { customisation_notes: e.target.value })} placeholder="Only confirmed product-specific instructions" className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                      <label className="flex items-center gap-2 text-xs text-white/70 md:col-span-2"><input type="checkbox" aria-label={`Final drawing approval for product ${index + 1}`} checked={item.approval_required} onChange={(e) => changeItem(index, { approval_required: e.target.checked })} /> Final drawing / design approval required before production</label>
                    </div>}
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-[#D4AF37]/35 bg-[#D4AF37]/[0.04] p-4 md:p-5">
              <div className="flex items-start gap-3"><Sparkles className="mt-0.5 shrink-0 text-[#D4AF37]" size={20} /><div><div className="eyebrow">AI Customisation Assistant</div><p className="mt-1 text-sm text-white/65">Upload one reference and describe the required change in your own words. The assistant will prepare the quotation details for you.</p></div></div>
              <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
                <div>
                  {aiReferenceImage && <img src={api.resolveImage(aiReferenceImage)} alt="AI customisation reference" className="mb-2 h-32 w-full border border-white/10 object-contain" />}
                  <label className="block cursor-pointer border border-dashed border-[#D4AF37]/35 p-3 text-center text-xs text-[#D4AF37]">{uploading ? "Uploading…" : aiReferenceImage ? "Replace reference" : "Upload reference image"}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="AI reference image" disabled={uploading || aiBusy} onChange={(event) => uploadAiReference(event.target.files?.[0])} className="sr-only" /></label>
                </div>
                <div>
                  <label className="text-xs text-white/60">What should be changed?<textarea aria-label="AI customisation instruction" rows="5" value={aiInstruction} onChange={(event) => { setAiInstruction(event.target.value); setAiDraft(null); }} placeholder="Example: Use only the frosted star-cut shade design on both products. Keep the chandelier body. Make the wall light body match the chandelier with glass arms and crystal drops. Do not copy the swan or wall plate." className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                  <button type="button" onClick={analyseCustomisation} disabled={aiBusy || uploading || !form.items.length} className="mt-3 flex items-center gap-2 bg-[#D4AF37] px-4 py-2.5 text-xs uppercase tracking-wider text-black disabled:opacity-40">{aiBusy ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />} {aiBusy ? "Understanding…" : "Prepare customisation"}</button>
                </div>
              </div>
              {aiDraft && <div className="mt-4 border border-emerald-400/30 bg-emerald-400/[0.06] p-4 text-sm">
                <div className="font-medium text-emerald-200">Ready to apply</div>
                <p className="mt-1 text-white/75">{aiDraft.summary}</p>
                <p className="mt-2 text-xs text-white/55"><span className="text-white/75">Use:</span> {aiDraft.reference.use_details}</p>
                {aiDraft.reference.exclude_details && <p className="mt-1 text-xs text-white/55"><span className="text-white/75">Do not copy:</span> {aiDraft.reference.exclude_details}</p>}
                {!!aiDraft.warnings?.length && <ul className="mt-2 list-disc pl-5 text-xs text-amber-200">{aiDraft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
                <button type="button" onClick={applyAiDraft} className="mt-3 bg-emerald-300 px-4 py-2 text-xs uppercase tracking-wider text-black">Apply to quotation</button>
              </div>}
            </section>

            <details>
              <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-white/55">Advanced manual customisation</summary>
              <section className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <div><div className="eyebrow">Design references</div><p className="mt-1 text-xs text-white/45">Upload a reference once, state what to use or exclude, and select every product it applies to.</p></div>
                <button type="button" disabled={!form.items.length} onClick={addReference} className="border border-[#D4AF37]/40 px-3 py-2 text-xs text-[#D4AF37] disabled:opacity-40">+ Add reference</button>
              </div>
              {!form.design_references.length && <div className="mt-3 border border-dashed border-white/15 p-4 text-xs text-white/40">No shared design references. Standard quotations remain unchanged.</div>}
              <div className="mt-3 space-y-4">{form.design_references.map((reference, referenceIndex) => <div key={reference.id} className="border border-[#D4AF37]/25 bg-[#D4AF37]/[0.03] p-4">
                <div className="grid gap-3 md:grid-cols-[110px_1fr_1fr_40px] md:items-end">
                  <label className="text-xs text-white/55">Reference code<input aria-label={`Reference code ${referenceIndex + 1}`} value={reference.code} onChange={(e) => changeReference(referenceIndex, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                  <label className="text-xs text-white/55">Reference type<select aria-label={`Reference type ${referenceIndex + 1}`} value={reference.category} onChange={(e) => changeReference(referenceIndex, { category: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/70 px-3 py-2 text-white">{REFERENCE_CATEGORIES.map(([value, label]) => <option key={value} value={value} label={label} />)}</select></label>
                  <label className="text-xs text-white/55">Title<input aria-label={`Reference title ${referenceIndex + 1}`} value={reference.title} onChange={(e) => changeReference(referenceIndex, { title: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                  <button type="button" aria-label={`Remove reference ${referenceIndex + 1}`} onClick={() => removeReference(referenceIndex)} className="p-2 text-white/45 hover:text-red-300"><Trash2 size={15} /></button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {reference.image && <img src={api.resolveImage(reference.image)} alt={`${reference.code} reference`} className="h-20 w-20 object-contain" />}
                  <label className="text-xs text-[#D4AF37] cursor-pointer">{uploading ? "Uploading…" : reference.image ? "Replace reference image" : "Add reference image"}<input className="block mt-1 max-w-full" type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Image for reference ${referenceIndex + 1}`} disabled={uploading || saving} onChange={e => uploadReferenceImage(referenceIndex, e.target.files?.[0])} /></label>
                  {reference.image && <button type="button" disabled={uploading} onClick={() => changeReference(referenceIndex, { image: null })} className="text-xs text-white/60">Remove image</button>}
                </div>
                <fieldset className="mt-4"><legend className="mb-2 text-xs text-white/55">Applies to products</legend><div className="flex flex-wrap gap-3">{form.items.map((item, itemIndex) => <label key={item.line_id} className="flex items-center gap-2 text-xs text-white/70"><input type="checkbox" aria-label={`${reference.code} applies to product ${itemIndex + 1}`} checked={reference.applies_to.includes(item.line_id)} onChange={(e) => changeReference(referenceIndex, { applies_to: e.target.checked ? [...reference.applies_to, item.line_id] : reference.applies_to.filter((lineId) => lineId !== item.line_id) })} />Item {itemIndex + 1} · {item.name || "Unnamed product"}</label>)}</div></fieldset>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-white/55">Use from this reference<textarea aria-label={`Use details for reference ${referenceIndex + 1}`} rows="3" value={reference.use_details} onChange={(e) => changeReference(referenceIndex, { use_details: e.target.value })} placeholder="Example: Starburst/floral cuts and lower radiating cuts" className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                  <label className="text-xs text-white/55">Do not copy from this reference<textarea aria-label={`Exclusion details for reference ${referenceIndex + 1}`} rows="3" value={reference.exclude_details} onChange={(e) => changeReference(referenceIndex, { exclude_details: e.target.value })} placeholder="Example: Swan body, wall plate and metalwork" className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                </div>
              </div>)}</div>
              </section>
            </details>

            <section className="grid gap-3 md:grid-cols-4">
              <label className="text-xs text-white/55">Discount (₹)<input aria-label="Discount" type="number" min="0" value={form.discount} onChange={(e) => change({ discount: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
              <label className="text-xs text-white/55">Freight / charges (₹)<input aria-label="Freight or other charges" type="number" min="0" value={form.shipping} onChange={(e) => change({ shipping: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
              <label className="text-xs text-white/55">GST / tax (%)<input aria-label="GST or tax rate" type="number" min="0" max="100" value={form.tax_rate} onChange={(e) => change({ tax_rate: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
              <label className="text-xs text-white/55">Validity (days)<input aria-label="Validity in days" type="number" min="1" max="365" value={form.validity_days} onChange={(e) => change({ validity_days: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
            </section>
            <section className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-white/55">Notes<textarea aria-label="Quotation notes" rows="4" value={form.notes} onChange={(e) => change({ notes: e.target.value })} placeholder="Optional product or customer notes" className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
              <label className="text-xs text-white/55">Terms<textarea aria-label="Quotation terms" rows="4" value={form.terms} onChange={(e) => change({ terms: e.target.value })} placeholder="Add only confirmed payment, dispatch or delivery terms" className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
            </section>
          </div>

          <aside className="space-y-5">
            <div className="border border-[#D4AF37]/30 bg-[#D4AF37]/[0.04] p-5">
              <div className="eyebrow mb-4">Quotation total</div>
              <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-white/55">Subtotal</span><span>₹{money(totals.subtotal)}</span></div><div className="flex justify-between"><span className="text-white/55">Tax</span><span>₹{money(totals.tax)}</span></div><div className="mt-3 flex justify-between border-t border-white/10 pt-3 font-serif text-xl text-[#D4AF37]"><span>Total</span><span data-testid="quotation-grand-total">₹{money(totals.total)}</span></div></div>
            </div>
            {editingId && <button type="button" disabled={saving || uploading} onClick={() => { setForm(quotationForm(inquiry)); setEditingId(null); setSavedQuote(null); }} className="text-sm text-[#D4AF37]">+ New quotation</button>}
            <button type="button" onClick={save} disabled={saving || uploading || !form.items.length} data-testid="quotation-save" className="flex w-full items-center justify-center gap-2 bg-[#D4AF37] px-4 py-3 text-xs uppercase tracking-[0.2em] text-black disabled:opacity-40">{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />} {editingId ? "Save changes" : "Save quotation"}</button>
            <button type="button" onClick={() => download()} disabled={saving || uploading || !form.items.length} data-testid="quotation-download" className="flex w-full items-center justify-center gap-2 border border-white/25 px-4 py-3 text-xs uppercase tracking-[0.2em] text-white hover:border-[#D4AF37] disabled:opacity-40"><Download size={15} /> Download PDF</button>
            <button type="button" onClick={() => shareOnWhatsApp()} disabled={saving || uploading || !form.customer_phone || !form.items.length} data-testid="quotation-whatsapp" className="flex w-full items-center justify-center gap-2 border border-[#25D366]/50 px-4 py-3 text-xs uppercase tracking-[0.2em] text-[#25D366] hover:bg-[#25D366]/10 disabled:opacity-40"><MessageCircle size={15} /> WhatsApp quotation</button>

          </aside>
        </div>
      </div>
    </div>
  );
}
