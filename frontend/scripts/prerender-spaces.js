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

const spaces = [
  {
    slug: "living-room",
    label: "Living Room",
    description: "Statement chandeliers, hanging lights and wall lights for formal and everyday living spaces.",
  },
  {
    slug: "dining-room",
    label: "Dining Room",
    description: "Decorative lighting for dining tables, dining rooms and intimate entertaining spaces.",
  },
  {
    slug: "double-height-staircase",
    label: "Double-Height & Staircase",
    description: "Large-format chandeliers and cascading lighting for tall voids, staircases and double-height spaces.",
  },
  {
    slug: "foyer-entrance",
    label: "Foyer & Entrance",
    description: "Decorative focal lighting for entrances, foyers and arrival spaces.",
  },
  {
    slug: "bedroom",
    label: "Bedroom",
    description: "Softer chandeliers, hanging lights, wall lights and lamps for bedrooms and private spaces.",
  },
  {
    slug: "hotel-hospitality",
    label: "Hotel & Hospitality",
    description: "Decorative lighting for hotel lobbies, suites, hospitality interiors and bespoke projects.",
  },
  {
    slug: "restaurant",
    label: "Restaurant",
    description: "Atmospheric chandeliers, pendants and wall lights for restaurants and dining venues.",
  },
  {
    slug: "retail-showroom",
    label: "Retail & Showroom",
    description: "Statement lighting for showrooms, boutiques, retail interiors and display environments.",
  },
  {
    slug: "banquet-event-space",
    label: "Banquet & Event Space",
    description: "Large decorative chandeliers and custom lighting for banquet halls and event spaces.",
  },
];

const pages = spaces.map((space) => ({
  ...space,
  slug: `space/${space.slug}`,
  title: `${space.label} Lighting | Samrat Glass`,
  h1: `Lighting for ${space.label} Spaces`,
}));

const page = pages.find((item) => item.slug === "space/double-height-staircase");

function schemas(target = page) {
  const canonical = `${SITE_ORIGIN}/${target.slug}`;
  return [
    {
      id: `space-${target.slug.replace(/^space\//, "").replace(/[^a-z0-9]+/g, "-")}-webpage`,
      data: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: target.h1,
        description: target.description,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        about: { "@id": `${SITE_ORIGIN}/#organization` },
        inLanguage: "en-IN",
      },
    },
    {
      id: `space-${target.slug.replace(/^space\//, "").replace(/[^a-z0-9]+/g, "-")}-breadcrumb`,
      data: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Shop by Space", item: `${SITE_ORIGIN}/spaces` },
          { "@type": "ListItem", position: 3, name: target.label, item: canonical },
        ],
      },
    },
  ];
}

