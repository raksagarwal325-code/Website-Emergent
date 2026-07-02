import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, MessageCircle } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

function FAQItem({ q, a, defaultOpen = false, index }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-testid={`faq-item-${index}`} className="border border-white/10 hover:border-[#D4AF37]/40 transition-colors">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 md:px-6 py-5 text-left group"
        data-testid={`faq-toggle-${index}`}
      >
        <span className="font-serif text-base md:text-lg text-white group-hover:text-[#D4AF37] transition-colors pr-4">{q}</span>
        <ChevronDown size={18} className={`flex-shrink-0 text-[#D4AF37] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 md:px-6 pb-6 pt-1 text-white/70 leading-relaxed text-sm md:text-[15px] whitespace-pre-line">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const { hp, settings } = useSettings();
  const faq = hp.faq || {};
  const items = (faq.items || []).filter((it) => (it?.q || "").trim() && (it?.a || "").trim());

  useEffect(() => {
    document.title = "FAQ · Samrat Glass Emporium";
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, []);

  const waRaw = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waLink = waRaw
    ? `https://wa.me/${waRaw}?text=${encodeURIComponent("Hi Rakshit ji, I have a question about Samrat Glass Emporium.")}`
    : "";

  return (
    <div data-testid="page-faq" className="relative min-h-screen">
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ background: "radial-gradient(ellipse at 50% 0%, #D4AF37 0%, transparent 55%)" }}></div>

      <div className="relative max-w-4xl mx-auto px-6 pt-16 md:pt-24 pb-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/40 mb-8" aria-label="breadcrumb">
          <Link to="/" className="hover:text-[#D4AF37] transition-colors">Home</Link>
          <ChevronRight size={12} className="text-white/25" />
          <span className="text-white/70">Frequently Asked</span>
        </nav>

        {/* Title */}
        <div className="border-b border-[#BF9972]/25 pb-8 mb-10">
          <div className="eyebrow mb-3">{faq.eyebrow || "Support"}</div>
          <h1 className="font-serif text-4xl sm:text-5xl leading-[1.1] text-white">
            {faq.title_pre || "Frequently"} <span className="brand-gradient-text italic">{faq.title_highlight || "Asked"}</span>
          </h1>
          {faq.tagline && (
            <p className="mt-4 text-white/60 text-base md:text-lg font-serif italic max-w-xl">{faq.tagline}</p>
          )}
        </div>

        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((it, i) => (
              <FAQItem key={i} q={it.q} a={it.a} index={i} defaultOpen={i === 0} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-white/50 border border-white/10">
            <p className="font-serif italic">Answers to common questions will appear here soon.</p>
          </div>
        )}

        {/* Contact fallback */}
        <div className="mt-16 border border-[#BF9972]/30 p-6 md:p-8 relative overflow-hidden" style={{ background: "linear-gradient(90deg, rgba(163,99,80,0.14), transparent)" }}>
          <div className="eyebrow mb-2">Still need help?</div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="font-serif text-xl md:text-2xl leading-snug max-w-lg">
              Speak to us directly — quick replies on WhatsApp, or write in and we&apos;ll get back within a business day.
            </p>
            <div className="flex flex-wrap gap-3 flex-shrink-0">
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer" data-testid="faq-whatsapp-btn"
                   className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">
                  <MessageCircle size={14} /> Chat on WhatsApp
                </a>
              )}
              <Link to="/contact" className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-6 py-3 uppercase text-xs tracking-[0.28em] text-white/80 hover:text-white">
                Write to us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
