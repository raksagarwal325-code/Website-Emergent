#!/usr/bin/env node
/**
 * Build-time prerender for the six SEO category pages.
 *
 * Contract (v2 — production-safe):
 *   * A reachable API is mandatory. If the API cannot be reached, or any
 *     single category fetch fails, the script exits non-zero so the build
 *     itself fails. We never silently publish empty SEO pages.
 *   * A single-source `categories.data.json` drives everything (React app,
 *     sitemap, this script).
 *   * For each of the 6 categories, we emit `build/category/<slug>/index.html`
 *     with a per-page <title>, <meta description>, <link canonical>, and a
 *     prerendered body (H1 + intro + product tiles + CollectionPage JSON-LD
 *     with matching ItemList).
 *   * Legitimate "no products in this category yet" is allowed only when the
 *     preflight endpoint confirms the category is currently empty. If the
 *     preflight says the category has products but the category fetch
 *     returns zero, that is treated as an integrity error and fails the
 *     build. This is the guard that catches the recent production regression.
 *
 * Configuration (all read from environment — no silent defaults):
 *   * PRERENDER_API_URL     preferred; explicit CI override
 *   * REACT_APP_BACKEND_URL fallback; the URL the client app hits at runtime
 *   * If neither is set, the script prints a clear message and exits 1.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

// ---------------------------------------------------------------------------
// Config / paths
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "build");
const CATEGORIES_JSON = path.join(ROOT, "src/lib/categories.data.json");
const TEMPLATE_PATH = path.join(BUILD_DIR, "index.html");
const SITE_ORIGIN = "https://samratglass.com";

// ---------------------------------------------------------------------------
// Small helpers (pure) — exported for test coverage
// ---------------------------------------------------------------------------
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Mirrors api.resolveImage() at runtime so the prerender output matches
// what React renders. Only rewrites `/api/…` paths — external URLs pass
// through untouched.
function resolveImage(u, apiBase) {
  if (!u) return "";
  if (u.startsWith("/api/")) return `${apiBase.replace(/\/+$/, "")}${u}`;
  return u;
}

function fetchJson(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https:") ? https : http;
    const req = mod.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (e) {
          reject(new Error(`bad JSON from ${url}: ${e.message}`));
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error(`timeout after ${timeoutMs}ms for ${url}`)));
    req.on("error", reject);
  });
}

function categoryCollectionSchemaId(cat) {
  return `category-${cat.slug}`;
}

function categoryBreadcrumbSchemaId(cat) {
  return `category-breadcrumb-${cat.slug}`;
}

function collectionSchema(cat, products) {
  const canonical = `${SITE_ORIGIN}/category/${cat.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    "url": canonical,
    "name": cat.h1,
    "description": cat.metaDescription,
    "isPartOf": { "@id": `${SITE_ORIGIN}/#website` },
    "about": cat.label,
    "mainEntity": {
      "@type": "ItemList",
      "itemListOrder": "https://schema.org/ItemListOrderDescending",
      "numberOfItems": products.length,
      "itemListElement": products.map((p, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "url": `${SITE_ORIGIN}/product/${p.id}`,
        "name": p.name,
      })),
    },
  };
}

function breadcrumbSchema(cat) {
  const canonical = `${SITE_ORIGIN}/category/${cat.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${SITE_ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Catalog",
        "item": `${SITE_ORIGIN}/catalog`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": cat.label,
        "item": canonical,
      },
    ],
  };
}

function productTilesHtml(products, apiBase) {
  if (!products.length) return "";
  const tiles = products
    .map((p) => {
      const img = resolveImage((p.images || [])[0], apiBase);
      const href = `/product/${p.id}`;
      return `<li class="prerender-tile"><a href="${escapeHtml(href)}">${
        img ? `<img loading="lazy" decoding="async" src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}"/>` : ""
      }<span class="prerender-tile-name">${escapeHtml(p.name)}</span>${
        p.sku ? `<span class="prerender-tile-sku">${escapeHtml(p.sku)}</span>` : ""
      }</a></li>`;
    })
    .join("");
  return `<ul class="prerender-product-grid">${tiles}</ul>`;
}

function buildBodyHtml(cat, products, allCategories, apiBase) {
  const productCount = products.length;
  const tiles = productTilesHtml(products, apiBase);
  return `<div class="prerender-shell">
    <nav class="prerender-breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a> · <a href="/catalog">Catalog</a> · <span>${escapeHtml(cat.label)}</span>
    </nav>
    <p class="prerender-eyebrow">The Collection</p>
    <h1>${escapeHtml(cat.h1)}</h1>
    <p class="prerender-intro">${escapeHtml(cat.intro)}</p>
    ${productCount > 0
      ? `<p class="prerender-count">Showing ${productCount} piece${productCount === 1 ? "" : "s"}.</p>`
      : ""}
    ${tiles}
    <nav class="prerender-cross" aria-label="More categories">
      <span>Explore more:</span>
      ${allCategories.filter((c) => c.slug !== cat.slug)
        .map((c) => `<a href="/category/${c.slug}">${escapeHtml(c.label)}</a>`)
        .join(" ")}
    </nav>
  </div>`;
}

function inject(template, cat, products, allCategories, apiBase) {
  const canonical = `${SITE_ORIGIN}/category/${cat.slug}`;
  const schema = collectionSchema(cat, products);
  const breadcrumbs = breadcrumbSchema(cat);
  const bodyHtml = buildBodyHtml(cat, products, allCategories, apiBase);

  let html = template;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(cat.seoTitle)}</title>`,
  );

  html = html.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtml(cat.metaDescription)}" />`,
  );

  const ogBlock = [
    `<meta property="og:title" content="${escapeHtml(cat.seoTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(cat.metaDescription)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:title" content="${escapeHtml(cat.seoTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(cat.metaDescription)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
  ].join("\n");

  html = html
    .replace(/<meta\s+property="og:title"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:description"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:type"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:url"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:title"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:description"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");

  html = html.replace(
    /<\/head>/i,
    `${ogBlock}\n` +
      `<script type="application/ld+json" data-schema="${categoryCollectionSchemaId(cat)}">${JSON.stringify(schema)}</script>\n` +
      `<script type="application/ld+json" data-schema="${categoryBreadcrumbSchemaId(cat)}">${JSON.stringify(breadcrumbs)}</script>\n` +
      `</head>`,
  );

  html = html.replace(
    /<div id="root">[\s\S]*?<\/div>/i,
    `<div id="root">${bodyHtml}</div>`,
  );

  return html;
}

// ---------------------------------------------------------------------------
// API access — all functions throw on failure
// ---------------------------------------------------------------------------

/** Preflight: return the set of category names that currently have at least
 *  one published product. Used to distinguish "legitimate empty category"
 *  from "backend unreachable / partial failure". */
