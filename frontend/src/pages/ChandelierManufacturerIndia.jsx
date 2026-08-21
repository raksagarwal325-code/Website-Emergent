import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Factory, Gem, Landmark, MessageCircle, Ruler, Truck } from "lucide-react";
import SEO from "../components/SEO";
import { useSettings } from "../context/SettingsContext";
import { waCustomLightingLink } from "../lib/whatsapp";

const SITE_ORIGIN = "https://samratglass.com";
const PATH = "/chandelier-manufacturer-india";

function JsonLd() {
  useEffect(() => {
    const schemas = [
      {
        id: "chandelier-manufacturer-webpage",
        data: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${SITE_ORIGIN}${PATH}#webpage`,
          url: `${SITE_ORIGIN}${PATH}`,
          name: "Chandelier Manufacturer in India — Samrat Glass Emporium",
          description:
            "Samrat Glass Emporium is a chandelier and decorative lighting manufacturer in Firozabad, India, established in 1981.",
          isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
          about: { "@id": `${SITE_ORIGIN}/#organization` },
          inLanguage: "en-IN",
        },
      },
      {
        id: "chandelier-manufacturer-breadcrumb",
        data: {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
            { "@type": "ListItem", position: 2, name: "Chandeliers", item: `${SITE_ORIGIN}/category/chandeliers` },
            { "@type": "ListItem", position: 3, name: "Chandelier Manufacturer in India", item: `${SITE_ORIGIN}${PATH}` },
          ],
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

const facts = [
  ["1981", "Established"],
  ["Firozabad", "Uttar Pradesh"],
  ["40+", "Years of experience"],
  ["1,000+", "Design library"],
  ["Custom", "Selected projects"],
  ["Pan-India", "Supply"],
];

const faq = [
  ["Is Samrat Glass Emporium a chandelier manufacturer in India?", "Yes. Samrat Glass Emporium is based in Firozabad, Uttar Pradesh and has worked in handcrafted decorative lighting since 1981."],
  ["Where are Samrat chandeliers made?", "Samrat Glass Emporium is based in Firozabad, Uttar Pradesh — a city historically associated with glassmaking and decorative glass craftsmanship."],
  ["Can you manufacture a chandelier in a custom size?", "Selected designs can be customised subject to technical feasibility. Share the ceiling height, room dimensions, site photographs or project drawings so the requirement can be evaluated before quotation."],
  ["Do you make chandeliers for double-height ceilings?", "Yes. Suitable chandelier designs are available for double-height residences, staircases, foyers and other high-ceiling interiors."],
  ["Do you supply architects and interior designers?", "Yes. Architects, interior designers and project buyers can enquire about individual fixtures, coordinated lighting and selected custom requirements."],
  ["Can the colour or finish of a chandelier be changed?", "Selected products may support alternative glass colours, finishes or configurations. Availability depends on the design and should be confirmed before ordering."],
  ["Do you supply hotels and commercial projects?", "Samrat decorative lighting is supplied for residences, hospitality, restaurants, showrooms and other commercial interiors. Project requirements are evaluated individually."],
  ["Do you deliver chandeliers across India?", "Yes. Pan-India delivery is available for eligible products, subject to product size, quantity, destination and packing requirements."],
];

export default function ChandelierManufacturerIndia() {
  const { settings } = useSettings();
  const waLink = waCustomLightingLink(settings?.whatsapp_number) || "/contact";

  return (
    <div data-testid="page-chandelier-manufacturer-india" className="max-w-7xl mx-auto px-6 py-14 sm:py-16">
      <SEO
        title="Chandelier Manufacturer in India | Firozabad Since 1981 | Samrat Glass"
        description="Samrat Glass Emporium is a chandelier and decorative lighting manufacturer in Firozabad, India, established in 1981. Explore handcrafted glass chandeliers, custom lighting and project solutions."
        path={PATH}
      />
      <JsonLd />

      <nav aria-label="Breadcrumb" className="mb-10 text-xs uppercase tracking-[0.18em] text-white/45">
        <Link to="/" className="hover:text-[#D4AF37]">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/category/chandeliers" className="hover:text-[#D4AF37]">Chandeliers</Link>
        <span className="mx-2">/</span>
        <span className="text-white/70">Manufacturer in India</span>
      </nav>

      <section className="mb-16 sm:mb-20">
        <div className="eyebrow mb-4">Made in Firozabad since 1981</div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.08] max-w-5xl">
          Chandelier Manufacturer in India — <span className="italic brand-gradient-text">Handcrafted in Firozabad Since 1981</span>
        </h1>
        <p className="mt-6 text-white/70 max-w-3xl text-base sm:text-lg leading-relaxed">
          Samrat Glass Emporium is a decorative lighting manufacturer based in Firozabad, Uttar Pradesh — India&apos;s historic centre of glass craftsmanship. Established in 1981, we create handcrafted chandeliers and decorative lighting for residences, hospitality spaces, showrooms and commercial interiors across India.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/category/chandeliers" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.22em] hover:bg-[#B5952F]">
            Explore chandeliers <ArrowRight size={14} />
          </Link>
          <Link to="/custom-lighting-bulk-orders" className="inline-flex items-center gap-2 border border-white/25 px-6 py-3 uppercase text-xs tracking-[0.22em] hover:border-[#D4AF37] hover:text-[#D4AF37]">
            Request custom lighting
          </Link>
          <a href={waLink} target={waLink.startsWith("http") ? "_blank" : undefined} rel={waLink.startsWith("http") ? "noreferrer" : undefined} className="inline-flex items-center gap-2 border border-[#25D366]/60 text-[#25D366] px-6 py-3 uppercase text-xs tracking-[0.22em] hover:bg-[#25D366] hover:text-black">
            <MessageCircle size={14} /> WhatsApp us
          </a>
        </div>
      </section>

      <section aria-label="Key facts" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-y border-white/10 mb-20">
        {facts.map(([value, label]) => (
          <div key={label} className="px-4 py-6 border-r border-white/10 last:border-r-0">
            <div className="font-serif text-xl sm:text-2xl text-[#D4AF37]">{value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/45">{label}</div>
          </div>
        ))}
      </section>

      <section className="mb-20 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
        <div>
          <div className="eyebrow mb-3">Our foundation</div>
          <h2 className="font-serif text-3xl sm:text-4xl">A chandelier manufacturer rooted in Firozabad.</h2>
        </div>
        <div className="space-y-5 text-white/68 leading-relaxed">
          <p>Firozabad has been closely associated with glassmaking for generations. Samrat Glass Emporium was established here in 1981 and grew within this specialised glassmaking environment into a decorative-lighting business.</p>
          <p>Our chandeliers place glass at the centre of the design — through decorative shades, bowls, drops, patterned elements and ornamental forms. The collection ranges from compact residential chandeliers to statement pieces for taller interiors and selected custom projects.</p>
          <p>For us, Firozabad is not simply an address. It is part of the craft ecosystem in which the business developed.</p>
        </div>
      </section>

      <section className="mb-20" data-testid="manufacturer-proof">
        <div className="eyebrow mb-4">Manufacturer, not just a catalogue</div>
        <h2 className="font-serif text-3xl sm:text-4xl max-w-4xl mb-8">What manufacturing means for a decorative-lighting project.</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            [Factory, "Workshop-led production", "Decorative lighting is developed and assembled with experienced craftsmen in Firozabad, rather than treated only as a finished retail product."],
            [Ruler, "Selected customisation", "Where technically feasible, selected designs can be evaluated for changes in scale, finish, glass colour or configuration."],
            [Gem, "Glass-led expertise", "Glass craftsmanship remains central to Samrat's decorative-lighting identity, from shades and bowls to drops and ornamental components."],
          ].map(([Icon, title, body]) => (
            <div key={title} className="border border-white/10 bg-[#0d0510] p-7">
              <Icon size={20} className="text-[#D4AF37] mb-5" strokeWidth={1.4} />
              <h3 className="font-serif text-xl mb-2">{title}</h3>
              <p className="text-sm text-white/58 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-white/50">Custom requests are evaluated individually before production. Not every design can be modified in every way.</p>
      </section>

      <section className="mb-20 border border-white/10 bg-[#0d0510] p-7 sm:p-10">
        <div className="eyebrow mb-4">How a chandelier takes shape</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-8 max-w-3xl">From requirement to finished decorative lighting.</h2>
        <ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            ["01", "Design selection or brief", "Choose an existing design or share the scale, style and intended space."],
            ["02", "Glass & decorative preparation", "The relevant glass shades, bowls, drops and decorative components are prepared for the selected design."],
            ["03", "Structure & configuration", "The fixture structure and light configuration follow the selected model or an approved custom specification."],
            ["04", "Assembly", "Decorative and lighting components are brought together by experienced craftsmen."],
            ["05", "Finishing & inspection", "The completed fixture is checked for visual finishing and configuration before packing."],
            ["06", "Protective packing & dispatch", "Fragile decorative lighting is packed for the journey to the client or project site."],
          ].map(([n, title, body]) => (
            <li key={n} className="border-t border-white/10 pt-4">
              <div className="text-[#D4AF37] text-xs tracking-[0.22em]">{n}</div>
              <h3 className="font-serif text-lg mt-2">{title}</h3>
              <p className="text-sm text-white/55 leading-relaxed mt-1">{body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-xs text-white/40">The exact process varies by design. This section deliberately avoids claiming that every stage is identical for every Samrat chandelier.</p>
      </section>

      <section className="mb-20">
        <div className="eyebrow mb-4">Chandelier collections</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-8">Explore the range, then discuss the right scale for your space.</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ["Glass Chandeliers", "Decorative glass shades, bowls, drops and ornamental glasswork."],
            ["Crystal Chandeliers", "Statement pieces with layered crystal and decorative detailing."],
            ["Traditional & Heritage Styles", "Classic forms influenced by Indian decorative-lighting traditions."],
            ["Multi-Tier Chandeliers", "Larger compositions for rooms with the scale to carry them."],
            ["Double-Height Chandeliers", "Vertically proportioned pieces for staircases, foyers and tall living spaces."],
            ["Custom Chandeliers", "Selected size, finish or configuration requirements evaluated project by project."],
          ].map(([title, body], index) => (
            <Link key={title} to={index === 5 ? "/custom-lighting-bulk-orders" : "/category/chandeliers"} className="group border border-white/10 p-6 hover:border-[#D4AF37]/60 transition-colors">
              <h3 className="font-serif text-xl group-hover:text-[#D4AF37]">{title}</h3>
              <p className="mt-2 text-sm text-white/55 leading-relaxed">{body}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#D4AF37]">Explore <ArrowRight size={12} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-20 grid lg:grid-cols-2 gap-12">
        <div>
          <div className="eyebrow mb-4">Custom chandelier manufacturing</div>
          <h2 className="font-serif text-3xl sm:text-4xl">The room determines the chandelier.</h2>
          <p className="mt-5 text-white/65 leading-relaxed">Ceiling height, room proportions, furniture layout and architectural character all influence which chandelier will feel balanced. For selected designs and technically feasible requests, Samrat can evaluate changes in size, finish, glass colour or configuration.</p>
          <p className="mt-4 text-white/65 leading-relaxed">For a useful first discussion, share your ceiling height, approximate room dimensions, a site photograph and any architect or interior drawing available.</p>
          <Link to="/custom-lighting-bulk-orders" className="mt-7 inline-flex items-center gap-2 text-[#D4AF37] uppercase text-xs tracking-[0.2em]">Discuss your project <ArrowRight size={13} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-4 content-start">
          {[[Landmark, "Residences"], [Gem, "Hospitality"], [Factory, "Showrooms"], [Truck, "Project supply"]].map(([Icon, label]) => (
            <div key={label} className="border border-white/10 p-6 min-h-32 flex flex-col justify-between">
              <Icon size={18} className="text-[#D4AF37]" strokeWidth={1.4} />
              <div className="font-serif text-lg mt-8">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-20 grid lg:grid-cols-[1fr_0.9fr] gap-12 items-start">
        <div>
          <div className="eyebrow mb-4">Why Firozabad matters</div>
          <h2 className="font-serif text-3xl sm:text-4xl">Glassmaking is part of the city's identity — and ours.</h2>
          <div className="mt-5 space-y-4 text-white/65 leading-relaxed">
            <p>Firozabad is widely known for its glassmaking tradition. Generations of specialised knowledge around decorative glass have created an ecosystem of skills that is difficult to reproduce elsewhere.</p>
            <p>Samrat Glass Emporium was established within this environment in 1981. Over more than four decades, the company has developed a design library of 1,000+ decorative-lighting designs spanning chandeliers, hanging lights, wall lights, table lamps, floor lamps and other fixtures.</p>
          </div>
          <Link to="/about" className="mt-6 inline-flex items-center gap-2 text-[#D4AF37] uppercase text-xs tracking-[0.2em]">Read our story <ArrowRight size={13} /></Link>
        </div>
        <aside className="border-l border-[#D4AF37]/40 pl-7 py-2">
          <p className="font-serif text-2xl sm:text-3xl leading-snug">“Made in Firozabad since 1981” is not a slogan added for search. It is the foundation of the business.</p>
        </aside>
      </section>

      <section className="mb-20">
        <div className="eyebrow mb-4">Frequently asked questions</div>
        <h2 className="font-serif text-3xl sm:text-4xl mb-8">Before you enquire.</h2>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {faq.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-5 font-serif text-lg">
                <span>{q}</span><span className="text-[#D4AF37] text-xl leading-none group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 pr-8 text-sm text-white/58 leading-relaxed max-w-4xl">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border border-[#D4AF37]/30 bg-[#0d0510] p-8 sm:p-12 text-center">
        <div className="eyebrow mb-3">Looking for a chandelier manufacturer in India?</div>
        <h2 className="font-serif text-3xl sm:text-4xl max-w-3xl mx-auto">Start with the space, the scale and the look you want to achieve.</h2>
        <p className="mt-4 text-white/55 max-w-2xl mx-auto">Explore the chandelier catalogue or send us your room dimensions and project brief for a selected custom requirement.</p>
        <div className="mt-7 flex justify-center flex-wrap gap-3">
          <Link to="/category/chandeliers" className="bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.22em] hover:bg-[#B5952F]">Explore chandeliers</Link>
          <Link to="/contact" className="border border-white/25 px-6 py-3 uppercase text-xs tracking-[0.22em] hover:border-[#D4AF37] hover:text-[#D4AF37]">Request a quote</Link>
        </div>
      </section>
    </div>
  );
}
