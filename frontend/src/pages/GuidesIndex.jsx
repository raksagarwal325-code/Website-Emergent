import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import SchemaLD from "../components/SchemaLD";
import guides from "../data/guides.json";

export default function GuidesIndex() {
  const site = "https://samratglass.com";
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${site}/guides#webpage`,
    url: `${site}/guides`,
    name: "Lighting Guides — Samrat Glass Emporium",
    description: "Practical chandelier and decorative-lighting guidance from Samrat Glass Emporium, Firozabad.",
    isPartOf: { "@id": `${site}/#website` },
    about: { "@id": `${site}/#business` },
    inLanguage: "en-IN",
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <SEO
        title="Lighting Guides · Chandeliers, Wall Lights & Project Advice | Samrat Glass"
        description="Practical chandelier sizing, hanging-height, wall-light, customisation and project-lighting guides from Samrat Glass Emporium, Firozabad."
        path="/guides"
      />
      <SchemaLD id="guides-index" data={schema} />

      <div className="max-w-3xl mb-14">
        <div className="eyebrow mb-4">Lighting Advice</div>
        <h1 className="font-serif text-4xl sm:text-6xl leading-tight">Practical lighting guides for real interiors</h1>
        <p className="mt-6 text-white/65 leading-relaxed text-lg">
          Clear answers on chandelier scale, hanging height, wall-light placement, customisation,
          Firozabad craftsmanship and project coordination — connected to the products and real
          installations that illustrate each topic.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            to={`/guides/${guide.slug}`}
            className="border border-white/10 hover:border-[#D4AF37]/60 p-7 transition-colors group"
          >
            <div className="text-[10px] uppercase tracking-[0.28em] text-[#D4AF37] mb-3">Samrat Glass Guide</div>
            <h2 className="font-serif text-2xl leading-snug group-hover:text-[#D4AF37] transition-colors">{guide.title}</h2>
            <p className="mt-4 text-white/55 leading-relaxed">{guide.description}</p>
            <span className="inline-block mt-6 text-xs uppercase tracking-[0.2em] text-white/75">Read guide →</span>
          </Link>
        ))}
      </div>

      <div className="mt-16 border-t border-white/10 pt-10 flex flex-wrap gap-4">
        <Link to="/catalog" className="border border-white/20 px-5 py-3 text-xs uppercase tracking-[0.2em] hover:border-[#D4AF37]">Browse Catalogue</Link>
        <Link to="/gallery" className="border border-white/20 px-5 py-3 text-xs uppercase tracking-[0.2em] hover:border-[#D4AF37]">Real Installations</Link>
        <Link to="/custom-lighting-bulk-orders" className="border border-white/20 px-5 py-3 text-xs uppercase tracking-[0.2em] hover:border-[#D4AF37]">Custom Lighting</Link>
      </div>
    </div>
  );
}
