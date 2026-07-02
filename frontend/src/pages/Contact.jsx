import React, { useEffect, useState } from "react";
import { MessageCircle, Mail, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => { api.getSettings().then(setSettings).catch(() => {}); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Name, email and message are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.createContact(form);
      toast.success("Message received. We'll respond shortly.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast.error("Could not send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="page-contact" className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-5">
          <div className="eyebrow mb-3">Get in touch</div>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight">Private enquiries, viewings & bespoke.</h1>
          <p className="mt-6 text-white/60 leading-relaxed">
            We respond to every message within one working day. For urgent requests, WhatsApp is the fastest way to reach us.
          </p>

          <div className="mt-10 space-y-4 text-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-white/15 flex items-center justify-center"><Mail size={14} /></div>
              <span data-testid="contact-email">{settings?.admin_email || "hello@lumiere.co"}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-white/15 flex items-center justify-center"><MessageCircle size={14} /></div>
              <span data-testid="contact-wa">{settings?.whatsapp_number || "—"}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-white/15 flex items-center justify-center"><MapPin size={14} /></div>
              <span>By appointment · Como, Italy</span>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="lg:col-span-7 border border-white/10 p-10 space-y-5">
          <input required data-testid="contact-name" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm" />
          <input required type="email" data-testid="contact-email-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm" />
          <input data-testid="contact-subject" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm" />
          <textarea required data-testid="contact-message" placeholder="Your message" rows="7" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm resize-none" />
          <button disabled={submitting} data-testid="contact-submit-btn" className="bg-[#D4AF37] text-black px-10 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] disabled:opacity-50">
            {submitting ? "Sending…" : "Send message"}
          </button>
        </form>
      </div>
    </div>
  );
}
