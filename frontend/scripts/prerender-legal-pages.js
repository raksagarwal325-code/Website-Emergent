#!/usr/bin/env node
/** Serve the same public legal wording in the initial HTML as React renders. */
const fs = require("fs");
const path = require("path");
const { SITE_ORIGIN, escapeHtml, resolveApiBase } = require("./prerender-categories");
const { fetchSettings } = require("./prerender-gallery-projects");

async function loadFrontendModule(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "lib", relativePath), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

function renderPolicy(page, order, pages, lastUpdated) {
  const sectionHtml = (page.sections || []).map((section) => `<section>
    ${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ""}
    ${section.text ? `<p>${escapeHtml(section.text).replace(/\n/g, "<br>")}</p>` : ""}
    ${section.bullets?.length ? `<ul>${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}
    ${(section.blocks || []).map((block) => `${block.subheading ? `<h3>${escapeHtml(block.subheading)}</h3>` : ""}${block.text ? `<p>${escapeHtml(block.text)}</p>` : ""}`).join("")}
  </section>`).join("\n");
  const links = order.filter((slug) => slug !== page.slug)
    .map((slug) => `<a href="/legal/${escapeHtml(slug)}">${escapeHtml(pages[slug].title)}</a>`).join(" · ");
  return `<main class="prerender-shell"><article>
    <nav aria-label="Breadcrumb"><a href="/">Home</a> · ${escapeHtml(page.title)}</nav>
    <h1>${escapeHtml(page.title)}</h1>
    <p>Last updated: ${escapeHtml(lastUpdated)}</p>
    ${page.intro ? `<p>${escapeHtml(page.intro).replace(/\n/g, "<br>")}</p>` : ""}
    ${sectionHtml}
    <nav aria-label="Other policies">${links}</nav>
  </article></main>`;
}

function inject(template, slug, page, description, body) {
  const title = `${page.title} · Samrat Glass Emporium`;
  const canonical = `${SITE_ORIGIN}/legal/${slug}`;
  const metadata = [
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
  ].join("\n");
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta\s+(?:property="og:(?:title|description|url)"|name="twitter:(?:title|description)")[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<\/head>/i, `${metadata}\n</head>`)
    .replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${body}</div>`);
}

async function run(options = {}) {
  const buildDir = options.buildDir || path.join(__dirname, "..", "build");
  const settings = await (options.fetcher || fetchSettings)(options.apiBase || resolveApiBase());
  const content = options.content || await loadFrontendModule("legalContent.js");
  const { parseLegalBody } = options.parser || await loadFrontendModule("legalPolicyBody.js");
  const { normalizePublicLegalPage } = options.normalizer || await loadFrontendModule("publicClaimNormalization.js");
  const template = fs.readFileSync(path.join(buildDir, "index.html"), "utf8");
  const { LEGAL_ORDER, LEGAL_PAGES, LEGAL_META_DESCRIPTIONS, LEGAL_DEFAULT_UPDATED_AT } = content;
  for (const slug of LEGAL_ORDER) {
    const defaults = LEGAL_PAGES[slug];
    const entry = settings?.legal_content?.[slug];
    const override = parseLegalBody(entry?.body);
    const useOverride = override && Array.isArray(override.sections) && override.sections.length > 0;
    const rawPage = useOverride
      ? { ...defaults, intro: override.intro || defaults.intro, sections: override.sections }
      : defaults;
    const page = normalizePublicLegalPage(slug, rawPage);
    const description = LEGAL_META_DESCRIPTIONS[slug] || page.summary;
    if (!page || !description) throw new Error(`missing legal content/metadata for ${slug}`);
    const body = renderPolicy(page, LEGAL_ORDER, LEGAL_PAGES, entry?.updated_at?.trim() || LEGAL_DEFAULT_UPDATED_AT);
    const output = path.join(buildDir, "legal", slug, "index.html");
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, inject(template, slug, page, description, body), "utf8");
  }
  (options.logger || console).log(`[prerender-legal-pages] ${LEGAL_ORDER.length} pages written`);
  return LEGAL_ORDER.length;
}

if (require.main === module) run().catch((error) => { console.error(`[prerender-legal-pages] ${error.message}`); process.exit(1); });
module.exports = { renderPolicy, inject, run };
