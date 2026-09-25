import React, { useEffect, useMemo, useState } from "react";
import { Download, History, LoaderCircle, MessageCircle, Save, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { createQuotationPdf } from "../lib/quotationPdf";
import { harmoniseCustomVariantNames } from "../lib/quotationNaming";

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
const normaliseItem = (item = {}) => ({
  product_id: item.product_id || null,
  line_id: item.line_id || createLocalId("line"),
  name: item.name || "",
  name_user_edited: Boolean(item.name_user_edited),
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
  customisation_instruction: item.customisation_instruction || "",
  customisation_reference_image: item.customisation_reference_image || null,
  customisation_ai_summary: item.customisation_ai_summary || "",
  customisation_ai_warnings: Array.isArray(item.customisation_ai_warnings) ? item.customisation_ai_warnings : [],
  customisation_ai_prepared: Boolean(item.customisation_ai_prepared ?? (item.is_custom && item.customisation_notes)),
  customisation_reference_id: item.customisation_reference_id || null,
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
  freight_mode: "",
  tax_mode: "gst",
  tax_rate: 18,
  validity_days: 15,
  terms: "",
  notes: "",
});
const quotationForm = (source = {}) => {
  const base = initialForm(source);
  const savedQuotation = Boolean(source.quote_number);
  return {
    ...base,
    ...source,
    items: harmoniseCustomVariantNames(base.items),
    design_references: base.design_references,
    customer_email: source.customer_email || "",
    freight_mode: source.freight_mode || (savedQuotation && numberValue(source.shipping) > 0 ? "added_to_bill" : savedQuotation ? "legacy" : ""),
    tax_mode: source.tax_mode || (savedQuotation ? "legacy" : "gst"),
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
  const [bottomSearch, setBottomSearch] = useState("");
  const [aiBusyLineId, setAiBusyLineId] = useState(null);
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
    const freight = form.freight_mode === "added_to_bill" ? numberValue(form.shipping) : 0;
    const taxable = Math.max(0, subtotal - numberValue(form.discount) + freight);
    const tax = form.tax_mode === "no_tax" ? 0 : taxable * numberValue(form.tax_rate) / 100;
    return { subtotal, freight, tax, total: taxable + tax };
  }, [form]);

  const change = (patch) => { setSavedQuote(null); setForm((current) => ({ ...current, ...patch })); };
  const changeItem = (index, patch) => {
    setSavedQuote(null);
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };
  const changeDesignReference = (referenceId, patch) => {
    setSavedQuote(null);
    setForm((current) => ({
      ...current,
      design_references: current.design_references.map((reference) => (
        reference.id === referenceId ? { ...reference, ...patch } : reference
      )),
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
            ? {
              ...item,
              body_basis: "product",
              body_reference_line_id: null,
              approval_required: false,
              customisation_ai_prepared: false,
              customisation_ai_summary: "",
            }
            : item
        )),
        design_references: current.design_references.map((reference) => ({
          ...reference,
          applies_to: reference.applies_to.filter((lineId) => lineId !== removed?.line_id),
        })).filter((reference) => reference.applies_to.length),
      };
    });
  };

  const save = async () => {
    if (!form.customer_name.trim() || !form.items.length || form.items.some((item) => !item.name.trim())) {
      toast.error("Customer name and at least one complete product are required");
      return null;
    }
    const zeroPriceIndex = form.items.findIndex((item) => numberValue(item.unit_price) <= 0);
    if (zeroPriceIndex >= 0) {
      const item = form.items[zeroPriceIndex];
      toast.error(`Enter a price greater than ₹0 for Item ${zeroPriceIndex + 1}: ${item.name || "Unnamed product"}`);
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
    const unresolvedWarningIndex = form.items.findIndex((item) => item.is_custom && item.customisation_ai_warnings?.length);
    if (unresolvedWarningIndex >= 0) {
      const item = form.items[unresolvedWarningIndex];
      toast.error(`Item ${unresolvedWarningIndex + 1} needs more information: ${item.customisation_ai_warnings[0]}`);
      return null;
    }
    const unpreparedCustomItem = form.items.find((item) => item.is_custom && (
      (!item.customisation_instruction.trim() && !item.customisation_notes.trim())
      || !item.customisation_ai_prepared
    ));
    if (unpreparedCustomItem) {
      toast.error(`Type the instruction and prepare ${unpreparedCustomItem.name || "the customised product"} with AI first`);
      return null;
    }
    if (numberValue(form.discount) > totals.subtotal) {
      toast.error("Discount cannot exceed the product subtotal");
      return null;
    }
    if (!form.freight_mode || form.freight_mode === "legacy") {
      toast.error("Select how freight will be handled for this quotation");
      return null;
    }
    if (form.freight_mode === "added_to_bill" && numberValue(form.shipping) <= 0) {
      toast.error("Enter the freight amount to add to the bill");
      return null;
    }
    if (form.tax_mode === "gst" && numberValue(form.tax_rate) <= 0) {
      toast.error("Enter the GST rate for this quotation");
      return null;
    }
    setSaving(true);
    try {
      const harmonisedItems = harmoniseCustomVariantNames(form.items);
      const create = editingId ? (data) => api.updateQuotation(editingId, data) : inquiry.id ? (data) => api.createInquiryQuotation(inquiry.id, data) : api.createStandaloneQuotation;
      const quote = await create({
        ...form,
        items: harmonisedItems.map((item) => ({
          ...item,
          quantity: Math.max(1, Math.round(numberValue(item.quantity))),
          unit_price: numberValue(item.unit_price),
        })),
        discount: numberValue(form.discount),
        shipping: form.freight_mode === "added_to_bill" ? numberValue(form.shipping) : 0,
        tax_rate: form.tax_mode === "no_tax" ? 0 : numberValue(form.tax_rate),
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
  const uploadItemReference = async (index, file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error("Choose a JPG, PNG or WebP image"); return; }
    setUploading(true);
    try {
      const result = await api.upload(file);
      changeItem(index, {
        customisation_reference_image: result.url,
        customisation_ai_prepared: false,
        customisation_ai_summary: "",
        customisation_ai_warnings: [],
      });
    } catch (error) { toast.error(errorMessage(error, "Could not upload reference image")); }
    finally { setUploading(false); }
  };

  const analyseItemCustomisation = async (index) => {
    const target = form.items[index];
    if (!target || target.customisation_instruction.trim().length < 3) { toast.error("Type what should be changed for this product"); return; }
    const unnamedContextItem = form.items.find((item) => item.line_id !== target.line_id && !item.name.trim());
    if (!form.items.length || unnamedContextItem) { toast.error("Name the other quotation products first so AI can understand what this item should match"); return; }
    setAiBusyLineId(target.line_id);
    try {
      const result = await api.aiQuotationCustomisation({
        product_image_url: String(target.image || "").startsWith("/api/files/") ? target.image : null,
        reference_image_url: target.customisation_reference_image || null,
        instruction: target.customisation_instruction.trim(),
        target_line_id: target.line_id,
        items: form.items.map(({ line_id, product_id, name, sku, quantity }, itemIndex) => ({
          line_id,
          product_id: product_id || null,
          name: name.trim() || `Custom product Item ${itemIndex + 1}`,
          sku: sku || null,
          quantity: Number(quantity) || 1,
        })),
      });
      const draft = result.draft;
      const update = draft.item_updates.find((row) => row.line_id === target.line_id);
      if (!update) throw new Error("AI did not return the selected product");
      setSavedQuote(null);
      setForm((current) => {
        const currentTarget = current.items.find((item) => item.line_id === target.line_id);
        if (!currentTarget) return current;
        const existingReferenceId = currentTarget.customisation_reference_id;
        const retainedReferences = current.design_references.filter((reference) => reference.id !== existingReferenceId);
        let referenceId = null;
        let designReferences = retainedReferences;
        if (currentTarget.customisation_reference_image) {
          const category = draft.reference.category || "other";
          const prefix = REFERENCE_CATEGORIES.find(([value]) => value === category)?.[2] || "RF";
          const used = new Set(retainedReferences.map((reference) => reference.code));
          let sequence = 1;
          while (used.has(`${prefix}-${String(sequence).padStart(2, "0")}`)) sequence += 1;
          referenceId = existingReferenceId || createLocalId("reference");
          designReferences = [...retainedReferences, {
            id: referenceId,
            code: `${prefix}-${String(sequence).padStart(2, "0")}`,
            category,
            title: draft.reference.title,
            image: currentTarget.customisation_reference_image,
            applies_to: [target.line_id],
            use_details: draft.reference.use_details,
            exclude_details: draft.reference.exclude_details || "",
          }];
        }
        const warnings = Array.isArray(draft.warnings) ? draft.warnings.filter(Boolean) : [];
        const updatedItems = current.items.map((item) => item.line_id === target.line_id ? {
          ...item,
          name: update.suggested_name?.trim() || item.name,
          name_user_edited: false,
          is_custom: true,
          body_basis: update.body_basis,
          body_reference_line_id: update.body_reference_line_id || null,
          matching_components: update.matching_components || [],
          customisation_notes: update.customisation_notes || "",
          approval_required: Boolean(update.approval_required),
          customisation_ai_summary: draft.summary,
          customisation_ai_warnings: warnings,
          customisation_ai_prepared: warnings.length === 0,
          customisation_reference_id: referenceId,
        } : item);
        return {
          ...current,
          design_references: designReferences,
          items: harmoniseCustomVariantNames(updatedItems),
        };
      });
      if (draft.warnings?.length) toast.warning(`AI needs more information for Item ${index + 1}`);
      else toast.success(`AI prepared the customisation for Item ${index + 1}`);
    } catch (error) { toast.error(errorMessage(error, "Could not analyse the reference")); }
    finally { setAiBusyLineId(null); }
  };

  const ensureSaved = async () => savedQuote || save();
  const download = async (existingQuote = null) => {
    const quote = existingQuote || await ensureSaved();
    if (!quote) return;
    const pdfQuote = { ...quote, items: harmoniseCustomVariantNames(quote.items || []) };
    const { doc, filename } = await createQuotationPdf(pdfQuote);
    doc.save(filename);
  };
  const shareOnWhatsApp = async (existingQuote = null) => {
    const quote = existingQuote || await ensureSaved();
    if (!quote) return;
    const pdfQuote = { ...quote, items: harmoniseCustomVariantNames(quote.items || []) };
    const { doc, filename } = await createQuotationPdf(pdfQuote);
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
                      <label className="text-xs text-white/55">Product<input aria-label={`Product ${index + 1}`} value={item.name} onChange={(e) => changeItem(index, { name: e.target.value, name_user_edited: true })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /><span className="mt-1 block text-[10px] uppercase tracking-wider text-[#BF9972]">{item.sku ? `SKU ${item.sku}` : "Custom line"}</span></label>
                      <label className="text-xs text-white/55">Quantity<input aria-label={`Quantity ${index + 1}`} type="number" min="1" value={item.quantity} onChange={(e) => changeItem(index, { quantity: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                      <label className="text-xs text-white/55">Unit price (₹)<input aria-label={`Unit price ${index + 1}`} type="number" min="0.01" step="0.01" value={item.unit_price} onChange={(e) => changeItem(index, { unit_price: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                      <button type="button" disabled={uploading} aria-label={`Remove product ${index + 1}`} onClick={() => removeItem(index)} className="mb-0.5 p-2 text-white/45 hover:text-red-300"><Trash2 size={15} /></button>
                      <div className="md:col-span-4 flex flex-wrap items-center gap-3">
                        {item.image && <img src={api.resolveImage(item.image)} alt={item.name || "Item image"} className="h-16 w-16 object-contain" />}
                        <label className="text-xs text-[#D4AF37] cursor-pointer">{uploading ? "Uploading…" : item.image ? "Replace image" : "Add image"}<input className="block mt-1 max-w-full" type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Image for product ${index + 1}`} disabled={uploading || saving} onChange={e => uploadImage(index, e.target.files?.[0])} /></label>
                        {item.image && <button type="button" disabled={uploading} onClick={() => changeItem(index, { image: null })} className="text-xs text-white/60">Remove image</button>}
                        <label className="ml-auto flex items-center gap-2 text-xs text-white/70"><input type="checkbox" aria-label={`Customise product ${index + 1}`} checked={item.is_custom} onChange={(e) => changeItem(index, { is_custom: e.target.checked, customisation_ai_prepared: e.target.checked ? item.customisation_ai_prepared : false })} /> Customise this product</label>
                      </div>
                    </div>

                    {item.is_custom && <div className="mt-4 border-t border-[#D4AF37]/20 pt-4">
                      <div className="flex items-start gap-2"><Sparkles className="mt-0.5 shrink-0 text-[#D4AF37]" size={17} /><div><div className="text-sm text-white">Describe this product’s customisation</div><p className="mt-1 text-xs text-white/50">The product image is used automatically as the base design. Add a separate reference image only if needed. AI will prepare the name, construction details and exclusions.</p></div></div>
                      <div className="mt-3 grid gap-4 md:grid-cols-[160px_1fr]">
                        <div>
                          {item.customisation_reference_image && <img src={api.resolveImage(item.customisation_reference_image)} alt={`Customisation reference for product ${index + 1}`} className="mb-2 h-28 w-full border border-white/10 object-contain" />}
                          <label className="block cursor-pointer border border-dashed border-[#D4AF37]/35 p-3 text-center text-xs text-[#D4AF37]">{uploading ? "Uploading…" : item.customisation_reference_image ? "Replace reference image" : "Upload reference image (optional)"}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Reference image for product ${index + 1}`} disabled={uploading || aiBusyLineId === item.line_id} onChange={(event) => uploadItemReference(index, event.target.files?.[0])} className="sr-only" /></label>
                          {item.customisation_reference_image && <button type="button" onClick={() => changeItem(index, { customisation_reference_image: null, customisation_ai_prepared: false, customisation_ai_summary: "", customisation_ai_warnings: [] })} className="mt-2 text-xs text-white/55">Remove reference</button>}
                        </div>
                        <div>
                          <label className="text-xs text-white/60">Instructions for AI<textarea aria-label={`Customisation instruction for product ${index + 1}`} rows="5" value={item.customisation_instruction} onChange={(event) => changeItem(index, { customisation_instruction: event.target.value, customisation_ai_prepared: false, customisation_ai_summary: "" })} placeholder={index ? "Example: Make this wall light match Item 1 with glass arms, crystal bobeches, crystal drops and the same metal finish. Use only the shade design from the reference image." : "Example: Keep this chandelier body exactly the same. Replace every shade with the frosted star-cut shade shown in the reference image."} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                          <button type="button" onClick={() => analyseItemCustomisation(index)} disabled={aiBusyLineId !== null || uploading || item.customisation_instruction.trim().length < 3} className="mt-3 flex items-center gap-2 bg-[#D4AF37] px-4 py-2.5 text-xs uppercase tracking-wider text-black disabled:opacity-40">{aiBusyLineId === item.line_id ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />} {aiBusyLineId === item.line_id ? "Preparing…" : item.customisation_ai_prepared || item.customisation_ai_warnings?.length ? "Prepare again with AI" : "Prepare with AI"}</button>
                        </div>
                      </div>
                      {item.customisation_ai_prepared && (() => {
                        const reference = form.design_references.find((candidate) => candidate.id === item.customisation_reference_id);
                        return <div className="mt-3 space-y-3 border border-emerald-400/30 bg-emerald-400/[0.06] p-3 text-xs text-emerald-100">
                          <div><div className="font-medium">AI draft ready - review and edit before saving</div><p className="mt-1 text-white/50">The Product field above and every customer-facing AI detail below remain editable.</p></div>
                          <label className="block text-white/60">AI summary (internal)<textarea aria-label={`AI summary for product ${index + 1}`} rows="2" value={item.customisation_ai_summary} onChange={(event) => changeItem(index, { customisation_ai_summary: event.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                          <label className="block text-white/60">Detailed customisation wording for PDF<textarea aria-label={`Detailed customisation wording for product ${index + 1}`} rows="6" value={item.customisation_notes} onChange={(event) => changeItem(index, { customisation_notes: event.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                          {reference && <div className="space-y-2 border-t border-white/10 pt-3">
                            <div className="font-medium text-white/75">Reference interpretation</div>
                            <label className="block text-white/60">Reference title<input aria-label={`Reference title for product ${index + 1}`} value={reference.title} onChange={(event) => changeDesignReference(reference.id, { title: event.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                            <label className="block text-white/60">Use from reference<textarea aria-label={`Use from reference for product ${index + 1}`} rows="3" value={reference.use_details} onChange={(event) => changeDesignReference(reference.id, { use_details: event.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                            <label className="block text-white/60">Do not copy from reference<textarea aria-label={`Exclude from reference for product ${index + 1}`} rows="3" value={reference.exclude_details} onChange={(event) => changeDesignReference(reference.id, { exclude_details: event.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                          </div>}
                        </div>;
                      })()}
                      {!!item.customisation_ai_warnings?.length && <div className="mt-3 border border-amber-300/35 bg-amber-300/[0.06] p-3 text-xs text-amber-100"><div className="font-medium">More information required</div><ul className="mt-2 list-disc space-y-1 pl-4 text-white/70">{item.customisation_ai_warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><p className="mt-2 text-white/50">Add these answers to the instruction above, then select Prepare again with AI.</p></div>}
                      {!item.customisation_ai_prepared && item.customisation_instruction.trim().length >= 3 && <p className="mt-2 text-xs text-amber-200">Prepare this item with AI before saving the quotation.</p>}
                    </div>}
                  </div>
                ))}
              </div>
              <div className="mt-4 border border-[#D4AF37]/25 bg-[#D4AF37]/[0.03] p-4">
                <div className="mb-2 text-sm text-white">Add another product</div>
                <input aria-label="Search catalogue to add another product" value={bottomSearch} onChange={(event) => setBottomSearch(event.target.value)} placeholder="Search product name or SKU" className="w-full border border-white/15 bg-black/40 p-3" />
                {bottomSearch.trim() && <div className="max-h-48 overflow-auto">{catalogue.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(bottomSearch.toLowerCase())).slice(0, 30).map((product) => <button type="button" key={product.id} onClick={() => { addItem(product); setBottomSearch(""); }} className="block w-full border-b border-white/10 p-2 text-left text-sm">{product.sku} · {product.name}</button>)}</div>}
                <button type="button" onClick={() => addItem()} className="mt-3 text-sm text-[#D4AF37]">+ Add another custom item</button>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-4">
              <label className="text-xs text-white/55">Discount (₹)<input aria-label="Discount" type="number" min="0" value={form.discount} onChange={(e) => change({ discount: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
              <label className="text-xs text-white/55">Freight arrangement<select aria-label="Freight arrangement" value={form.freight_mode} onChange={(e) => change({ freight_mode: e.target.value, shipping: e.target.value === "added_to_bill" ? form.shipping : 0 })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white"><option value="">Select freight treatment</option><option value="included_in_price">Included in product prices</option><option value="payable_by_client">Payable separately by client</option><option value="added_to_bill" disabled={form.tax_mode === "no_tax"}>Add freight to bill — GST applies</option></select></label>
              {form.freight_mode === "added_to_bill" ? <label className="text-xs text-white/55">Freight added to bill (₹)<input aria-label="Freight or other charges" type="number" min="0" value={form.shipping} onChange={(e) => change({ shipping: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /><span className="mt-1 block text-[10px] text-white/40">This amount is included in the GST taxable value.</span></label> : <div className="hidden md:block" />}
              <label className="text-xs text-white/55">Tax treatment<select aria-label="Tax treatment" value={form.tax_mode} onChange={(e) => change({ tax_mode: e.target.value, tax_rate: e.target.value === "no_tax" ? 0 : (numberValue(form.tax_rate) || 18), ...(e.target.value === "no_tax" && form.freight_mode === "added_to_bill" ? { freight_mode: "", shipping: 0 } : {}) })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white">{form.tax_mode === "legacy" && <option value="legacy">Legacy saved treatment</option>}<option value="gst">GST quotation</option><option value="no_tax">Quotation without tax</option></select>{form.tax_mode === "no_tax" && <span className="mt-1 block text-[10px] text-white/40">The PDF will omit tax wording and use the alternate payment account. Billed freight is unavailable because freight added to a bill must be taxed.</span>}</label>
              {form.tax_mode !== "no_tax" && <label className="text-xs text-white/55">GST rate (%)<input aria-label="GST or tax rate" type="number" min="0" max="100" value={form.tax_rate} onChange={(e) => change({ tax_rate: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>}
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
              <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-white/55">Subtotal</span><span>₹{money(totals.subtotal)}</span></div>{totals.freight > 0 && <div className="flex justify-between"><span className="text-white/55">Freight (taxable)</span><span>₹{money(totals.freight)}</span></div>}{form.tax_mode !== "no_tax" && numberValue(form.tax_rate) > 0 && <div className="flex justify-between"><span className="text-white/55">GST</span><span>₹{money(totals.tax)}</span></div>}<div className="mt-3 flex justify-between border-t border-white/10 pt-3 font-serif text-xl text-[#D4AF37]"><span>Total</span><span data-testid="quotation-grand-total">₹{money(totals.total)}</span></div></div>
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
