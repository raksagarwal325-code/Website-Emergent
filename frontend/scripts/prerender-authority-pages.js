#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "build");
const TEMPLATE_PATH = path.join(BUILD_DIR, "index.html");
const SITE_ORIGIN = "https://samratglass.com";

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const pages = [
  {
    slug: "chandelier-manufacturer-india",
    title: "Chandelier Manufacturer in India | Firozabad Since 1981 | Samrat Glass",
    description: "Samrat Glass Emporium is a chandelier and decorative lighting manufacturer in Firozabad, India, established in 1981. Explore handcrafted glass chandeliers, custom lighting and project solutions.",
    h1: "Chandelier Manufacturer in India — Handcrafted in Firozabad Since 1981",
    schemaPrefix: "chandelier-manufacturer",
    schemaName: "Chandelier Manufacturer in India — Samrat Glass Emporium",
    breadcrumbName: "Chandelier Manufacturer in India",
    breadcrumbLabel: "Manufacturer in India",
    aboutId: `${SITE_ORIGIN}/#organization`,
    body: `<p class="prerender-eyebrow">Made in Firozabad since 1981</p>
    <h1>Chandelier Manufacturer in India — Handcrafted in Firozabad Since 1981</h1>
    <p class="prerender-intro">Samrat Glass Emporium is a decorative lighting manufacturer based in Firozabad, Uttar Pradesh — India’s historic centre of glass craftsmanship. Established in 1981, we create handcrafted chandeliers and decorative lighting for residences, hospitality spaces, showrooms and commercial interiors across India.</p>
    <section><h2>A chandelier manufacturer rooted in Firozabad</h2><p>Firozabad has been closely associated with glassmaking for generations. Samrat Glass Emporium was established here in 1981 and grew within this specialised glassmaking environment into a decorative-lighting business. Glass remains central to our chandelier collection through decorative shades, bowls, drops, patterned elements and ornamental forms.</p></section>
    <section><h2>What manufacturing means for a decorative-lighting project</h2><p>Samrat works with experienced craftsmen in Firozabad and can evaluate selected custom requirements rather than treating every chandelier only as a finished retail item. Depending on the design and technical feasibility, selected projects may involve changes in scale, finish, glass colour or configuration. Not every design can be modified in every way.</p></section>
    <section><h2>How a Samrat chandelier takes shape</h2><ol><li>Design selection or project brief</li><li>Glass and decorative component preparation</li><li>Structure and configuration</li><li>Assembly</li><li>Finishing and inspection</li><li>Protective packing and dispatch</li></ol><p>The exact process varies by design.</p></section>
    <section><h2>Custom chandeliers for real spaces</h2><p>Ceiling height, room proportions, furniture layout and architectural character all influence which chandelier will feel balanced. For selected technically feasible requirements, clients can share ceiling height, approximate room dimensions, site photographs, reference images or project drawings for evaluation before quotation.</p></section>
    <section><h2>Why Firozabad matters</h2><p>Firozabad is widely known for its glassmaking tradition. Samrat Glass Emporium was established within this craft ecosystem in 1981 and has developed more than four decades of decorative-lighting experience and a design library of 1,000+ designs.</p></section>
    <nav class="prerender-cross" aria-label="Related pages"><a href="/category/chandeliers">Explore Chandeliers</a> <a href="/custom-lighting-bulk-orders">Custom Lighting</a> <a href="/about">Our Story</a> <a href="/contact">Request a Quote</a></nav>`,
  },
  {
    slug: "double-height-chandeliers-india",
    title: "Double-Height Chandeliers in India | Custom & Handcrafted | Samrat Glass",
    description: "Explore handcrafted double-height chandeliers for villas, foyers, staircases and tall living spaces. Made in Firozabad by Samrat Glass Emporium, established in 1981.",
    h1: "Double-Height Chandeliers for Villas, Foyers & Staircases",
    schemaPrefix: "double-height-chandeliers",
    schemaName: "Double-Height Chandeliers in India — Samrat Glass Emporium",
    breadcrumbName: "Double-Height Chandeliers",
    breadcrumbLabel: "Double-height",
    aboutId: `${SITE_ORIGIN}/#business`,
    body: `<p class="prerender-eyebrow">For tall residential and project spaces</p>
    <h1>Double-Height Chandeliers for Villas, Foyers &amp; Staircases</h1>
    <p class="prerender-intro">Samrat Glass Emporium manufactures and supplies handcrafted chandeliers from Firozabad for double-height residences, foyers, staircases and other high-ceiling interiors. The right fixture is chosen around the scale of the space — not simply by selecting the largest chandelier available.</p>
    <section><h2>A double-height chandelier is a spatial decision</h2><p>In a tall room, the chandelier is read from more than one level and often from several directions. Diameter, total height, tiering, suspension length and the visual weight of the glass all affect whether the fixture feels balanced.</p></section>
    <section><h2>What we evaluate</h2><p>Ceiling height, room proportions, viewing levels, fixture character and project context help narrow the right chandelier for a tall interior.</p></section>
    <section><h2>Selected customisation</h2><p>Selected designs can be evaluated for changes in scale, finish, glass colour or configuration where technically feasible. Share ceiling height, approximate room dimensions, site photographs, preferred style and any architect or interior drawings available before quotation.</p></section>
    <section><h2>Glass-led decorative lighting since 1981</h2><p>Samrat Glass Emporium is based in Firozabad, Uttar Pradesh and has worked in handcrafted decorative lighting since 1981. Glass remains central to the collection through shades, bowls, drops, patterned elements and ornamental forms.</p></section>
    <nav class="prerender-cross" aria-label="Related pages"><a href="/space/double-height-staircase">Explore Tall-Space Lighting</a> <a href="/guides/chandelier-double-height-living-room">Double-Height Guide</a> <a href="/chandelier-manufacturer-india">Manufacturer Profile</a> <a href="/contact">Request a Quote</a></nav>`,
  },
];

