import React, { useEffect, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import DEFAULT_BUSINESS from "../../constants/quotationBusiness.json";

const BUSINESS_LABELS = { name: "Company / account name", address: "Company address", gstin: "GSTIN", whatsapp: "WhatsApp number", email: "Email", bank: "Bank name", branch: "Branch", accountType: "Account type", accountNumber: "Account number", ifsc: "IFSC", signatory: "Authorised signatory" };

const ASSETS = [
  { kind: "signature", label: "Authorised signature", hint: "Transparent PNG preferred; a wide handwritten signature works best." },
  { kind: "stamp", label: "Company stamp", hint: "Transparent PNG preferred; use a clear square or circular stamp." },
];

export default function QuotationBrandingAdmin({ settings, onSave }) {
  const [branding, setBranding] = useState(settings?.quotation_branding || {});
  const [busy, setBusy] = useState("");
  const [business, setBusiness] = useState({ ...DEFAULT_BUSINESS, ...settings?.quotation_business });
  const saveBusiness = async () => {
    setBusy("business");
    try {
      await api.updateSettings({ quotation_business: business });
      toast.success("Quotation business details saved");
      onSave?.();
    } catch (_) { toast.error("Could not save business details"); }
    finally { setBusy(""); }
  };

  useEffect(() => {
    setBranding(settings?.quotation_branding || {});
    setBusiness({ ...DEFAULT_BUSINESS, ...settings?.quotation_business });
  }, [settings]);

  const upload = async (kind, file) => {
    if (!file) return;
    setBusy(kind);
    try {
      const next = await api.adminUploadQuotationBrandAsset(kind, file);
      setBranding(next || {});
      toast.success(`${kind === "stamp" ? "Company stamp" : "Signature"} saved`);
      onSave?.();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not upload quotation branding");
    } finally {
      setBusy("");
    }
  };

  const clear = async (kind) => {
    setBusy(kind);
    try {
      const next = await api.adminClearQuotationBrandAsset(kind);
      setBranding(next || {});
      toast.success(`${kind === "stamp" ? "Company stamp" : "Signature"} removed`);
      onSave?.();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not remove quotation branding");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="max-w-2xl border border-white/10 p-8" data-testid="quotation-branding-admin">
      <div className="eyebrow">Quotation business details</div>
      <p className="mt-2 text-sm text-white/55">Edit the company and payment details used on new quotations. Previously saved quotations retain their saved details.</p>
      <div className="my-5 grid gap-3 md:grid-cols-2">{Object.entries(BUSINESS_LABELS).map(([key, label]) => <label key={key} className="text-xs text-white/65">{label}<input aria-label={label} value={business[key] || ""} onChange={e => setBusiness(current => ({ ...current, [key]: e.target.value }))} className="mt-1 w-full border border-white/15 bg-black/40 p-3 text-white" /></label>)}</div>
      <button type="button" disabled={Boolean(busy)} onClick={saveBusiness} className="mb-8 bg-[#D4AF37] px-4 py-3 text-black disabled:opacity-50">Save business details</button>
      <div className="eyebrow">Quotation branding</div>
      <h3 className="mt-1 font-serif text-2xl">Signature & company stamp</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        Upload once and these images will be applied automatically to newly created quotations. Existing saved quotations without branding will also use the current assets.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {ASSETS.map(({ kind, label, hint }) => {
          const url = branding?.[`${kind}_url`] || "";
          return (
            <div key={kind} className="border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/65">{label}</div>
              <div className="mt-3 flex h-28 items-center justify-center border border-dashed border-white/15 bg-white/95 p-3">
                {url ? (
                  <img src={api.resolveImage(url)} alt={`${label} preview`} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-black/45">Not uploaded</span>
                )}
              </div>
              <p className="mt-2 min-h-[2.5rem] text-xs leading-relaxed text-white/40">{hint}</p>
              <div className="mt-3 flex gap-2">
                <label className={`inline-flex cursor-pointer items-center gap-2 border border-[#D4AF37]/50 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#D4AF37] ${busy ? "pointer-events-none opacity-50" : ""}`}>
                  <Upload size={12} /> {busy === kind ? "Uploading..." : url ? "Replace" : "Upload"}
                  <input
                    data-testid={`quotation-${kind}-upload`}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={Boolean(busy)}
                    onChange={(event) => upload(kind, event.target.files?.[0])}
                  />
                </label>
                {url && (
                  <button
                    type="button"
                    data-testid={`quotation-${kind}-remove`}
                    disabled={Boolean(busy)}
                    onClick={() => clear(kind)}
                    className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/55 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
