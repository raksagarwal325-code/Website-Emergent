import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Mail, MapPin, Phone, FileText, Truck, CreditCard } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import GoogleReviews from "../components/GoogleReviews";
import CatalogueOnWhatsApp from "../components/CatalogueOnWhatsApp";
import SEO from "../components/SEO";
import { ENQUIRY_TYPES, resolveEnquiryType } from "../lib/enquiryTypes";
import { trackGenerateLead } from "../lib/analytics";

export default function Contact() {
  const location = useLocation();
  const initialType = useMemo(
    () => resolveEnquiryType(new URLSearchParams(location.search).get("type")),
    [location.search],
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    enquiry_type: initialType,
  });
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => { api.getSettings().then(setSettings).catch(() => {}); }, []);

  // If the visitor navigates between /contact?type=bulk and /contact?type=trade
  // without a full page reload, keep the select in sync (but don't clobber a
  // change the user has made — we only reset the enquiry_type field).
  useEffect(() => {
    setForm((f) => (f.enquiry_type === initialType ? f : { ...f, enquiry_type: initialType }));
  }, [initialType]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Name, email and message are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.createContact(form);
      trackGenerateLead({ source: "contact_form", enquiry_type: form.enquiry_type });
      toast.success("Message received. We'll respond shortly.");
      setForm({ name: "", email: "", subject: "", message: "", enquiry_type: initialType });
    } catch {
      toast.error("Could not send message");
    } finally {
      setSubmitting(false);
    }
  };

  const waNumber = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent("Hello Samrat Glass Emporium, I would like to enquire.")}` : "#";

  return (
    <div data-testid="page-contact" className="max-w-7xl mx-auto px-6 py-16">
      <SEO
        title="Contact · Samrat Glass Emporium · Firozabad Chandeliers"
        description="Speak to us on WhatsApp, call, email or visit our Firozabad showroom. Custom lighting for homes, hotels, weddings and luxury interiors."
        path="/contact"
      />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-5 mb-6">
            <img src="/logo.jpeg" alt="Samrat Glass Emporium" className="w-20 h-20 object-cover brand-glow" />
            <div>
              <div className="eyebrow mb-1">Get in touch</div>
              <div className="font-serif text-lg brand-gradient-text">Samrat Glass Emporium</div>
            </div>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight">Enquiries, custom sizes &amp; bulk orders.</h1>
          <p className="mt-6 text-white/60 leading-relaxed">
            We&apos;re happy to help with product recommendations, installation guidance, custom-sized pieces, and bulk orders for weddings, showrooms and hotels.
          </p>

          <div className="mt-10 space-y-4 text-sm">
            {[
              [Phone, "Phone / WhatsApp", settings?.whatsapp_number || "+91-8920392937", waLink],
              [Mail, "Email", settings?.admin_email || "samratglassemp@gmail.com", `mailto:${settings?.admin_email || "samratglassemp@gmail.com"}`],
              [MapPin, "Showroom", settings?.address || "Raniwala Market, Babboo Ji Ki Jeen, Firozabad – 283203"],
              [FileText, "GSTIN", settings?.gstin || "09ADCFS9258D1ZS"],
              [Truck, "Delivery", settings?.delivery_info || "Pan-India shipping · 7–10 business days"],
              [CreditCard, "Payments", settings?.payment_methods || "UPI · Net Banking"],
            ].map(([Icon, label, val, href], i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 border border-white/15 flex items-center justify-center flex-shrink-0"><Icon size={14} /></div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">{label}</div>
                  {href ? (
                    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="text-white hover:text-[#D4AF37]">{val}</a>
                  ) : (
                    <div className="text-white leading-relaxed">{val}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <a
            data-testid="contact-wa-btn"
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 border border-[#D4AF37] text-[#D4AF37] px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#D4AF37] hover:text-black transition-colors"
          >
            <MessageCircle size={14} /> Chat on WhatsApp
          </a>

          {/* Get catalogue on WhatsApp — captures the lead + delivers the PDF */}
          <div className="mt-8">
            <CatalogueOnWhatsApp businessWhatsAppNumber={settings?.whatsapp_number} />
          </div>
        </div>

        <form onSubmit={submit} className="lg:col-span-7 border border-white/10 p-8 md:p-10 space-y-5 h-fit">
          <div>
            <div className="eyebrow mb-1">Send a message</div>
            <div className="font-serif text-2xl">We&apos;ll reply within hours.</div>
          </div>
          <input required data-testid="contact-name" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm" />
          <input required type="email" data-testid="contact-email-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm" />

          <div>
            <label htmlFor="enquiry-type" className="block text-[10px] uppercase tracking-[0.24em] text-white/50 mb-2">Enquiry type</label>
            <select
              id="enquiry-type"
              data-testid="contact-enquiry-type"
              value={form.enquiry_type}
              onChange={(e) => setForm({ ...form, enquiry_type: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm"
            >
              {ENQUIRY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <input data-testid="contact-subject" placeholder="Subject (e.g., custom chandelier for hall)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm" />
          <textarea required data-testid="contact-message" placeholder="Tell us about your requirement, ceiling height, or bulk quantity…" rows="7" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm resize-none" />
          <button disabled={submitting} data-testid="contact-submit-btn" className="bg-[#D4AF37] text-black px-10 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] disabled:opacity-50">
            {submitting ? "Sending…" : "Send message"}
          </button>
        </form>
      </div>

      {/* Google Reviews */}
      <div className="mt-20">
        <GoogleReviews />
      </div>
    </div>
  );
}
