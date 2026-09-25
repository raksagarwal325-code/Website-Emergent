#!/usr/bin/env node
/**
 * Emit crawler-readable HTML for every published product.
 *
 * WhatsApp and several social crawlers do not execute the React bundle before
 * reading Open Graph metadata. These static product entry points make the
 * product name, description and primary image available in the first response.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const {
  SITE_ORIGIN,
  escapeHtml,
  productPath,
  resolveApiBase,
} = require("./prerender-categories");

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "build");
const DEFAULT_SHARE_IMAGE = `${SITE_ORIGIN}/logo.jpeg`;
const PAGE_SIZE = 48;

function fetchJson(url, timeoutMs = 15000) {
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
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (error) {
          reject(new Error(`bad JSON from ${url}: ${error.message}`));
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error(`timeout after ${timeoutMs}ms for ${url}`)));
    req.on("error", reject);
  });
}

function absoluteUrl(value, apiBase, fallback = DEFAULT_SHARE_IMAGE) {
  if (!value) return fallback;
  try {
    if (value.startsWith("/api/")) {
      return new URL(value, `${apiBase.replace(/\/+$/, "")}/`).href;
    }
    return new URL(value, `${SITE_ORIGIN}/`).href;
  } catch {
    return fallback;
  }
}

function socialPreviewUrl(value, apiBase) {
  const image = absoluteUrl(value, apiBase);
  try {
    const parsed = new URL(image);
    const marker = "/api/files/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return { url: image, type: null };
    const storagePath = parsed.pathname.slice(markerIndex + marker.length);
    if (!storagePath || !storagePath.includes("/products/")) return { url: image, type: null };
    return {
      url: `${parsed.origin}/api/social-preview/${storagePath}.jpg`,
      type: "image/jpeg",
    };
  } catch {
    return { url: DEFAULT_SHARE_IMAGE, type: "image/jpeg" };
  }
}

function metaDescription(product) {
  const source = product.short_description || product.description ||
    `${product.name} by Samrat Glass Emporium, handcrafted in Firozabad, India.`;
  return String(source).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function imageObject(url, product, canonical, index = 0) {
  if (!url) return null;
  return {
    "@type": "ImageObject",
    "@id": `${canonical}#image-${index + 1}`,
    url,
    contentUrl: url,
    name: product.name,
    caption: product.name,
    ...(index === 0 ? { representativeOfPage: true } : {}),
    creator: {
      "@type": "Organization",
      name: "Samrat Glass Emporium",
      url: SITE_ORIGIN,
    },
    copyrightHolder: {
      "@type": "Organization",
      name: "Samrat Glass Emporium",
      url: SITE_ORIGIN,
    },
    creditText: "Samrat Glass Emporium",
    copyrightNotice: "© Samrat Glass Emporium. All rights reserved.",
  };
}

function productSchema(product, canonical, images, description) {
  const price = Number(product.price);
  // Price on Request must never expose the stored internal price. A Product
  // snippet without a public offer or genuine reviews is not eligible, so do
  // not emit an incomplete Product node for those pages.
  if (product.price_display === "on_request" || !Number.isFinite(price) || price <= 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonical}#product`,
    url: canonical,
    name: product.name,
    ...(product.sku ? { sku: product.sku } : {}),
    description,
    image: images.map((url, index) => imageObject(url, product, canonical, index)).filter(Boolean),
    brand: { "@type": "Brand", name: "Samrat Glass Emporium" },
    ...(product.category ? { category: product.category } : {}),
    offers: {
      "@type": "Offer",
      url: canonical,
      price: String(price),
      priceCurrency: "INR",
    },
  };
}

function removeShareMetadata(html) {
  return html
    .replace(/<meta\s+property="og:(?:title|description|type|url|image|image:secure_url|image:type|image:alt)"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:(?:card|title|description|image)"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");
}

function injectProduct(template, product, apiBase) {
  const route = productPath(product);
  const canonical = `${SITE_ORIGIN}${route}`;
  const title = `${product.name} · Samrat Glass Emporium`;
  const description = metaDescription(product);
  const shareImage = socialPreviewUrl((product.images || [])[0], apiBase);
  const originalImages = (product.images || [])
    .map((value) => absoluteUrl(value, apiBase, ""))
    .filter(Boolean);
  const primaryOriginalImage = originalImages[0] || DEFAULT_SHARE_IMAGE;
  const schema = productSchema(product, canonical, originalImages, description);

  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"[^>]*>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );
  html = removeShareMetadata(html);

  const shareMetadata = [
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${escapeHtml(shareImage.url)}" />`,
    `<meta property="og:image:secure_url" content="${escapeHtml(shareImage.url)}" />`,
    ...(shareImage.type ? [`<meta property="og:image:type" content="${shareImage.type}" />`] : []),
    `<meta property="og:image:alt" content="${escapeHtml(product.name)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(shareImage.url)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
  ].join("\n");

  html = html.replace(
    /<\/head>/i,
    `${shareMetadata}${schema ? `\n<script type="application/ld+json" data-schema="prerender-product">${safeJson(schema)}</script>` : ""}\n</head>`,
  );

  const body = `<main class="prerender-shell"><article><p class="prerender-eyebrow">${escapeHtml(product.category || "Handcrafted lighting")}</p><h1>${escapeHtml(product.name)}</h1><img src="${escapeHtml(primaryOriginalImage)}" alt="${escapeHtml(product.name)}"/><p>${escapeHtml(description)}</p>${product.sku ? `<p>Reference Code: ${escapeHtml(product.sku)}</p>` : ""}</article></main>`;
  return html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${body}</div>`);
}

function legacyProductPath(product) {
  const id = String(product?.id || "").trim();
  if (!id || id.includes("/") || id.includes("?") || id.includes("#")) return "";
  return `/product/${id}`;
}

function injectLegacyRedirect(template, product) {
  const destination = productPath(product);
  const canonical = `${SITE_ORIGIN}${destination}`;
  const title = `${product.name} · Samrat Glass Emporium`;
  const description = metaDescription(product);

  let html = template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"[^>]*>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );
  html = removeShareMetadata(html);
  html = html.replace(
    /<\/head>/i,
    `<link rel="canonical" href="${canonical}" />\n<meta http-equiv="refresh" content="0;url=${canonical}" />\n<script>window.location.replace(${safeJson(destination)});</script>\n</head>`,
  );
  const body = `<main class="prerender-shell"><article><h1>${escapeHtml(product.name)}</h1><p>This product has moved to its permanent address.</p><p><a href="${canonical}">View ${escapeHtml(product.name)}</a></p></article></main>`;
  return html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${body}</div>`);
}

async function fetchPublishedProducts(apiBase, fetcher = fetchJson) {
  const products = [];
  let expectedTotal = null;
  for (let page = 1; page <= 200; page += 1) {
    const url = `${apiBase.replace(/\/+$/, "")}/api/products?sort=name&limit=${PAGE_SIZE}&page=${page}`;
    const response = await fetcher(url);
    if (!response || !Array.isArray(response.items)) {
      throw new Error(`page ${page} returned an invalid products response`);
    }
    if (expectedTotal == null) expectedTotal = Number(response.total);
    products.push(...response.items.filter(
      (item) => item && item.id && item.name && (!item.status || item.status === "published"),
    ));
    const totalPages = Number(response.total_pages) || 0;
    if (page >= totalPages || response.items.length === 0) break;
  }
  if (!products.length) throw new Error("the public catalogue returned no published products");
  if (Number.isFinite(expectedTotal) && products.length !== expectedTotal) {
    throw new Error(`expected ${expectedTotal} published products but fetched ${products.length}`);
  }
  return products;
}

async function runPrerenderProducts(options = {}) {
  const apiBase = options.apiBase || resolveApiBase();
  const buildDir = options.buildDir || BUILD_DIR;
  const templatePath = options.templatePath || path.join(buildDir, "index.html");
  const logger = options.logger || console;
  const fetcher = options.fetcher || fetchJson;
  const template = fs.readFileSync(templatePath, "utf8");
  const products = await fetchPublishedProducts(apiBase, fetcher);
  const writtenRoutes = new Set();
  const redirects = [];

  for (const product of products) {
    const route = productPath(product);
    if (writtenRoutes.has(route)) throw new Error(`duplicate product route: ${route}`);
    writtenRoutes.add(route);
    const outDir = path.join(buildDir, route.replace(/^\//, ""));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), injectProduct(template, product, apiBase), "utf8");

    const legacyRoute = legacyProductPath(product);
    if (legacyRoute && legacyRoute !== route) {
      const legacyDir = path.join(buildDir, legacyRoute.replace(/^\//, ""));
      fs.mkdirSync(legacyDir, { recursive: true });
      fs.writeFileSync(
        path.join(legacyDir, "index.html"),
        injectLegacyRedirect(template, product),
        "utf8",
      );
      redirects.push(`${legacyRoute} ${route} 301`);
    }
  }

  // Cloudflare Pages reads `_redirects` from the deployed build directory.
  // The generated HTML at each legacy route remains a canonical/meta-refresh
  // fallback for preview or alternate hosts that do not support this manifest.
  fs.writeFileSync(
    path.join(buildDir, "_redirects"),
    `# Generated product permalink migrations — do not edit manually.\n${redirects.join("\n")}\n`,
    "utf8",
  );

  logger.log(`[prerender-products] Done. ${products.length} product pages and ${redirects.length} legacy redirects written.`);
  return { count: products.length, routes: [...writtenRoutes], redirectCount: redirects.length };
}

if (require.main === module) {
  runPrerenderProducts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(`[prerender-products] ERROR: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  absoluteUrl,
  socialPreviewUrl,
  fetchPublishedProducts,
  injectProduct,
  injectLegacyRedirect,
  legacyProductPath,
  imageObject,
  metaDescription,
  productSchema,
  runPrerenderProducts,
  DEFAULT_SHARE_IMAGE,
  PAGE_SIZE,
};
