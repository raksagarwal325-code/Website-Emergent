import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Compass, Layers, Palette, ArrowRight, Users } from "lucide-react";
import SEO from "../components/SEO";
import { CommercialLeadForm } from "./CustomLighting";
import { useSettings } from "../context/SettingsContext";
import { waArchitectsLink } from "../lib/whatsapp";

// `Handshake` was added to lucide-react in a later version; alias to
// `Users` (also-installed here) as a safe fallback so this page never
// fails to render on older lucide builds.
const Handshake = Users;

/**
 * Dedicated landing page for architects and interior designers.
 * The form reuses the existing /api/contact endpoint with
 * `enquiry_type = "trade"` prefilled — no new backend, no new lead model.
 */
export default function ArchitectsDesigners() {
  const { settings } = useSettings();
  const waLink = waArchitectsLink(settings?.whatsapp_number) || "#";

  return (
    <div data-testid="page-architects-designers" className="max-w-7xl mx-auto px-6 py-16">
      <SEO
        title="Lighting for Architects & Interior Designers · Samrat Glass Emporium"
        description="A project-friendly lighting partner for bespoke residential, hospitality and commercial interiors. Direct access to Firozabad craftsmanship, custom finishes and project quantities."
        path="/architects-interior-designers"
      />

      {/* Hero ------------------------------------------------------------ */}
      <section className="mb-20">
        <div className="eyebrow mb-3">For the trade</div>
        <h1
          className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-tight"
          data-testid="architects-designers-h1"
        >
          Lighting for Architects &amp; <span className="italic brand-gradient-text">Interior Designers</span>
        </h1>
        <p className="mt-6 text-white/70 max-w-3xl leading-relaxed">
          A project-friendly lighting partner for bespoke residential, hospitality
          and commercial interiors. Direct access to the Firozabad workshop, custom
          finishes on request, and comfortable working from your drawings and
          references.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#lead-form"
            data-testid="architects-designers-cta-primary"
            className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]"
          >
            Discuss a project <ArrowRight size={14} />
          </a>
          {waLink !== "#" && (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              data-testid="architects-designers-cta-wa"
              className="inline-flex items-center gap-2 border border-[#25D366] text-[#25D366] px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#25D366] hover:text-black transition-colors"
            >
              <MessageCircle size={14} /> WhatsApp us
            </a>
          )}
        </div>
      </section>

      {/* What we support ------------------------------------------------- */}
      <section className="mb-20" data-testid="architects-designers-support">
        <div className="eyebrow mb-4">What we support</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-10 max-w-3xl">
          Where our workshop fits into a design practice.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            [Compass, "Custom lighting development", "New fixture designs developed from your sketch, mood board or reference image."],
            [Layers, "Project-specific dimensions & finishes", "Non-standard sizes, bespoke arm counts, custom glass tints and metalwork."],
            [Palette, "Design references & drawings", "Send CAD, PDFs, physical samples — we work off what you already produce."],
            [Handshake, "Coordinated product selection", "Matched fixture families across a project — foyer, dining, staircase, guest rooms."],
            [Layers, "Bulk / project quantities", "Comfortable running production sized for full residences, hotels and multi-unit developments."],
            [Compass, "Repeat project support", "Consistent finishes, records of prior specs, and a stable point of contact between projects."],
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

      {/* Why work with us ----------------------------------------------- */}
      <section className="mb-20" data-testid="architects-designers-why">
        <div className="eyebrow mb-4">Why work with us</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-8 max-w-3xl">
          Workshop-direct — flexibility beyond a standard catalogue product.
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3 text-white/75">
          {[
            "Direct access to Firozabad craftsmen — no reseller layer",
            "Flexibility beyond standard catalogue products",
            "Custom glass, brass finishes and proportions",
            "Assistance matching your design intent",
            "Project-oriented communication and timelines",
            "Coordinated packing and freight for site delivery",
          ].map((s) => (
            <li key={s} className="flex items-start gap-3">
              <span className="mt-1 inline-block h-1.5 w-1.5 bg-[#D4AF37] flex-shrink-0" />
              <span className="text-sm leading-relaxed">{s}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Project types --------------------------------------------------- */}
      <section className="mb-20" data-testid="architects-designers-projects">
        <div className="eyebrow mb-4">Project types</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-8 max-w-3xl">
          Where our fixtures usually end up.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "Villas and residences",
            "Hotels and restaurants",
            "Retail and showrooms",
            "Wedding and banquet venues",
            "Offices and hospitality spaces",
            "Heritage and temple restorations",
          ].map((p) => (
            <div
              key={p}
              className="border border-white/10 px-5 py-4 text-sm text-white/70 bg-[#0d0510]"
            >
              {p}
            </div>
          ))}
        </div>
      </section>

      {/* Lead form ------------------------------------------------------- */}
      <CommercialLeadForm
        enquiryType="trade"
        heading="Tell us about your project."
        subheading="We usually respond within a few business hours and aim to reply within one business day."
        subjectPlaceholder="Project name / studio / site location"
        messagePlaceholder="Share the brief, scope, quantities, references, drawings or a mood board…"
        analyticsSource="architects_designers_landing"
        testIdPrefix="architects-designers"
      />

      <p className="mt-10 text-xs text-white/40 uppercase tracking-[0.24em]">
        Prefer WhatsApp? <a href={waLink} target="_blank" rel="noreferrer" className="text-[#D4AF37] hover:underline">Message us directly</a>. Or return to the <Link to="/contact" className="text-[#D4AF37] hover:underline">contact page</Link>.
      </p>
    </div>
  );
}
