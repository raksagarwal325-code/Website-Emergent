#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');
const TEMPLATE_PATH = path.join(BUILD_DIR, 'index.html');
const GUIDES_PATH = path.join(ROOT, 'src', 'data', 'guides.json');
const GEO_GUIDES_PATH = path.join(ROOT, 'src', 'data', 'geoGuides.json');
const SITE_ORIGIN = 'https://samratglass.com';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function replaceHead(html, { title, description, canonical, schemas }) {
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');

  const extra = [
    `<link rel="canonical" href="${canonical}" />`,
    ...schemas.map(({ id, data }) => `<script type="application/ld+json" data-schema="${id}">${JSON.stringify(data)}</script>`),
  ].join('\n');
  return out.replace(/<\/head>/i, `${extra}\n</head>`);
}

function guideSchemas(guide) {
  const canonical = `${SITE_ORIGIN}/guides/${guide.slug}`;
  return [
    {
      id: `guide-article-${guide.slug}`,
      data: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': `${canonical}#article`,
        headline: guide.title,
        description: guide.description,
        mainEntityOfPage: { '@id': `${canonical}#webpage` },
        author: { '@id': `${SITE_ORIGIN}/#business` },
        publisher: { '@id': `${SITE_ORIGIN}/#business` },
        inLanguage: 'en-IN',
      },
    },
    {
      id: `guide-breadcrumb-${guide.slug}`,
      data: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Lighting Guides', item: `${SITE_ORIGIN}/guides` },
          { '@type': 'ListItem', position: 3, name: guide.title, item: canonical },
        ],
      },
    },
  ];
}

function guideBody(guide) {
  const sections = (guide.sections || [])
    .map((section) => `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p></section>`)
    .join('');
  const links = (guide.links || [])
    .map((link) => `<a href="${escapeHtml(link.path)}">${escapeHtml(link.label)}</a>`)
    .join(' ');

  return `<main class="prerender-shell">
    <nav class="prerender-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/guides">Lighting Guides</a> · <span>${escapeHtml(guide.title)}</span></nav>
    <p class="prerender-eyebrow">Samrat Glass Lighting Guide</p>
    <h1>${escapeHtml(guide.title)}</h1>
    <section><h2>Short answer</h2><p>${escapeHtml(guide.answer)}</p></section>
    ${sections}
    <nav class="prerender-cross" aria-label="Related pages">${links}</nav>
  </main>`;
}

function hubSchemas(guides) {
  return [{
    id: 'guides-collection',
    data: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_ORIGIN}/guides#webpage`,
      url: `${SITE_ORIGIN}/guides`,
      name: 'Lighting Guides — Samrat Glass Emporium',
      description: 'Practical lighting guides covering chandelier sizing, hanging height, room lighting, customisation, Firozabad craftsmanship and project planning.',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: guides.map((g, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${SITE_ORIGIN}/guides/${g.slug}`,
          name: g.title,
        })),
      },
      inLanguage: 'en-IN',
    },
  }];
}

function hubBody(guides) {
  const items = guides
    .map((g) => `<article><h2><a href="/guides/${escapeHtml(g.slug)}">${escapeHtml(g.title)}</a></h2><p>${escapeHtml(g.answer)}</p></article>`)
    .join('');
  return `<main class="prerender-shell">
    <nav class="prerender-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> · <span>Lighting Guides</span></nav>
    <p class="prerender-eyebrow">Lighting Advice</p>
    <h1>Lighting Guides by Samrat Glass</h1>
    <p class="prerender-intro">Practical guidance on chandelier scale, hanging height, room lighting, customisation, project planning and Firozabad glass craftsmanship.</p>
    ${items}
  </main>`;
}

function writePage(template, relativePath, options, body) {
  let html = replaceHead(template, options);
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${body}</div>`);
  const outputDir = path.join(BUILD_DIR, relativePath);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
}

function run() {
  if (!fs.existsSync(TEMPLATE_PATH)) throw new Error(`missing build template: ${TEMPLATE_PATH}`);
  if (!fs.existsSync(GUIDES_PATH)) throw new Error(`missing guide data: ${GUIDES_PATH}`);
  if (!fs.existsSync(GEO_GUIDES_PATH)) throw new Error(`missing GEO guide data: ${GEO_GUIDES_PATH}`);

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const guides = [
    ...JSON.parse(fs.readFileSync(GUIDES_PATH, 'utf8')),
    ...JSON.parse(fs.readFileSync(GEO_GUIDES_PATH, 'utf8')),
  ];

  writePage(template, 'guides', {
    title: 'Lighting Guides | Chandeliers, Wall Lights & Project Advice | Samrat Glass',
    description: 'Practical lighting guides from Samrat Glass covering chandelier sizing, hanging height, room lighting, customisation, glass craftsmanship and project planning.',
    canonical: `${SITE_ORIGIN}/guides`,
    schemas: hubSchemas(guides),
  }, hubBody(guides));
  console.log('[prerender] guides hub: /guides');

  guides.forEach((guide) => {
    const canonical = `${SITE_ORIGIN}/guides/${guide.slug}`;
    writePage(template, path.join('guides', guide.slug), {
      title: guide.seoTitle || `${guide.title} | Samrat Glass`,
      description: guide.description,
      canonical,
      schemas: guideSchemas(guide),
    }, guideBody(guide));
    console.log(`[prerender] guide: /guides/${guide.slug}`);
  });
  console.log(`[prerender] Done. ${guides.length} guide pages + hub written.`);
}

if (require.main === module) run();
module.exports = { run, guideBody, hubBody, guideSchemas, hubSchemas };
