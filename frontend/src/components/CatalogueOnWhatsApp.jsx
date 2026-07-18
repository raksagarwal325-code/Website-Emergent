import React, { useState } from "react";
import { Download, MessageCircle, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { trackCatalogueDownload, trackWhatsAppClick, trackGenerateLead } from "../lib/analytics";

// Normalize an Indian mobile — accepts 10 digits, +91 prefix, or a paste with
// spaces / hyphens / brackets. Returns { ok, digits, e164 }.
function parsePhone(raw) {
  const digits = String(raw || "").replace(/[^0-9]/g, "");
  if (digits.length === 10) {
    return { ok: true, digits, e164: `91${digits}` };
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return { ok: true, digits: digits.slice(2), e164: digits };
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return { ok: true, digits: digits.slice(1), e164: `91${digits.slice(1)}` };
  }
  return { ok: false, digits, e164: null };
}

export default function CatalogueOnWhatsApp({ businessWhatsAppNumber }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { catalogueUrl, waLink }

  const business = String(businessWhatsAppNumber || "").replace(/[^0-9]/g, "");

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    const parsed = parsePhone(phone);
    if (!parsed.ok) {
      toast.error("Please enter a valid 10-digit Indian mobile number");
      return;
    }
    setSubmitting(true);
    try {
      await api.requestCatalogue(name.trim(), `+${parsed.e164}`, "contact_page");
      trackGenerateLead({ source: "catalogue_request" });
      // Build the deep links.
      const catalogueUrl = `${window.location.origin}/catalogue?print=1`;
      // wa.me link — opens WhatsApp on visitor's device with a message pre-filled
      // to the BUSINESS number.
      const message =
        `Hi Samrat Glass Emporium 👋\n\n` +
        `I'm ${name.trim()} and I'd love to receive your product catalogue.\n\n` +
        `My contact: +${parsed.e164}\n` +
        `Catalogue link (in case it helps): ${catalogueUrl}`;
      const waLink = business
        ? `https://wa.me/${business}?text=${encodeURIComponent(message)}`
        : "";
      setDone({ catalogueUrl, waLink });
      toast.success("Details saved — opening WhatsApp");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not send request");
    } finally {
      setSubmitting(false);
    }
  };

  // Success state — offers two actions: download PDF now + open WhatsApp.
  if (done) {
    return (
      <div
        data-testid="catalogue-wa-success"
        className="border border-[#25D366]/50 p-6 md:p-8"
        style={{ background: "linear-gradient(180deg, rgba(37,211,102,0.08), transparent), #0d0510" }}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 size={22} strokeWidth={1.8} className="text-[#25D366] flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-serif text-xl">Thanks, {name.split(" ")[0]}!</div>
            <p className="mt-1 text-sm text-white/60 leading-relaxed">
              We&apos;ve saved your number. Your catalogue is ready — download instantly, or open
              WhatsApp and we&apos;ll send it directly.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href={done.catalogueUrl}
            target="_blank"
            rel="noreferrer"
            data-testid="catalogue-wa-download-btn"
            onClick={() => trackCatalogueDownload("whatsapp_flow")}
            className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]"
          >
            <Download size={14} /> Download PDF now
          </a>
          {done.waLink && (
            <a
              href={done.waLink}
              target="_blank"
              rel="noreferrer"
              data-testid="catalogue-wa-open-btn"
              onClick={() => trackWhatsAppClick({ source: "catalogue_request", page: "/contact" })}
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-black px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#1EB554]"
            >
              <MessageCircle size={14} /> Open in WhatsApp
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setDone(null); setName(""); setPhone(""); }}
          className="mt-4 text-[10px] uppercase tracking-[0.24em] text-white/40 hover:text-[#D4AF37]"
        >
          Request another copy
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      data-testid="catalogue-wa-form"
      className="border border-[#D4AF37]/35 p-6 md:p-7"
      style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.05), transparent), #0d0510" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 flex items-center justify-center rounded-full border border-[#D4AF37]/60 text-[#D4AF37] flex-shrink-0">
          <FileText size={16} strokeWidth={1.7} />
        </div>
        <div>
          <div className="eyebrow mb-1">Get our catalogue on WhatsApp</div>
          <div className="font-serif text-xl leading-tight">
            The full 27-page lookbook, straight to your phone.
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          required
          data-testid="catalogue-wa-name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm"
        />
        <div className="flex bg-[#0a0a0a] border border-white/15 focus-within:border-[#D4AF37]">
          <span className="px-3 py-3 text-sm text-white/40 border-r border-white/10">+91</span>
          <input
            required
            data-testid="catalogue-wa-phone"
            type="tel"
            inputMode="numeric"
            maxLength={14}
            placeholder="10-digit mobile"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 bg-transparent outline-none px-3 py-3 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        data-testid="catalogue-wa-submit"
        className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] text-black px-8 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#1EB554] disabled:opacity-50"
      >
        <MessageCircle size={14} />
        {submitting ? "Sending…" : "Send catalogue on WhatsApp"}
      </button>
      <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/35">
        We&apos;ll only use your number to send the catalogue and follow up on your enquiry.
      </p>
    </form>
  );
}
