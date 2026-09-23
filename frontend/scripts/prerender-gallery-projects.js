#!/usr/bin/env node
/** Build current public gallery permalinks from the same settings payload and
 * title-based slug algorithm used by GalleryProject. Do not revive old slugs. */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { SITE_ORIGIN, escapeHtml, resolveApiBase } = require("./prerender-categories");

function projectSlug(title, index) {
  return String(title || "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "").slice(0, 80) || `project-${index + 1}`;
}

function projectRoutes(items) {
  const used = new Map();
  return items.map((project, index) => {
    const base = projectSlug(project?.title, index);
    const count = (used.get(base) || 0) + 1;
    used.set(base, count);
    return { project, route: `/gallery/${count === 1 ? base : `${base}-${count}`}` };
  }).filter(({ project }) => project && (String(project.title || "").trim() || (project.images || []).some(Boolean)));
}

function fetchSettings(apiBase, timeoutMs = 20000) {
  const url = `${apiBase.replace(/\/+$/, "")}/api/settings`;
  return new Promise((resolve, reject) => {
    const transport = url.startsWith("https:") ? https : http;
    const req = transport.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch (error) { reject(new Error(`invalid settings JSON: ${error.message}`)); }
      });
    });
    req.on("timeout", () => req.destroy(new Error(`timeout after ${timeoutMs}ms for ${url}`)));
    req.on("error", reject);
  });
}

function absoluteImage(value) {
  if (!value) return `${SITE_ORIGIN}/logo.jpeg`;
  try { return new URL(value, `${SITE_ORIGIN}/`).href; }
  catch { return `${SITE_ORIGIN}/logo.jpeg`; }
}

function inject(template, entry) {
  const { project, route } = entry;
  const title = `${project.title} | Samrat Glass Project`;
  const description = (project.note || "").slice(0, 155) ||
    `${project.title} — a Samrat Glass Emporium installation in ${project.location || "India"}.`;
  const canonical = `${SITE_ORIGIN}${route}`;
  const image = absoluteImage((project.images || []).find(Boolean));
  const metadata = [
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:secure_url" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(project.title)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
  ].join("\n");
  const body = `<main class="prerender-shell"><article><nav aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/gallery">Project Gallery</a></nav><h1>${escapeHtml(project.title)}</h1>${project.location ? `<p>${escapeHtml(project.location)}</p>` : ""}${project.note ? `<p>${escapeHtml(project.note)}</p>` : ""}<img src="${escapeHtml(image)}" alt="${escapeHtml(project.title)}" /><p><a href="/gallery">Browse more installations</a> · <a href="/contact">Discuss a similar project</a></p></article></main>`;
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta\s+(?:property="og:(?:title|description|url|image|image:secure_url|image:alt)"|name="twitter:(?:title|description|image)")[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<\/head>/i, `${metadata}\n</head>`)
    .replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${body}</div>`);
}

async function run(options = {}) {
  const buildDir = options.buildDir || path.join(__dirname, "..", "build");
  const settings = await (options.fetcher || fetchSettings)(options.apiBase || resolveApiBase());
  const items = settings?.homepage_content?.gallery?.items;
  if (!Array.isArray(items) || !items.length) throw new Error("public settings returned no gallery projects");
  const template = fs.readFileSync(path.join(buildDir, "index.html"), "utf8");
  const routes = projectRoutes(items);
  if (!routes.length) throw new Error("no publishable gallery projects");
  for (const entry of routes) {
    const output = path.join(buildDir, entry.route.replace(/^\//, ""), "index.html");
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, inject(template, entry), "utf8");
  }
  (options.logger || console).log(`[prerender-gallery-projects] ${routes.length} pages written`);
  return routes.map((entry) => entry.route);
}

if (require.main === module) run().catch((error) => { console.error(`[prerender-gallery-projects] ${error.message}`); process.exit(1); });
module.exports = { projectSlug, projectRoutes, fetchSettings, inject, run };
