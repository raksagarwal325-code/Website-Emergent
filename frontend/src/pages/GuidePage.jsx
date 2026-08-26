import React from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "../components/SEO";
import SchemaLD from "../components/SchemaLD";
import guides from "../data/guides.json";

export default function GuidePage() {
  const { slug } = useParams();
  const guide = guides.find((g) => g.slug === slug);

  if (!guide) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="font-serif text-4xl">Guide not found</h1>
        <Link to="/guides" className="inline-block mt-8 text-[#D4AF37]">Back to Lighting Guides</Link>
      </div>
    );
  }

  const site = "https://samratglass.com";
  const canonical = `${site}/guides/${guide.slug}`;
  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical}#article`,
    headline: guide.title,
    description: guide.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${canonical}#webpage` },
    author: { "@id": `${site}/#business` },
    publisher: { "@id": `${site}/#business` },
    about: { "@id": `${site}/#business` },
    inLanguage: "en-IN",
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${site}/` },
      { "@type": "ListItem", position: 2, name: "Lighting Guides", item: `${site}/guides` },
      { "@type": "ListItem", position: 3, name: guide.title, item: canonical },
    ],
  };

  return (
    <article className="max-w-4xl mx-auto px-6 py-16">
      <SEO title={guide.seoTitle} description={guide.description} path={`/guides/${guide.slug}`} />
      <SchemaLD id={`guide-${guide.slug}`} data={webpageSchema} />
      <SchemaLD id={`guide-breadcrumb-${guide.slug}`} data={breadcrumbSchema} />

      <nav className="text-xs uppercase tracking-[0.18em] text-white/45 mb-10" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-white">Home</Link> · <Link to="/guides" className="hover:text-white">Lighting Guides</Link>
      </nav>

      <div className="eyebrow mb-4">Lighting Guide</div>
      <h1 className="font-serif text-4xl sm:text-6xl leading-tight">{guide.title}</h1>

      <section className="mt-10 border-l-2 border-[#D4AF37] pl-6 py-1">
        <h2 className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] mb-3">Short answer</h2>
        <p className="text-xl sm:text-2xl font-serif leading-relaxed text-white/90">{guide.answer}</p>
      </section>

      <div className="mt-14 space-y-12">
        {guide.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-serif text-3xl mb-4">{section.heading}</h2>
            <p className="text-white/68 leading-relaxed text-lg">{section.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-16 border-t border-white/10 pt-10">
        <h2 className="font-serif text-3xl mb-6">Continue from the guide</h2>
        <div className="flex flex-wrap gap-3">
          {guide.links.map((link) => (
            <Link key={link.path} to={link.path} className="border border-white/20 hover:border-[#D4AF37] px-5 py-3 text-xs uppercase tracking-[0.18em]">
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <p className="mt-12 text-sm text-white/40 leading-relaxed">
        This guide is general planning advice. Final fixture dimensions, suspension, wiring and installation should be checked against the specific product and site conditions before ordering or installation.
      </p>
    </article>
  );
}