function bodyHtml(target = page) {
  const isDoubleHeight = target.slug === "space/double-height-staircase";
  if (isDoubleHeight) {
    return `<main class="prerender-shell">
    <nav class="prerender-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/spaces">Shop by Space</a> · <span>Double-Height &amp; Staircase</span></nav>
    <p class="prerender-eyebrow">Shop by Space</p>
    <h1>${escapeHtml(target.h1)}</h1>
    <p class="prerender-intro">Browse large-format chandeliers and cascading decorative lighting selected for tall voids, staircases and double-height interiors. This space collection is product-first: it helps you explore designs already curated for vertical scale rather than repeating general chandelier advice.</p>
    <section><h2>Browse lighting suited to tall vertical spaces</h2><p>Double-height rooms and staircase voids are viewed across more than one level, so proportion, visible drop and overall vertical presence matter. Use this collection to discover chandeliers and hanging lights that suit those conditions, then open individual product pages for design-specific details.</p></section>
    <section><h2>Need project planning rather than product browsing?</h2><p>For chandelier scale, suspension drop, selected customisation, real double-height installations and quotation guidance, use our dedicated double-height chandelier project page. It is intentionally separate from this Shop by Space collection so browsing and project planning remain clear.</p></section>
    <nav class="prerender-cross" aria-label="Related pages"><a href="/double-height-chandeliers-india">Double-Height Chandelier Project Guide</a> <a href="/guides/chandelier-double-height-living-room">Sizing Guide</a> <a href="/category/chandeliers">Explore Chandeliers</a> <a href="/contact">Request a Quote</a></nav>
  </main>`;
  }

  return `<main class="prerender-shell">
    <nav class="prerender-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/spaces">Shop by Space</a> · <span>${escapeHtml(target.label)}</span></nav>
    <p class="prerender-eyebrow">Shop by Space</p>
    <h1>${escapeHtml(target.h1)}</h1>
    <p class="prerender-intro">${escapeHtml(target.description)}</p>
    <section><h2>Browse decorative lighting for this space</h2><p>Explore chandeliers, hanging lights, wall lights and lamps curated for ${escapeHtml(target.label.toLowerCase())} applications. Final suitability depends on room dimensions, ceiling height, installation conditions and the selected fixture.</p></section>
    <section><h2>Need help choosing?</h2><p>Use our lighting guides for practical planning, or browse the full catalogue if you want to compare across categories before making an enquiry.</p></section>
    <nav class="prerender-cross" aria-label="Related pages"><a href="/catalog">Browse Full Catalogue</a> <a href="/guides">Lighting Guides</a> <a href="/custom-lighting-bulk-orders">Custom Lighting</a> <a href="/contact">Request a Quote</a></nav>
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

function indexSchemas() {
  return [{
    id: "spaces-item-list",
    data: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Shop decorative lighting by space",
      numberOfItems: spaces.length,
      itemListElement: spaces.map((space, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: space.label,
        url: `${SITE_ORIGIN}/space/${space.slug}`,
      })),
    },
  }];
}

function indexBodyHtml() {
  const cards = spaces.map((space) =>
    `<article><h2><a href="/space/${escapeHtml(space.slug)}">${escapeHtml(space.label)}</a></h2><p>${escapeHtml(space.description)}</p></article>`
  ).join("\n");
  return `<main class="prerender-shell">
    <nav class="prerender-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> · <span>Shop by Space</span></nav>
    <p class="prerender-eyebrow">Lighting by application</p>
    <h1>Shop by Space</h1>
    <p class="prerender-intro">Explore handcrafted decorative lighting by room and project type, including living rooms, dining rooms, double-height spaces, foyers, hotels, restaurants and showrooms.</p>
    <section>${cards}</section>
    <nav class="prerender-cross" aria-label="Related pages"><a href="/catalog">Browse Full Catalogue</a> <a href="/custom-lighting-bulk-orders">Custom Lighting</a> <a href="/gallery">Real Installations</a></nav>
  </main>`;
}

function injectIndex(template) {
  const title = "Shop Lighting by Space · Living Room, Dining, Staircase & Hospitality · Samrat Glass";
  const description = "Explore handcrafted decorative lighting by room and project type, including living rooms, dining rooms, double-height spaces, foyers, hotels, restaurants and showrooms.";
  const canonical = `${SITE_ORIGIN}/spaces`;
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");
  const metadata = [
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    ...indexSchemas().map(({ id, data }) => `<script type="application/ld+json" data-schema="${id}">${JSON.stringify(data)}</script>`),
  ].join("\n");
  html = html.replace(/<\/head>/i, `${metadata}\n</head>`);
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${indexBodyHtml()}</div>`);
  return html;
}

function writePage(template, slug, html) {
  const outputDir = path.join(BUILD_DIR, ...slug.split("/"));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), html, "utf8");
}

function run() {
  if (!fs.existsSync(TEMPLATE_PATH)) throw new Error(`missing build template: ${TEMPLATE_PATH}`);
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  writePage(template, "spaces", injectIndex(template));
  for (const target of pages) {
    writePage(template, target.slug, inject(template, target));
    console.log(`[prerender] space page: /${target.slug}`);
  }
  console.log("[prerender] spaces index: /spaces");
}

if (require.main === module) run();
module.exports = {
  inject,
  bodyHtml,
  schemas,
  page,
  pages,
  spaces,
  injectIndex,
  indexBodyHtml,
  indexSchemas,
  escapeHtml,
};
