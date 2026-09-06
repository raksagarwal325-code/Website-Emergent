import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Home, MessageCircle, Ruler, Sparkles, Staircase } from "lucide-react";
import SEO from "../components/SEO";
import { useSettings } from "../context/SettingsContext";
import { waCustomLightingLink } from "../lib/whatsapp";

const SITE_ORIGIN = "https://samratglass.com";
const PATH = "/double-height-chandeliers-india";

const faq = [
  [
    "What makes a chandelier suitable for a double-height space?",
    "A double-height chandelier needs to be considered in relation to ceiling height, room width, viewing level, suspension drop and the vertical volume of the space. A larger diameter alone does not make a chandelier suitable for a tall interior.",
  ],
  [
    "Can a double-height chandelier be customised?",
    "Selected Samrat designs can be evaluated for changes in scale, finish, glass colour or configuration, subject to technical feasibility. Share the ceiling height, room dimensions, site photographs or drawings before quotation.",
  ],
  [
    "How much drop should a chandelier have in a double-height room?",
    "There is no single correct drop for every project. The appropriate suspension depends on ceiling height, the occupied zone below, sightlines from upper levels and the proportions of the chandelier itself.",
  ],
  [
    "Do you supply double-height chandeliers across India?",
    "Yes. Samrat Glass Emporium supplies eligible chandeliers and decorative lighting across India, subject to product size, quantity, destination and packing requirements.",
  ],
  [
    "What should I send before requesting a quotation?",
    "For a useful first evaluation, share the ceiling height, approximate room dimensions, site photographs, preferred style and any architect or interior drawings available.",
  ],
];

function JsonLd() {
  useEffect(() => {
    const schemas = [
      {
        id: "double-height-chandeliers-webpage",
        data: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${SITE_ORIGIN}${PATH}#webpage`,
          url: `${SITE_ORIGIN}${PATH}`,
          name: "Double-Height Chandeliers in India — Samrat Glass Emporium",
          description:
            "Handcrafted double-height chandeliers for villas, foyers, staircases and tall living spaces, made in Firozabad by Samrat Glass Emporium.",
          isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
          about: { "@id": `${SITE_ORIGIN}/#business` },
          inLanguage: "en-IN",
        },
      },
      {
        id: "double-height-chandeliers-breadcrumb",
        data: {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
            { "@type": "ListItem", position: 2, name: "Chandeliers", item: `${SITE_ORIGIN}/category/chandeliers` },
            { "@type": "ListItem", position: 3, name: "Double-Height Chandeliers", item: `${SITE_ORIGIN}${PATH}` },
          ],
        },
      },
      {
        id: "double-height-chandeliers-faq",
        data: {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map(([question, answer]) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          })),
        },
      },
    ];

    schemas.forEach(({ id, data }) => {
      let node = document.head.querySelector(`script[data-schema="${id}"]`);
      if (!node) {
        node = document.createElement("script");
        node.type = "application/ld+json";
        node.dataset.schema = id;
        document.head.appendChild(node);
      }
      node.textContent = JSON.stringify(data);
    });

    return () => schemas.forEach(({ id }) => document.head.querySelector(`script[data-schema="${id}"]`)?.remove());
  }, []);
  return null;
}

