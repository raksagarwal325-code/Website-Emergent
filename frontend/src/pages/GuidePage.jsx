import React from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "../components/SEO";
import SchemaLD from "../components/SchemaLD";
import GuideProjectEvidence from "../components/GuideProjectEvidence";
import guides from "../data/guides.json";
import geoGuides from "../data/geoGuides.json";

function MeasurementDiagram({ type }) {
  const common = { fill: "none", stroke: "#D4AF37", strokeWidth: 2 };
  if (type === "room-size") {
    return <svg role="img" aria-label="Top view of a 16 by 12 foot room, 6 by 3.5 foot table and 28 inch chandelier" viewBox="0 0 520 300" className="w-full h-auto"><rect x="40" y="30" width="440" height="240" {...common} /><text x="260" y="20" textAnchor="middle" fill="#d8c9c1">16 ft room</text><text x="18" y="155" textAnchor="middle" fill="#d8c9c1" transform="rotate(-90 18 155)">12 ft room</text><rect x="145" y="98" width="230" height="105" fill="#ffffff0d" stroke="#9d8678" strokeWidth="2" /><text x="260" y="220" textAnchor="middle" fill="#bdaea6">6 × 3.5 ft table</text><circle cx="260" cy="150" r="42" fill="#D4AF3722" stroke="#D4AF37" strokeWidth="2" /><text x="260" y="146" textAnchor="middle" fill="#fff">28 in</text><text x="260" y="164" textAnchor="middle" fill="#fff">fixture</text></svg>;
  }
  if (type === "chandelier-height") {
    return <svg role="img" aria-label="Side view showing a 10 foot ceiling, 30 inch suspension, 24 inch chandelier and 36 inch clearance above a 30 inch table" viewBox="0 0 520 340" className="w-full h-auto"><line x1="55" y1="28" x2="465" y2="28" {...common} /><line x1="55" y1="310" x2="465" y2="310" stroke="#9d8678" strokeWidth="2" /><line x1="260" y1="28" x2="260" y2="98" {...common} /><path d="M210 98 Q260 70 310 98 L292 155 Q260 180 228 155 Z" fill="#D4AF3722" stroke="#D4AF37" strokeWidth="2" /><rect x="130" y="240" width="260" height="14" fill="#9d8678" /><line x1="130" y1="254" x2="130" y2="310" stroke="#9d8678" strokeWidth="8" /><line x1="390" y1="254" x2="390" y2="310" stroke="#9d8678" strokeWidth="8" /><text x="330" y="64" fill="#fff">30 in suspension</text><text x="320" y="130" fill="#fff">24 in body</text><text x="320" y="202" fill="#fff">36 in clearance</text><text x="400" y="283" fill="#fff">30 in table</text><text x="78" y="170" fill="#d8c9c1" transform="rotate(-90 78 170)">120 in ceiling</text></svg>;
  }
  return <svg role="img" aria-label="Front and side view of two wall lights around a mirror showing centre spacing, centre height and projection" viewBox="0 0 520 330" className="w-full h-auto"><line x1="40" y1="300" x2="480" y2="300" stroke="#9d8678" strokeWidth="2" /><rect x="190" y="70" width="140" height="145" fill="#ffffff08" stroke="#9d8678" strokeWidth="2" /><path d="M130 130 L155 105 L180 130 L170 175 L140 175 Z" fill="#D4AF3722" stroke="#D4AF37" strokeWidth="2" /><path d="M340 130 L365 105 L390 130 L380 175 L350 175 Z" fill="#D4AF3722" stroke="#D4AF37" strokeWidth="2" /><line x1="155" y1="195" x2="365" y2="195" {...common} /><text x="260" y="190" textAnchor="middle" fill="#fff">42 in centres</text><line x1="110" y1="150" x2="110" y2="300" {...common} /><text x="95" y="235" textAnchor="middle" fill="#fff" transform="rotate(-90 95 235)">64 in centre height</text><line x1="400" y1="150" x2="456" y2="150" {...common} /><text x="428" y="140" textAnchor="middle" fill="#fff">8 in projection</text><text x="260" y="235" textAnchor="middle" fill="#bdaea6">60 in mirror</text></svg>;
}

function WorkedExample({ example }) {
  if (!example) return null;
  return <section data-testid="guide-worked-example" className="mt-14 border border-[#D4AF37]/25 bg-[#0d0510] p-6 md:p-9"><div className="eyebrow mb-3">Illustrative worked example</div><h2 className="font-serif text-3xl mb-4">{example.title}</h2><p className="text-white/68 leading-relaxed">{example.scenario}</p><div className="mt-7 grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center"><ol className="space-y-3 text-white/65">{example.steps.map((step, index) => <li key={step} className="flex gap-3"><span className="text-[#D4AF37]">{index + 1}.</span><span>{step}</span></li>)}</ol><div className="border border-white/10 bg-black/25 p-3"><MeasurementDiagram type={example.type} /></div></div><p className="mt-7 border-l-2 border-[#D4AF37] pl-4 text-white/80"><span className="font-medium text-[#D4AF37]">Result: </span>{example.result}</p><p className="mt-4 text-sm leading-relaxed text-white/48"><span className="text-white/70">Confirm on site: </span>{example.confirm}</p></section>;
}

export default function GuidePage() {
  const { slug } = useParams();
  const guide = [...guides, ...geoGuides].find((g) => g.slug === slug);

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
    ...(guide.image ? { image: guide.image } : {}),
    ...(guide.datePublished ? { datePublished: guide.datePublished } : {}),
    ...(guide.dateModified ? { dateModified: guide.dateModified } : {}),
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
      <SEO title={guide.seoTitle} description={guide.description} image={guide.image} path={`/guides/${guide.slug}`} type="article" />
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

      <WorkedExample example={guide.workedExample} />

      <GuideProjectEvidence guideSlug={guide.slug} />

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
