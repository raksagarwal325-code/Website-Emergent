import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Sparkles, Ruler, Package, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import SEO from "../components/SEO";
import { api } from "../lib/api";
import { trackGenerateLead } from "../lib/analytics";
import { useSettings } from "../context/SettingsContext";
import { waCustomLightingLink } from "../lib/whatsapp";
import { normalizePhone } from "../lib/phone";

/**
 * Dedicated landing page for custom lighting & bulk-order enquiries.
 * The form reuses the existing `/api/contact` endpoint with
 * `enquiry_type = "bulk"` prefilled — no new backend, no new lead model.
 */
export default function CustomLighting() {
  const { settings } = useSettings();
  const waLink = waCustomLightingLink(settings?.whatsapp_number) || "#";

  return (
    <div data-testid="page-custom-lighting" className="max-w-7xl mx-auto px-6 py-16">
      <SEO
        title="Custom Chandelier & Decorative Lighting Manufacturer India | Samrat Glass"
        description="Custom chandeliers and made-to-order decorative lighting from Firozabad, India — selected sizes, finishes, glass colours, light counts and project quantities by Samrat Glass Emporium."
        path="/custom-lighting-bulk-orders"
      />

      {/* Hero ------------------------------------------------------------ */}
      <section className="mb-20">
        <div className="eyebrow mb-3">Made in India · Made to order</div>
        <h1
          className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-tight"
          data-testid="custom-lighting-h1"
        >
          Custom Chandeliers &amp; <span className="italic brand-gradient-text">Decorative Lighting</span>
        </h1>
        <p className="mt-6 text-white/70 max-w-3xl leading-relaxed">
          Made-to-order chandeliers and decorative lighting for residences, hospitality,
          retail and large-scale projects across India. Selected designs can be evaluated
          for changes in scale, finish, glass colour, light count or configuration, with
          production coordinated through our Firozabad workshop.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#lead-form"
            data-testid="custom-lighting-cta-primary"
            className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]"
          >
            Discuss your requirement <ArrowRight size={14} />
          </a>
          {waLink !== "#" && (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              data-testid="custom-lighting-cta-wa"
              className="inline-flex items-center gap-2 border border-[#25D366] text-[#25D366] px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#25D366] hover:text-black transition-colors"
            >
              <MessageCircle size={14} /> WhatsApp us
            </a>
          )}
        </div>
      </section>

      {/* Why choose Samrat Glass ---------------------------------------- */}
      <section className="mb-20" data-testid="custom-lighting-why">
        <div className="eyebrow mb-4">Why Samrat Glass</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-10 max-w-3xl">
          A workshop-direct partner for one-off pieces and full-project quantities.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            [Sparkles, "Handcrafted in Firozabad", "Handcrafted glass and metalwork using processes appropriate to each design, coordinated directly with our Firozabad workshop."],
            [Ruler, "Custom sizes & specifications", "Bespoke dimensions, finishes, glass colours, arm counts and light configurations."],
            [Package, "Bulk & project quantities", "Comfortable running production runs sized for hotels, residences and multi-unit developments."],
            [ShieldCheck, "Direct manufacturer coordination", "You talk to the workshop, not a reseller — faster clarifications, faster decisions."],
            [Package, "Project packing & dispatch", "Crated for long-haul freight; site-delivery timelines and handling briefs are confirmed with you."],
            [Sparkles, "Design-team friendly", "Drawings, mood boards and material samples welcome — we work off your specification."],
          ].map(([Icon, title, body], i) => (
            <div key={i} className="border border-white/10 p-6 bg-[#0d0510]">
              <div className="w-10 h-10 border border-[#D4AF37]/40 flex items-center justify-center mb-4 text-[#D4AF37]">
                <Icon size={16} strokeWidth={1.5} />
              </div>
              <div className="font-serif text-lg mb-1">{title}</div>
              <p className="text-sm text-white/60 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What we can customise ------------------------------------------ */}
      <section className="mb-20" data-testid="custom-lighting-scope">
        <div className="eyebrow mb-4">What we can customise</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-8 max-w-3xl">
          Every product family in our catalogue — plus components you don&apos;t see there.
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3 text-white/75">
          {[
            "Chandeliers — multi-tier, single-tier, three-arm",
            "Hanging lights and pendant clusters",
            "Wall lights and sconces",
            "Table and floor lamps",
            "Ceiling lights — flush and semi-flush",
            "Gate lights and exterior lanterns",
            "Custom glass components and hurricane covers",
            "Coordinated fixture families across a project",
          ].map((s) => (
            <li key={s} className="flex items-start gap-3">
              <span className="mt-1 inline-block h-1.5 w-1.5 bg-[#D4AF37] flex-shrink-0" />
              <span className="text-sm leading-relaxed">{s}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works ---------------------------------------------------- */}
      <section className="mb-20" data-testid="custom-lighting-process">
        <div className="eyebrow mb-4">How it works</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-10 max-w-3xl">
          Five steps from your brief to crated dispatch.
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-5 gap-5">
          {[
            ["01", "Share reference", "Send drawings, reference images or a written spec — quantities help too."],
            ["02", "Design & feasibility", "We confirm what&apos;s doable and where we&apos;d suggest an adjustment."],
            ["03", "Sample & spec sign-off", "Physical or photo samples, plus a written spec you approve before we start."],
            ["04", "Production", "Hand-assembled in Firozabad against your approved specification."],
            ["05", "Pack & dispatch", "Crated for freight; delivery timelines confirmed and tracked."],
          ].map(([n, title, body]) => (
            <li key={n} className="border border-white/10 p-5 bg-[#0d0510]">
              <div className="text-[#D4AF37] text-xs tracking-[0.28em] mb-3">{n}</div>
              <div className="font-serif text-base mb-1">{title}</div>
              <p
                className="text-xs text-white/55 leading-relaxed"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: body }}
              />
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-16 border-t border-white/10 pt-8" data-testid="custom-lighting-related-resources">
        <div className="eyebrow mb-3">Related project resources</div>
        <h2 className="font-serif text-2xl sm:text-3xl">Continue with the most relevant planning page.</h2>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
          <Link to="/chandelier-manufacturer-india" className="text-sm text-[#BF9972] hover:text-[#D4AF37] border-b border-white/10 pb-1">Chandelier manufacturer in India →</Link>
          <Link to="/double-height-chandeliers-india" className="text-sm text-[#BF9972] hover:text-[#D4AF37] border-b border-white/10 pb-1">Double-height chandelier planning →</Link>
          <Link to="/architects-interior-designers" className="text-sm text-[#BF9972] hover:text-[#D4AF37] border-b border-white/10 pb-1">For architects & interior designers →</Link>
          <Link to="/gallery" className="text-sm text-[#BF9972] hover:text-[#D4AF37] border-b border-white/10 pb-1">Real installations →</Link>
        </div>
      </section>

      {/* Lead form ------------------------------------------------------- */}
      <CommercialLeadForm
        enquiryType="bulk"
        heading="Tell us about your project."
        subheading="We usually respond within a few business hours and aim to reply within one business day."
        subjectPlaceholder="Subject (e.g., 40 pendants for a boutique hotel)"
        messagePlaceholder="Share quantities, timelines, dimensions, references or drawings…"
        analyticsSource="custom_lighting_landing"
        testIdPrefix="custom-lighting"
      />

      <p className="mt-10 text-xs text-white/40 uppercase tracking-[0.24em]">
        Prefer WhatsApp? <a href={waLink} target="_blank" rel="noreferrer" className="text-[#D4AF37] hover:underline">Message us directly</a>. Or return to the <Link to="/contact" className="text-[#D4AF37] hover:underline">contact page</Link>.
      </p>
    </div>
  );
}

/**
 * Small local form that submits to the same /api/contact endpoint used by
 * the primary Contact page, with the enquiry_type prefilled. Kept inline
 * (not lifted to a shared component) so each landing page's copy is easy
 * to iterate on without cross-page regressions.
 */
export function CommercialLeadForm({
  enquiryType,
  heading,
  subheading,
  subjectPlaceholder,
  messagePlaceholder,
  analyticsSource,
  testIdPrefix,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    enquiry_type: enquiryType,
  });
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const fieldId = (name) => `${testIdPrefix}-form-${name}`;
  const phoneErrorId = `${fieldId("phone")}-error`;
  const headingId = `${testIdPrefix}-form-heading`;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Name, email and message are required");
      return;
    }
    const p = normalizePhone(form.phone);
    if (!p.ok) {
      setPhoneError(p.error);
      toast.error(p.error);
      return;
    }
    setPhoneError("");
    setSubmitting(true);
    try {
      await api.createContact({ ...form, phone: p.value });
      trackGenerateLead({ source: analyticsSource, enquiry_type: enquiryType });
      toast.success("Message received. We'll respond shortly.");
      setDone(true);
      setForm({ name: "", email: "", phone: "", subject: "", message: "", enquiry_type: enquiryType });
    } catch {
      toast.error("Could not send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      id="lead-form"
      onSubmit={submit}
      aria-labelledby={headingId}
      data-testid={`${testIdPrefix}-form`}
      className="border border-white/10 p-8 md:p-10 space-y-5 bg-[#0d0510]"
    >
      <div>
        <div className="eyebrow mb-1">Send a message</div>
        <h2 id={headingId} className="font-serif text-2xl">{heading}</h2>
        {subheading && (
          <p
            className="mt-2 text-sm text-white/50"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: subheading }}
          />
        )}
      </div>
      {done && (
        <div
          role="status"
          aria-live="polite"
          data-testid={`${testIdPrefix}-form-success`}
          className="border border-[#25D366]/40 p-4 text-sm text-[#25D366]"
        >
          Thanks — your enquiry has been recorded. We&apos;ll be in touch shortly.
        </div>
      )}

      <div>
        <label htmlFor={fieldId("name")} className="sr-only">Full name</label>
        <input
          id={fieldId("name")}
          name="name"
          required
          autoComplete="name"
          data-testid={`${testIdPrefix}-form-name`}
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label htmlFor={fieldId("email")} className="sr-only">Email address</label>
        <input
          id={fieldId("email")}
          name="email"
          required
          type="email"
          autoComplete="email"
          data-testid={`${testIdPrefix}-form-email`}
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label htmlFor={fieldId("phone")} className="sr-only">Mobile or WhatsApp number</label>
        <input
          id={fieldId("phone")}
          name="phone"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={phoneError ? "true" : undefined}
          aria-describedby={phoneError ? phoneErrorId : undefined}
          data-testid={`${testIdPrefix}-form-phone`}
          placeholder="Mobile / WhatsApp Number"
          value={form.phone}
          onChange={(e) => {
            setForm({ ...form, phone: e.target.value });
            if (phoneError) setPhoneError("");
          }}
          className={`w-full bg-[#0a0a0a] border ${phoneError ? "border-red-500/70" : "border-white/15"} focus:border-[#D4AF37] outline-none px-4 py-3 text-sm`}
        />
        {phoneError && (
          <div
            id={phoneErrorId}
            role="alert"
            data-testid={`${testIdPrefix}-form-phone-error`}
            className="mt-1.5 text-xs text-red-400"
          >
            {phoneError}
          </div>
        )}
      </div>

      <div>
        <label htmlFor={fieldId("subject")} className="sr-only">Subject</label>
        <input
          id={fieldId("subject")}
          name="subject"
          data-testid={`${testIdPrefix}-form-subject`}
          placeholder={subjectPlaceholder}
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label htmlFor={fieldId("message")} className="sr-only">Project details</label>
        <textarea
          id={fieldId("message")}
          name="message"
          required
          rows="7"
          data-testid={`${testIdPrefix}-form-message`}
          placeholder={messagePlaceholder}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm resize-none"
        />
      </div>

      {/* Hidden enquiry-type input so the value is visible in the DOM for
          testing and submitted as part of the form data set. */}
      <input
        type="hidden"
        name="enquiry_type"
        data-testid={`${testIdPrefix}-form-enquiry-type`}
        value={form.enquiry_type}
        readOnly
      />
      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting ? "true" : "false"}
        data-testid={`${testIdPrefix}-form-submit`}
        className="bg-[#D4AF37] text-black px-10 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
