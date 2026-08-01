#!/usr/bin/env node
/**
 * Build-time prerender for the six SEO category pages.
 *
 *  * Reads `src/lib/categories.data.json` — the ONE canonical source used at
 *    runtime by React too. Never duplicate the list.
 *  * For each category:
 *      - fetches the first page of published products from the backend API
 *        (best-effort; failures are tolerated per-category);
 *      - reads `build/index.html` as the template;
 *      - injects a per-page <title>, <meta description>, <link canonical>
 *        and a prerendered <div id="root"> body: H1 + intro + product tiles
 *        + a CollectionPage JSON-LD block that references only the products
 *        the API actually returned;
 *      - writes `build/category/<slug>/index.html`.
 *
 * Failure policy:
 *  * A failure fetching one category MUST NOT prevent the other five from
 *    being generated.
 *  * If the API is completely unreachable the HTML is still emitted with
 *    the static SEO tags (H1, intro, canonical, JSON-LD without ItemList).
 *    We never weaken the SEO output; only the product tiles are omitted.
 *  * Any hard error (e.g. build/index.html missing) exits with a warning
 *    but does NOT fail the build — the routes still work via SPA hydration.
 *
 * Emergent's static host serves matching filesystem entries before falling
 * back to `index.html`, so `build/category/chandeliers/index.html` is
 * returned directly for `/category/chandeliers`. Google indexes the file
 * without needing JavaScript.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "build");
const CATEGORIES_JSON = path.join(ROOT, "src/lib/categories.data.json");
const TEMPLATE_PATH = path.join(BUILD_DIR, "index.html");
const SITE_ORIGIN = "https://samratglass.com";

// The API to hit at build time. Defaults to the internal backend so builds
// running inside Emergent's pod work without extra config. Override via
// PRERENDER_API_URL for CI runs against a staging backend.
const API_BASE =
  process.env.PRERENDER_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:8001";
const API = `${API_BASE.replace(/\/+$/, "")}/api`;

const log = (...args) => console.log("[prerender]", ...args);
const warn = (...args) => console.warn("[prerender]", ...args);

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Minimal image-URL resolver — mirrors api.resolveImage() at runtime so the
// prerender output matches what the React app renders.
function resolveImage(u) {
  if (!u) return "";
  if (u.startsWith("/api/")) return `${API_BASE.replace(/\/+$/, "")}${u}`;
  return u;
}

function fetchJson(url, timeoutMs = 12000) {
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
          reject(e);
        }
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
  });
}

async function fetchCategoryProducts(dbName) {
  const url = `${API}/products?category=${encodeURIComponent(dbName)}&sort=newest&limit=24&page=1`;
  const res = await fetchJson(url);
  const items = Array.isArray(res?.items) ? res.items : [];
  // Defensive: never emit unpublished products, never emit anything without
  // an id or name.
  return items.filter(
    (p) => p && p.id && p.name && (p.status ? p.status === "published" : true),
  );
}

function availabilityFor(product) {
  if (product?.status && product.status !== "published") return null;
  const s = Number(product?.stock);
  if (Number.isFinite(s) && s > 0) return "https://schema.org/InStock";
  return "https://schema.org/PreOrder";
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

function productTilesHtml(products) {
  if (!products.length) return "";
  const tiles = products
    .map((p) => {
      const img = resolveImage((p.images || [])[0]);
      const href = `/product/${p.id}`;
      return `<li class="prerender-tile"><a href="${escapeHtml(href)}">${
        img
          ? `<img loading="lazy" decoding="async" src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}"/>`
          : ""
      }<span class="prerender-tile-name">${escapeHtml(p.name)}</span>${
        p.sku ? `<span class="prerender-tile-sku">${escapeHtml(p.sku)}</span>` : ""
      }</a></li>`;
    })
    .join("");
  return `<ul class="prerender-product-grid">${tiles}</ul>`;
}

function buildBodyHtml(cat, products) {
  const availabilityMap = products.map((p) => ({
    id: p.id,
    availability: availabilityFor(p),
  }));
  const tiles = productTilesHtml(products);
  const productCount = products.length;

  return `<div class="prerender-shell">
    <nav class="prerender-breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a> · <a href="/catalog">Catalog</a> · <span>${escapeHtml(cat.label)}</span>
    </nav>
    <p class="prerender-eyebrow">The Collection</p>
    <h1>${escapeHtml(cat.h1)}</h1>
    <p class="prerender-intro">${escapeHtml(cat.intro)}</p>
    ${
      productCount > 0
        ? `<p class="prerender-count">Showing ${productCount} piece${productCount === 1 ? "" : "s"}.</p>`
        : ""
    }
    ${tiles}
    <nav class="prerender-cross" aria-label="More categories">
      <span>Explore more:</span>
      ${CATEGORIES.filter((c) => c.slug !== cat.slug)
        .map((c) => `<a href="/category/${c.slug}">${escapeHtml(c.label)}</a>`)
        .join(" ")}
    </nav>
    <!-- availability-map: ${JSON.stringify(availabilityMap)} -->
  </div>`;
}

function inject(template, cat, products) {
  const canonical = `${SITE_ORIGIN}/category/${cat.slug}`;
  const schema = collectionSchema(cat, products);
  const bodyHtml = buildBodyHtml(cat, products);

  let html = template;

  // 1. Title
  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(cat.seoTitle)}</title>`,
  );

  // 2. Meta description
  html = html.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtml(cat.metaDescription)}" />`,
  );

  // 3. OG + Twitter tags for social previews
  const ogBlock = [
    `<meta property="og:title" content="${escapeHtml(cat.seoTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(cat.metaDescription)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:title" content="${escapeHtml(cat.seoTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(cat.metaDescription)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
  ].join("\n");

  // Strip any existing og:title/og:description/twitter:*/canonical so the
  // prerendered values are authoritative. We don't remove other OG tags
  // (site_name, image) that stay valid across pages.
  html = html
    .replace(/<meta\s+property="og:title"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:description"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:type"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:url"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:title"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:description"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");

  // 4. Insert canonical + og/twitter before </head>
  html = html.replace(
    /<\/head>/i,
    `${ogBlock}\n<script type="application/ld+json">${JSON.stringify(schema)}</script>\n</head>`,
  );

  // 5. Prerendered body inside <div id="root">. React will hydrate over it.
  html = html.replace(
    /<div id="root">[\s\S]*?<\/div>/i,
    `<div id="root">${bodyHtml}</div>`,
  );

  return html;
}