async function preflight(apiBase) {
  const url = `${apiBase.replace(/\/+$/, "")}/api/products/categories`;
  const res = await fetchJson(url);
  if (!Array.isArray(res)) {
    throw new Error(
      `preflight: /api/products/categories returned a non-array response: ${JSON.stringify(res).slice(0, 160)}`,
    );
  }
  return new Set(res);
}

/** Fetch the first page of published products for a single category.
 *  Throws on network/HTTP errors. Filters out non-published and malformed
 *  rows client-side as a belt-and-braces guard. */
async function fetchCategoryProducts(apiBase, dbName) {
  const url =
    `${apiBase.replace(/\/+$/, "")}/api/products` +
    `?category=${encodeURIComponent(dbName)}&sort=newest&limit=24&page=1`;
  const res = await fetchJson(url);
  const items = Array.isArray(res?.items) ? res.items : [];
  return items.filter(
    (p) => p && p.id && p.name && (p.status ? p.status === "published" : true),
  );
}

// ---------------------------------------------------------------------------
// Runner — throws on any failure. Returns per-category summaries.
// ---------------------------------------------------------------------------

/**
 * Resolve the API base URL from environment. `PRERENDER_API_URL` wins so CI
 * can point at a staging backend; falls back to `REACT_APP_BACKEND_URL`
 * which is the same URL the client uses at runtime. No silent default —
 * missing config throws.
 */
