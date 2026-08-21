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

const page = {
  slug: "chandelier-manufacturer-india",
  title: "Chandelier Manufacturer in India | Firozabad Since 1981 | Samrat Glass",
  description: "Samrat Glass Emporium is a chandelier and decorative lighting manufacturer in Firozabad, India, established in 1981. Explore handcrafted glass chandeliers, custom lighting and project solutions.",
  h1: "Chandelier Manufacturer in India — Handcrafted in Firozabad Since 1981",
};

function schemas() {
  const canonical = `${SITE_ORIGIN}/${page.slug}`;
  return [
    {
      id: "chandelier-manufacturer-webpage",
      data: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: "Chandelier Manufacturer in India — Samrat Glass Emporium",
        description: page.description,
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
          { "@type": "ListItem", position: 3, name: "Chandelier Manufacturer in India", item: canonical },
        ],
      },
    },
  ];
}

function bodyHtml() {
  return `<main class="prerender-shell">
    <nav class="prerender-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/category/chandeliers">Chandeliers</a> · <span>Manufacturer in India</span></nav>
    <p class="prerender-eyebrow">Made in Firozabad since 1981</p>
    <h1>${escapeHtml(page.h1)}</h1>
    <p class="prerender-intro">Samrat Glass Emporium is a decorative lighting manufacturer based in Firozabad, Uttar Pradesh — India’s historic centre of glass craftsmanship. Established in 1981, we create handcrafted chandeliers and decorative lighting for residences, hospitality spaces, showrooms and commercial interiors across India.</p>
    <section><h2>A chandelier manufacturer rooted in Firozabad</h2><p>Firozabad has been closely associated with glassmaking for generations. Samrat Glass Emporium was established here in 1981 and grew within this specialised glassmaking environment into a decorative-lighting business. Glass remains central to our chandelier collection through decorative shades, bowls, drops, patterned elements and ornamental forms.</p></section>
    <section><h2>What manufacturing means for a decorative-lighting project</h2><p>Samrat works with experienced craftsmen in Firozabad and can evaluate selected custom requirements rather than treating every chandelier only as a finished retail item. Depending on the design and technical feasibility, selected projects may involve changes in scale, finish, glass colour or configuration. Not every design can be modified in every way.</p></section>
    <section><h2>How a Samrat chandelier takes shape</h2><ol><li>Design selection or project brief</li><li>Glass and decorative component preparation</li><li>Structure and configuration</li><li>Assembly</li><li>Finishing and inspection</li><li>Protective packing and dispatch</li></ol><p>The exact process varies by design.</p></section>
    <section><h2>Custom chandeliers for real spaces</h2><p>Ceiling height, room proportions, furniture layout and architectural character all influence which chandelier will feel balanced. For selected technically feasible requirements, clients can share ceiling height, approximate room dimensions, site photographs, reference images or project drawings for evaluation before quotation.</p></section>
    <section><h2>Why Firozabad matters</h2><p>Firozabad is widely known for its glassmaking tradition. Samrat Glass Emporium was established within this craft ecosystem in 1981 and has developed more than four decades of decorative-lighting experience and a design library of 1,000+ designs.</p></section>
    <nav class="prerender-cross" aria-label="Related pages"><a href="/category/chandeliers">Explore Chandeliers</a> <a href="/custom-lighting-bulk-orders">Custom Lighting</a> <a href="/about">Our Story</a> <a href="/contact">Request a Quote</a></nav>
  </main>`;
}

function inject(template) {
  const canonical = `${SITE_ORIGIN}/${page.slug}`;
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta\s+property="og:title"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:description"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:type"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:url"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:title"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:description"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");

  const metadata = [
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    ...schemas().map(({ id, data }) => `<script type="application/ld+json" data-schema="${id}">${JSON.stringify(data)}</script>`),
  ].join("\n");

  html = html.replace(/<\/head>/i, `${metadata}\n</head>`);
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${bodyHtml()}</div>`);
  return html;
}

function run() {
  if (!fs.existsSync(TEMPLATE_PATH)) throw new Error(`missing build template: ${TEMPLATE_PATH}`);
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const outputDir = path.join(BUILD_DIR, page.slug);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), inject(template), "utf8");
  console.log(`[prerender] authority page: /${page.slug}`);
}

if (require.main === module) run();
module.exports = { inject, bodyHtml, schemas, page, escapeHtml };