const page = pages[0];

function schemas(target = page) {
  const canonical = `${SITE_ORIGIN}/${target.slug}`;
  return [
    {
      id: `${target.schemaPrefix}-webpage`,
      data: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: target.schemaName,
        description: target.description,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        about: { "@id": target.aboutId },
        inLanguage: "en-IN",
      },
    },
    {
      id: `${target.schemaPrefix}-breadcrumb`,
      data: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Chandeliers", item: `${SITE_ORIGIN}/category/chandeliers` },
          { "@type": "ListItem", position: 3, name: target.breadcrumbName, item: canonical },
        ],
      },
    },
  ];
}

function bodyHtml(target = page) {
  return `<main class="prerender-shell">
    <nav class="prerender-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/category/chandeliers">Chandeliers</a> · <span>${escapeHtml(target.breadcrumbLabel)}</span></nav>
    ${target.body}
  </main>`;
}

function inject(template, target = page) {
  const canonical = `${SITE_ORIGIN}/${target.slug}`;
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(target.title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(target.description)}" />`)
    .replace(/<meta\s+property="og:title"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:description"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:type"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:url"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:title"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:description"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");

  const metadata = [
    `<meta property="og:title" content="${escapeHtml(target.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(target.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:title" content="${escapeHtml(target.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(target.description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    ...schemas(target).map(({ id, data }) => `<script type="application/ld+json" data-schema="${id}">${JSON.stringify(data)}</script>`),
  ].join("\n");

  html = html.replace(/<\/head>/i, `${metadata}\n</head>`);
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${bodyHtml(target)}</div>`);
  return html;
}

function run() {
  if (!fs.existsSync(TEMPLATE_PATH)) throw new Error(`missing build template: ${TEMPLATE_PATH}`);
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  pages.forEach((target) => {
    const outputDir = path.join(BUILD_DIR, target.slug);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, "index.html"), inject(template, target), "utf8");
    console.log(`[prerender] authority page: /${target.slug}`);
  });
}

if (require.main === module) run();
module.exports = { inject, bodyHtml, schemas, page, pages, escapeHtml };