function resolveApiBase(env = process.env) {
  const url = (env.PRERENDER_API_URL || env.REACT_APP_BACKEND_URL || "").trim();
  if (!url) {
    throw new Error(
      "No API URL configured. Set PRERENDER_API_URL or REACT_APP_BACKEND_URL " +
      "so the prerender script knows where to fetch product data from.",
    );
  }
  return url.replace(/\/+$/, "");
}

async function runPrerender(options = {}) {
  const apiBase = options.apiBase || resolveApiBase();
  const buildDir = options.buildDir || BUILD_DIR;
  const categoriesJson = options.categoriesJson || CATEGORIES_JSON;
  const templatePath = options.templatePath || path.join(buildDir, "index.html");
  const logger = options.logger || console;

  // --- Load inputs ---
  let CATEGORIES;
  try {
    CATEGORIES = require(categoriesJson).categories;
  } catch (e) {
    throw new Error(`could not load ${categoriesJson}: ${e.message}`);
  }
  if (!Array.isArray(CATEGORIES) || CATEGORIES.length === 0) {
    throw new Error(`${categoriesJson} contains no categories`);
  }
  // Prerender only publishes pages for `published` categories. Unpublished
  // rows exist in the data file but are excluded from crawlable output.
  const PUBLISHED = CATEGORIES.filter((c) => c.published);
  if (PUBLISHED.length === 0) {
    throw new Error(`${categoriesJson} contains no published categories`);
  }

  let template;
  try {
    template = fs.readFileSync(templatePath, "utf8");
  } catch (e) {
    throw new Error(`could not read build template ${templatePath}: ${e.message}`);
  }

  logger.log(`[prerender] API base: ${apiBase}`);

  // --- Preflight ---
  let populated;
  try {
    populated = await preflight(apiBase);
    logger.log(`[prerender] preflight OK — categories with products: ${[...populated].join(", ") || "(none)"}`);
  } catch (e) {
    throw new Error(`preflight failed — refusing to prerender empty SEO pages: ${e.message}`);
  }

  // --- Per-category ---
  const summaries = [];
  for (const cat of PUBLISHED) {
    let products;
    try {
      products = await fetchCategoryProducts(apiBase, cat.db_name);
    } catch (e) {
      throw new Error(`${cat.slug}: product fetch failed — ${e.message}`);
    }

    // Integrity check: preflight said this category has products, but we
    // got zero back. Fail loudly rather than publish an empty SEO page.
    if (populated.has(cat.db_name) && products.length === 0) {
      throw new Error(
        `${cat.slug}: preflight reported this category has products, but the ` +
        `product fetch returned 0 items. Refusing to publish an empty SEO page.`,
      );
    }

    // Write file
    const outDir = path.join(buildDir, "category", cat.slug);
    fs.mkdirSync(outDir, { recursive: true });
    const html = inject(template, cat, products, PUBLISHED, apiBase);
    fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");

    logger.log(`[prerender]   ${cat.slug.padEnd(16)} → ${products.length} products`);
    summaries.push({ slug: cat.slug, dbName: cat.db_name, count: products.length });
  }

  logger.log(`[prerender] Done. ${summaries.length} category pages written.`);
  return summaries;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
if (require.main === module) {
  runPrerender()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`[prerender] ERROR: ${err.message}`);
      process.exit(1);
    });
}

// ---------------------------------------------------------------------------
// Exports for tests
// ---------------------------------------------------------------------------
module.exports = {
  runPrerender,
  preflight,
  fetchCategoryProducts,
  resolveApiBase,
  inject,
  buildBodyHtml,
  productTilesHtml,
  collectionSchema,
  breadcrumbSchema,
  categoryCollectionSchemaId,
  categoryBreadcrumbSchemaId,
  escapeHtml,
  resolveImage,
  // Constants exposed for tests
  BUILD_DIR,
  CATEGORIES_JSON,
  SITE_ORIGIN,
};
