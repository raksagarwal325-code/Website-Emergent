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
  slug: "space/double-height-staircase",
  title: "Double-Height & Staircase Lighting | Samrat Glass",
  description: "Browse chandeliers and decorative lighting curated for double-height rooms, staircases and tall vertical spaces, with project guidance from Samrat Glass.",
  h1: "Lighting for Double-Height & Staircase Spaces",
};

function schemas() {
  const canonical = `${SITE_ORIGIN}/${page.slug}`;
  return [
    {
      id: "space-double-height-webpage",
      data: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: page.h1,
        description: page.description,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        about: { "@id": `${SITE_ORIGIN}/#organization` },
        inLanguage: "en-IN",
      },
    },
    {
      id: "space-double-height-breadcrumb",
      data: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Shop by Space", item: `${SITE_ORIGIN}/spaces` },
          { "@type": "ListItem", position: 3, name: "Double-Height & Staircase", item: canonical },
        ],
      },
    },
  ];
}

function bodyHtml() {
  return `<main class="prerender-shell">
    <nav class="prerender-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/spaces">Shop by Space</a> · <span>Double-Height & Staircase</span></nav>
    <p class="prerender-eyebrow">Shop by Space</p>
    <h1>${escapeHtml(page.h1)}</h1>
    <p class="prerender-intro">Browse large-format chandeliers and cascading decorative lighting selected for tall voids, staircases and double-height interiors. This space collection is product-first: it helps you explore designs already curated for vertical scale rather than repeating general chandelier advice.</p>
    <section><h2>Browse lighting suited to tall vertical spaces</h2><p>Double-height rooms and staircase voids are viewed across more than one level, so proportion, visible drop and overall vertical presence matter. Use this collection to discover chandeliers and hanging lights that suit those conditions, then open individual product pages for design-specific details.</p></section>
    <section><h2>Need project planning rather than product browsing?</h2><p>For chandelier scale, suspension drop, selected customisation, real double-height installations and quotation guidance, use our dedicated double-height chandelier project page. It is intentionally separate from this Shop by Space collection so browsing and project planning remain clear.</p></section>
    <nav class="prerender-cross" aria-label="Related pages"><a href="/double-height-chandeliers-india">Double-Height Chandelier Project Guide</a> <a href="/guides/chandelier-double-height-living-room">Sizing Guide</a> <a href="/category/chandeliers">Explore Chandeliers</a> <a href="/contact">Request a Quote</a></nav>
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
  const outputDir = path.join(BUILD_DIR, ...page.slug.split("/"));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), inject(template), "utf8");
  console.log(`[prerender] space page: /${page.slug}`);
}

if (require.main === module) run();
module.exports = { inject, bodyHtml, schemas, page, escapeHtml };