export default function DoubleHeightChandeliersIndia() {
  const { settings } = useSettings();
  const waLink = waCustomLightingLink(settings?.whatsapp_number) || "/contact";

  return (
    <div data-testid="page-double-height-chandeliers-india" className="max-w-7xl mx-auto px-6 py-14 sm:py-16">
      <SEO
        title="Double-Height Chandeliers in India | Custom & Handcrafted | Samrat Glass"
        description="Explore handcrafted double-height chandeliers for villas, foyers, staircases and tall living spaces. Made in Firozabad by Samrat Glass Emporium, established in 1981."
        path={PATH}
      />
      <JsonLd />

      <nav aria-label="Breadcrumb" className="mb-10 text-xs uppercase tracking-[0.18em] text-white/45">
        <Link to="/" className="hover:text-[#D4AF37]">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/category/chandeliers" className="hover:text-[#D4AF37]">Chandeliers</Link>
        <span className="mx-2">/</span>
        <span className="text-white/70">Double-height</span>
      </nav>

      <section className="mb-16 sm:mb-20">
        <div className="eyebrow mb-4">For tall residential and project spaces</div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.08] max-w-5xl">
          Double-Height Chandeliers for <span className="italic brand-gradient-text">Villas, Foyers & Staircases</span>
        </h1>
        <p className="mt-6 text-white/70 max-w-3xl text-base sm:text-lg leading-relaxed">
          Samrat Glass Emporium manufactures and supplies handcrafted chandeliers from Firozabad for double-height residences, foyers, staircases and other high-ceiling interiors. The right fixture is chosen around the scale of the space — not simply by selecting the largest chandelier available.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/space/double-height-staircase" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.22em] hover:bg-[#B5952F]">
            Explore tall-space lighting <ArrowRight size={14} />
          </Link>
          <Link to="/custom-lighting-bulk-orders" className="inline-flex items-center gap-2 border border-white/25 px-6 py-3 uppercase text-xs tracking-[0.22em] hover:border-[#D4AF37] hover:text-[#D4AF37]">
            Discuss a custom requirement
          </Link>
          <a href={waLink} target={waLink.startsWith("http") ? "_blank" : undefined} rel={waLink.startsWith("http") ? "noreferrer" : undefined} className="inline-flex items-center gap-2 border border-[#25D366]/60 text-[#25D366] px-6 py-3 uppercase text-xs tracking-[0.22em] hover:bg-[#25D366] hover:text-black">
            <MessageCircle size={14} /> WhatsApp us
          </a>
        </div>
      </section>

      <section className="mb-20 grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16">
        <div>
          <div className="eyebrow mb-3">Start with proportion</div>
          <h2 className="font-serif text-3xl sm:text-4xl">A double-height chandelier is a spatial decision.</h2>
        </div>
        <div className="space-y-5 text-white/68 leading-relaxed">
          <p>In a tall room, the chandelier is read from more than one level and often from several directions. Diameter, total height, tiering, suspension length and the visual weight of the glass all affect whether the fixture feels balanced.</p>
          <p>A chandelier that works in a standard-height room can disappear inside a double-height volume. The reverse is also true: a fixture can be physically large yet still feel poorly proportioned if its vertical composition does not suit the architecture.</p>
          <p>For that reason, Samrat evaluates suitable designs in relation to the room rather than treating “double-height” as a single fixed product size.</p>
        </div>
      </section>

      <section className="mb-20">
        <div className="eyebrow mb-4">What we evaluate</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-8 max-w-4xl">Five inputs help narrow the right chandelier for a tall interior.</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            [Ruler, "Ceiling height", "The total vertical volume and usable suspension range."],
            [Home, "Room proportions", "Approximate width, length and the occupied zone below."],
            [Staircase, "Viewing levels", "Sightlines from the ground floor, staircase and upper landing."],
            [Sparkles, "Fixture character", "Glass-led, crystal, heritage or more restrained decorative forms."],
            [Building2, "Project context", "Residential, hospitality or another project setting."],
          ].map(([Icon, title, body]) => (
            <div key={title} className="border border-white/10 bg-[#0d0510] p-6">
              <Icon size={19} className="text-[#D4AF37] mb-5" strokeWidth={1.4} />
              <h3 className="font-serif text-lg mb-2">{title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-20 border border-white/10 bg-[#0d0510] p-7 sm:p-10">
        <div className="eyebrow mb-4">Real-space proof</div>
        <h2 className="font-serif text-3xl sm:text-4xl max-w-4xl">Use installations and room-led collections as evidence, not generic scale claims.</h2>
        <p className="mt-5 max-w-4xl text-white/65 leading-relaxed">
          Samrat&apos;s project gallery includes completed residential installations, while the Double-Height & Staircase space collection groups lighting intended for tall interiors. These references are more useful than judging a chandelier only from a cut-out product photograph.
        </p>
        <div className="mt-7 flex flex-wrap gap-5 text-sm">
          <Link to="/gallery" className="inline-flex items-center gap-2 text-[#D4AF37]">View real installations <ArrowRight size={13} /></Link>
          <Link to="/space/double-height-staircase" className="inline-flex items-center gap-2 text-[#D4AF37]">Browse Double-Height & Staircase <ArrowRight size={13} /></Link>
        </div>
      </section>

      <section className="mb-20 grid lg:grid-cols-2 gap-10 lg:gap-16">
        <div>
          <div className="eyebrow mb-4">Selected customisation</div>
          <h2 className="font-serif text-3xl sm:text-4xl">When an existing chandelier needs to respond to the site.</h2>
          <p className="mt-5 text-white/65 leading-relaxed">
            Selected designs can be evaluated for changes in scale, finish, glass colour or configuration where technically feasible. Not every design can be modified in every way, and custom requests are reviewed before quotation.
          </p>
          <p className="mt-4 text-white/65 leading-relaxed">
            A useful first brief includes ceiling height, approximate room dimensions, site photographs, preferred style and any architect or interior drawings available.
          </p>
          <Link to="/custom-lighting-bulk-orders" className="mt-7 inline-flex items-center gap-2 text-[#D4AF37] uppercase text-xs tracking-[0.2em]">Discuss your project <ArrowRight size={13} /></Link>
        </div>
        <div>
          <div className="eyebrow mb-4">Made in Firozabad</div>
          <h2 className="font-serif text-3xl sm:text-4xl">Glass-led decorative lighting since 1981.</h2>
          <p className="mt-5 text-white/65 leading-relaxed">
            Samrat Glass Emporium is based in Firozabad, Uttar Pradesh and has worked in handcrafted decorative lighting since 1981. Glass remains central to the collection through shades, bowls, drops, patterned elements and ornamental forms.
          </p>
          <p className="mt-4 text-white/65 leading-relaxed">
            For taller interiors, that glass-led identity can be expressed through multi-tier, vertically composed and statement chandelier formats suited to the scale of the room.
          </p>
          <Link to="/chandelier-manufacturer-india" className="mt-7 inline-flex items-center gap-2 text-[#D4AF37] uppercase text-xs tracking-[0.2em]">See manufacturer profile <ArrowRight size={13} /></Link>
        </div>
      </section>

      <section className="mb-20">
        <div className="eyebrow mb-4">Planning guidance</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-8">Go deeper before choosing the fixture.</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ["Double-height living room chandeliers", "/guides/chandelier-double-height-living-room", "How scale, vertical composition and sightlines change in a tall living space."],
            ["Choose chandelier size for a room", "/guides/choose-chandelier-size-room", "A broader sizing framework for balancing chandelier dimensions with room proportions."],
            ["How high should a chandelier hang?", "/guides/how-high-should-chandelier-hang", "Understand hanging height in relation to the room and what sits below the fixture."],
          ].map(([title, path, body]) => (
            <Link key={path} to={path} className="group border border-white/10 p-6 hover:border-[#D4AF37]/60 transition-colors">
              <h3 className="font-serif text-xl group-hover:text-[#D4AF37]">{title}</h3>
              <p className="mt-2 text-sm text-white/55 leading-relaxed">{body}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#D4AF37]">Read guide <ArrowRight size={12} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-20">
        <div className="eyebrow mb-4">Frequently asked questions</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-8">Double-height chandelier questions.</h2>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {faq.map(([question, answer]) => (
            <div key={question} className="py-6 grid md:grid-cols-[0.8fr_1.2fr] gap-3 md:gap-8">
              <h3 className="font-serif text-lg">{question}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-[#D4AF37]/30 bg-[#0d0510] p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="eyebrow mb-3">Planning a tall-space installation?</div>
          <h2 className="font-serif text-3xl sm:text-4xl">Send the room first. Then shortlist the chandelier.</h2>
          <p className="mt-3 text-white/60 max-w-2xl">Share ceiling height, room dimensions, photographs or drawings so the requirement can be evaluated before quotation.</p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Link to="/contact" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.2em] hover:bg-[#B5952F]">Request a quote <ArrowRight size={13} /></Link>
          <Link to="/category/chandeliers" className="inline-flex items-center gap-2 border border-white/20 px-6 py-3 uppercase text-xs tracking-[0.2em] hover:border-[#D4AF37]">Explore chandeliers</Link>
        </div>
      </section>
    </div>
  );
}
