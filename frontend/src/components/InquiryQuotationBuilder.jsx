import React, { useEffect, useMemo, useState } from "react";
import { Download, LoaderCircle, MessageCircle, Save, Trash2, X } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { api } from "../lib/api";

const money = (value) => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0,
  maximumFractionDigits: 2,
});

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const initialForm = (inquiry) => ({
  customer_name: inquiry.customer_name || "",
  customer_email: inquiry.customer_email || "",
  customer_phone: inquiry.customer_phone || "",
  items: (inquiry.items || []).map((item) => ({
    product_id: item.product_id || null,
    name: item.name || "",
    sku: item.sku || "",
    quantity: item.quantity || 1,
    unit_price: item.price || 0,
  })),
  discount: 0,
  shipping: 0,
  tax_rate: 0,
  validity_days: 15,
  terms: "",
  notes: "",
});

export const createQuotationPdf = (quote) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 16;
  const right = pageWidth - 16;
  let y = 18;

  const ensureSpace = (height = 12) => {
    if (y + height <= pageHeight - 18) return;
    doc.addPage();
    y = 18;
  };

  doc.setFillColor(28, 7, 12);
  doc.rect(0, 0, pageWidth, 42, "F");
  doc.setTextColor(212, 175, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("SAMRAT GLASS EMPORIUM", left, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(236, 220, 204);
  doc.text("Handcrafted lighting from Firozabad · Since 1981", left, 24);
  doc.text("samratglass.com · WhatsApp +91 89203 92937", left, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("QUOTATION", right, 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(quote.quote_number, right, 24, { align: "right" });
  doc.text(new Date(quote.created_at).toLocaleDateString("en-IN"), right, 30, { align: "right" });

  y = 52;
  doc.setTextColor(55, 43, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("QUOTED TO", left, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y += 7;
  doc.text(quote.customer_name || "Customer", left, y);
  doc.setFontSize(8.5);
  if (quote.customer_phone) { y += 5; doc.text(quote.customer_phone, left, y); }
  if (quote.customer_email) { y += 5; doc.text(quote.customer_email, left, y); }
  doc.setFont("helvetica", "bold");
  doc.text(`Valid until: ${new Date(`${quote.valid_until}T00:00:00`).toLocaleDateString("en-IN")}`, right, 52, { align: "right" });

  y = Math.max(y + 12, 78);
  doc.setFillColor(242, 237, 232);
  doc.rect(left, y - 5, right - left, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PRODUCT / REFERENCE", left + 2, y);
  doc.text("QTY", 140, y, { align: "right" });
  doc.text("UNIT PRICE", 169, y, { align: "right" });
  doc.text("AMOUNT", right - 2, y, { align: "right" });
  y += 9;

  quote.items.forEach((item) => {
    const lines = doc.splitTextToSize(item.name, 88);
    const rowHeight = Math.max(12, lines.length * 4 + 6);
    ensureSpace(rowHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(lines, left + 2, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    if (item.sku) doc.text(`SKU ${item.sku}`, left + 2, y + lines.length * 4 + 1);
    doc.setFontSize(8.5);
    doc.text(String(item.quantity), 140, y, { align: "right" });
    doc.text(`INR ${money(item.unit_price)}`, 169, y, { align: "right" });
    doc.text(`INR ${money(item.line_total)}`, right - 2, y, { align: "right" });
    y += rowHeight;
    doc.setDrawColor(225, 218, 214);
    doc.line(left, y - 4, right, y - 4);
  });

  ensureSpace(48);
  const valueX = right - 2;
  const labelX = 145;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  [["Subtotal", quote.subtotal], ["Discount", -quote.discount], ["Freight / other charges", quote.shipping]].forEach(([label, value]) => {
    doc.text(label, labelX, y);
    doc.text(`INR ${money(value)}`, valueX, y, { align: "right" });
    y += 6;
  });
  if (quote.tax_rate > 0) {
    doc.text(`GST / tax (${money(quote.tax_rate)}%)`, labelX, y);
    doc.text(`INR ${money(quote.tax_amount)}`, valueX, y, { align: "right" });
    y += 6;
  }
  doc.setDrawColor(212, 175, 55);
  doc.line(labelX, y - 2, right, y - 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", labelX, y + 5);
  doc.text(`INR ${money(quote.total)}`, valueX, y + 5, { align: "right" });
  y += 18;

  if (quote.notes) {
    ensureSpace(20);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("NOTES", left, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(quote.notes, right - left);
    doc.text(lines, left, y + 5); y += lines.length * 4 + 10;
  }
  if (quote.terms) {
    ensureSpace(20);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("TERMS", left, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(quote.terms, right - left), left, y + 5);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(105, 92, 94);
  doc.text("Thank you for considering Samrat Glass Emporium.", pageWidth / 2, pageHeight - 10, { align: "center" });
  return { doc, filename: `${quote.quote_number}.pdf` };
};

export default function InquiryQuotationBuilder({ inquiry, onClose, onSaved }) {
  const [form, setForm] = useState(() => initialForm(inquiry));
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [savedQuote, setSavedQuote] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api.listInquiryQuotations(inquiry.id)
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
    setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const save = async () => {
    if (!form.customer_name.trim() || !form.items.length || form.items.some((item) => !item.name.trim())) {
      toast.error("Customer name and at least one complete product are required");
      return null;
    }
    if (numberValue(form.discount) > totals.subtotal) {
      toast.error("Discount cannot exceed the product subtotal");
      return null;
    }
    setSaving(true);
    try {
      const quote = await api.createInquiryQuotation(inquiry.id, {
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
      setSavedQuote(quote);
      setSavedQuotes((current) => [quote, ...current.filter((row) => row.id !== quote.id)]);
      onSaved?.(quote);
      toast.success(`Quotation ${quote.quote_number} saved`);
      return quote;
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not save quotation");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const ensureSaved = async () => savedQuote || save();
  const download = async (existingQuote = null) => {
    const quote = existingQuote || await ensureSaved();
    if (!quote) return;
    const { doc, filename } = createQuotationPdf(quote);
    doc.save(filename);
  };
  const shareOnWhatsApp = async (existingQuote = null) => {
    const quote = existingQuote || await ensureSaved();
    if (!quote) return;
    const { doc, filename } = createQuotationPdf(quote);
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
          <div><div className="eyebrow">Inquiry quotation</div><h2 id="quotation-builder-title" className="font-serif text-2xl">Create quote for {inquiry.customer_name}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close quotation builder" className="p-2 text-white/60 hover:text-white"><X size={20} /></button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <section className="grid gap-3 md:grid-cols-3">
              <label className="text-xs text-white/55">Customer name<input aria-label="Customer name" value={form.customer_name} onChange={(e) => change({ customer_name: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
              <label className="text-xs text-white/55">WhatsApp number<input aria-label="WhatsApp number" value={form.customer_phone} onChange={(e) => change({ customer_phone: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
              <label className="text-xs text-white/55">Email<input aria-label="Customer email" value={form.customer_email} onChange={(e) => change({ customer_email: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2.5 text-white" /></label>
            </section>

            <section>
              <div className="mb-2 eyebrow">Products</div>
              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={`${item.product_id || "custom"}-${index}`} className="grid gap-2 border border-white/10 p-3 md:grid-cols-[1fr_90px_130px_40px] md:items-end">
                    <label className="text-xs text-white/55">Product<input aria-label={`Product ${index + 1}`} value={item.name} onChange={(e) => changeItem(index, { name: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /><span className="mt-1 block text-[10px] uppercase tracking-wider text-[#BF9972]">{item.sku ? `SKU ${item.sku}` : "Custom line"}</span></label>
                    <label className="text-xs text-white/55">Quantity<input aria-label={`Quantity ${index + 1}`} type="number" min="1" value={item.quantity} onChange={(e) => changeItem(index, { quantity: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                    <label className="text-xs text-white/55">Unit price (₹)<input aria-label={`Unit price ${index + 1}`} type="number" min="0" value={item.unit_price} onChange={(e) => changeItem(index, { unit_price: e.target.value })} className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 text-white" /></label>
                    <button type="button" aria-label={`Remove product ${index + 1}`} onClick={() => removeItem(index)} className="mb-0.5 p-2 text-white/45 hover:text-red-300"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </section>

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
            <button type="button" onClick={save} disabled={saving || !form.items.length} data-testid="quotation-save" className="flex w-full items-center justify-center gap-2 bg-[#D4AF37] px-4 py-3 text-xs uppercase tracking-[0.2em] text-black disabled:opacity-40">{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />} Save quotation</button>
            <button type="button" onClick={() => download()} disabled={saving || !form.items.length} data-testid="quotation-download" className="flex w-full items-center justify-center gap-2 border border-white/25 px-4 py-3 text-xs uppercase tracking-[0.2em] text-white hover:border-[#D4AF37] disabled:opacity-40"><Download size={15} /> Download PDF</button>
            <button type="button" onClick={() => shareOnWhatsApp()} disabled={saving || !form.customer_phone || !form.items.length} data-testid="quotation-whatsapp" className="flex w-full items-center justify-center gap-2 border border-[#25D366]/50 px-4 py-3 text-xs uppercase tracking-[0.2em] text-[#25D366] hover:bg-[#25D366]/10 disabled:opacity-40"><MessageCircle size={15} /> WhatsApp quotation</button>

            <div className="border-t border-white/10 pt-4">
              <div className="eyebrow mb-3">Saved for this inquiry</div>
              {loadingHistory && <div className="text-xs text-white/40">Loading…</div>}
              {!loadingHistory && !savedQuotes.length && <div className="text-xs text-white/40">No saved quotations yet.</div>}
              <div className="space-y-2">{savedQuotes.map((quote) => <div key={quote.id} className="border border-white/10 p-3"><div className="text-xs text-[#D4AF37]">{quote.quote_number}</div><div className="mt-1 text-[11px] text-white/45">₹{money(quote.total)} · {new Date(quote.created_at).toLocaleDateString("en-IN")}</div><div className="mt-2 flex gap-3"><button type="button" onClick={() => download(quote)} className="text-[10px] uppercase tracking-wider text-white/65 hover:text-white">PDF</button><button type="button" onClick={() => shareOnWhatsApp(quote)} className="text-[10px] uppercase tracking-wider text-[#25D366]">WhatsApp</button></div></div>)}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
