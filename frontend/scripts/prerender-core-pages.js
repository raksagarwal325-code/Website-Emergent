#!/usr/bin/env node
/** Crawlable initial HTML for stable public landing pages. React replaces the
 * shell on hydration; the copy here deliberately uses existing site claims. */
const fs = require("fs");
const path = require("path");
const { SITE_ORIGIN, escapeHtml } = require("./prerender-categories");

const PAGES = [
  {
    route: "/",
    title: "Samrat Glass Emporium · Handcrafted Chandeliers & Decorative Lighting · Firozabad",
    description: "Handcrafted chandeliers, hanging lights, wall lights, table lamps and decorative glass lighting from Firozabad — by Samrat Glass Emporium, established in 1981.",
    h1: "Luxury decorative lighting that turns houses into homes.",
    intro: "A curated catalog of crystal chandeliers, pendant lights, wall sconces, table lamps and decorative lighting, handcrafted and hand-assembled by our artisans in Firozabad, with processes varying by design.",
    links: [["/catalog", "Explore the catalog"], ["/category/chandeliers", "Chandeliers"], ["/gallery", "Real installations"], ["/craft", "Our craft"], ["/contact", "Contact us"]],
  },
  {
    route: "/catalog",
    title: "Catalog · Chandeliers, Pendants & Decorative Lighting · Samrat Glass Emporium",
    description: "Browse 1000+ handcrafted chandeliers, crystal hurricanes, pendant lights, wall sconces and table lamps — made in Firozabad since 1981.",
    h1: "Catalog",
    intro: "Browse, filter, and enquire on any piece. Add favorites for later or send us your inquiry basket.",
    links: [["/category/chandeliers", "Chandeliers"], ["/category/hanging-lights", "Hanging lights"], ["/category/wall-lights", "Wall lights"], ["/category/table-lamps", "Table lamps"], ["/category/floor-lamps", "Floor lamps"]],
  },
  {
    route: "/craft",
    title: "The Craft | Inside Our Firozabad Workshop | Samrat Glass",
    description: "See real workshop footage from Samrat Glass Emporium in Firozabad, documenting decorative glass preparation, shaping, finishing, cleaning, assembly and inspection.",
    h1: "The Craft behind the lighting",
    intro: "Real workshop footage and factual process notes from Samrat Glass Emporium in Firozabad show the people, tools and handwork behind decorative glass lighting. Selected designs can be evaluated for changes in scale, finish, glass colour or configuration.",
    links: [["/gallery", "View real installations"], ["/custom-lighting-bulk-orders", "Discuss custom lighting"], ["/catalog", "Explore the catalog"]],
  },
  {
    route: "/about",
    title: "About · Samrat Glass Emporium · Firozabad since 1981",
    description: "Since 1981, our craftsmen in Firozabad have shaped glass into decorative lighting for homes, hotels and luxury interiors across India.",
    h1: "About Samrat Glass Emporium",
    intro: "Established in Firozabad in 1981, Samrat Glass Emporium creates handcrafted decorative lighting, including chandeliers, hanging lights, wall lights and table lamps for homes and projects across India.",
    links: [["/craft", "Explore the craft"], ["/catalog", "Explore the catalog"], ["/contact", "Get in touch"]],
  },
  {
    route: "/gallery",
    title: "Projects & Installations · Samrat Glass Emporium",
    description: "Real Samrat Glass Emporium chandelier and decorative-lighting installations in homes, hotels and luxury interiors across India.",
    h1: "Real spaces. Real Samrat lighting.",
    intro: "Client installations linked to the actual pieces from our catalogue, including custom finishes, residential projects and statement lighting across India.",
    links: [["/catalog", "Explore the catalog"], ["/custom-lighting-bulk-orders", "Custom lighting"], ["/contact", "Contact us"]],
  },
  {
    route: "/faq",
    title: "FAQ · Samrat Glass Emporium",
    description: "Answers to common questions — bespoke lead times, pan-India shipping, GST invoicing, custom sizes, trade pricing and more.",
    h1: "Frequently Asked",
    intro: "Find answers about custom sizes, orders, shipping and project enquiries. Contact us for guidance on a specific design or installation.",
    links: [["/legal/shipping", "Shipping information"], ["/custom-lighting-bulk-orders", "Custom lighting"], ["/contact", "Ask a question"]],
  },
  {
    route: "/contact",
    title: "Contact · Samrat Glass Emporium · Firozabad Chandeliers",
    description: "Speak to us on WhatsApp, call, email or visit our Firozabad showroom. Custom lighting for homes, hotels, weddings and luxury interiors.",
    h1: "Enquiries, custom sizes & bulk orders.",
    intro: "We can help with product recommendations, installation guidance, custom-sized pieces and bulk orders for weddings, showrooms and hotels.",
    links: [["/catalog", "Browse the catalog"], ["/custom-lighting-bulk-orders", "Custom lighting enquiries"], ["/architects-interior-designers", "Architects and designers"]],
  },
  {
    route: "/custom-lighting-bulk-orders",
    title: "Custom Lighting & Bulk Orders · Samrat Glass Emporium",
    description: "Made-to-order decorative lighting from Firozabad — custom sizes, finishes, glass colours and light counts for residences, hospitality, retail and large-scale projects.",
    h1: "Custom Lighting & Bulk Orders",
    intro: "Made-to-order decorative lighting for residences, hospitality, retail and large-scale projects. Handcrafted and hand-assembled in Firozabad, with glass-working, cutting and finishing processes varying by design.",
    links: [["/gallery", "Real installations"], ["/catalog", "Explore designs"], ["/contact", "Discuss your requirement"]],
  },
  {
    route: "/architects-interior-designers",
    title: "Lighting for Architects & Interior Designers · Samrat Glass Emporium",
    description: "A project-friendly lighting partner for bespoke residential, hospitality and commercial interiors. Direct access to Firozabad craftsmanship, custom finishes and project quantities.",
    h1: "Lighting for Architects & Interior Designers",
    intro: "A project-friendly lighting partner for bespoke residential, hospitality and commercial interiors. Work with our Firozabad workshop on selected custom finishes, drawings and references.",
    links: [["/gallery", "View installations"], ["/custom-lighting-bulk-orders", "Custom lighting"], ["/contact", "Discuss a project"]],
  },
];

function inject(template, page) {
  const canonical = `${SITE_ORIGIN}${page.route}`;
  const metadata = [
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
  ].join("\n");
  const body = `<main class="prerender-shell"><article><h1>${escapeHtml(page.h1)}</h1><p>${escapeHtml(page.intro)}</p><nav aria-label="Related pages">${page.links.map(([href, label]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join(" · ")}</nav></article></main>`;
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta\s+(?:property="og:(?:title|description|url)"|name="twitter:(?:title|description)")[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<\/head>/i, `${metadata}\n</head>`)
    .replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${body}</div>`);
}

function run(buildDir = path.join(__dirname, "..", "build")) {
  const template = fs.readFileSync(path.join(buildDir, "index.html"), "utf8");
  // The homepage overwrites the template only after every other route is built.
  for (const page of [...PAGES.slice(1), PAGES[0]]) {
    const output = path.join(buildDir, page.route.replace(/^\//, ""), "index.html");
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, inject(template, page), "utf8");
  }
  return PAGES.length;
}

if (require.main === module) console.log(`[prerender-core-pages] ${run()} pages written`);
module.exports = { PAGES, inject, run };