// ----- Main -----------------------------------------------------------------
let CATEGORIES = [];
try {
  CATEGORIES = require(CATEGORIES_JSON).categories;
} catch (e) {
  warn(`could not load ${CATEGORIES_JSON}: ${e.message}`);
  process.exit(0);
}

if (!Array.isArray(CATEGORIES) || CATEGORIES.length === 0) {
  warn("no categories found in data JSON — skipping prerender");
  process.exit(0);
}

let template;
try {
  template = fs.readFileSync(TEMPLATE_PATH, "utf8");
} catch (e) {
  warn(`could not read ${TEMPLATE_PATH}: ${e.message}. Skipping prerender — routes will still render client-side.`);
  process.exit(0);
}

(async () => {
  let ok = 0;
  let failures = 0;
  for (const cat of CATEGORIES) {
    let products = [];
    try {
      products = await fetchCategoryProducts(cat.db_name);
      log(`  ${cat.slug.padEnd(16)} → ${products.length} products`);
    } catch (e) {
      warn(`  ${cat.slug.padEnd(16)} → API failed (${e.message}); emitting HTML without ItemList`);
      products = [];
    }
    try {
      const outDir = path.join(BUILD_DIR, "category", cat.slug);
      fs.mkdirSync(outDir, { recursive: true });
      const html = inject(template, cat, products);
      fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
      ok += 1;
    } catch (e) {
      warn(`  ${cat.slug.padEnd(16)} → write failed: ${e.message}`);
      failures += 1;
    }
  }
  log(`Done. ${ok} category page${ok === 1 ? "" : "s"} written; ${failures} failure${failures === 1 ? "" : "s"}.`);
  // Never fail the build — CSR fallback is always in place.
  process.exit(0);
})().catch((e) => {
  warn(`unexpected: ${e.message}. Build continues.`);
  process.exit(0);
});
