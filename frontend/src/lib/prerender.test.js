/**
 * Regression tests for the category prerender pipeline.
 *
 * Guards production against three concrete failure modes:
 *   1. Empty SEO pages: script must throw when any category fetch fails.
 *   2. Silent zero-count publish: script must throw when preflight says a
 *      category has products but the category fetch returns 0.
 *   3. Missing config: script must throw when no API URL is configured
 *      (no silent localhost default).
 *
 * Also validates the pure-function output so we catch template drift:
 *   * ItemList `numberOfItems` matches emitted tiles.
 *   * At least one crawlable /product/<id> anchor per populated category.
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const {
  runPrerender,
  productTilesHtml,
  collectionSchema,
  buildBodyHtml,
  inject,
  resolveApiBase,
} = require("../../scripts/prerender-categories");

// Create a scratch build dir with a minimal index.html template so
// runPrerender() gets past its template-read step and we can test the
// API-facing failure paths in isolation.
function makeScratchBuildDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prerender-test-"));
  const html = `<!doctype html><html><head><title>orig</title><meta name="description" content="orig"/></head><body><div id="root"></div></body></html>`;
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
  return dir;
}

const FAKE_CAT = {
  slug: "chandeliers",
  db_name: "Chandelier",
  label: "Chandeliers",
  h1: "Handcrafted Crystal Chandeliers",
  seoTitle: "Handcrafted Crystal Chandeliers",
  metaDescription: "Hand-blown crystal chandeliers for Indian foyers.",
  intro: "Sample intro copy.",
};

const FAKE_PRODUCTS = [
  { id: "aaaa-1111", name: "Test Chandelier A", sku: "SGE-CH-001", images: ["/api/files/a.jpg"] },
  { id: "bbbb-2222", name: "Test Chandelier B", sku: "SGE-CH-002", images: ["/api/files/b.jpg"] },
  { id: "cccc-3333", name: "Test Chandelier C", sku: "SGE-CH-003", images: [] },
];

// --------------------------------------------------------------------------
// Pure-function integrity: tiles ↔ ItemList count parity
// --------------------------------------------------------------------------

describe("prerender pure functions", () => {
  test("emits one crawlable <a href='/product/<id>'> per product", () => {
    const html = productTilesHtml(FAKE_PRODUCTS, "http://example.com");
    const anchors = html.match(/<a href="\/product\/[^"]+"/g) || [];
    expect(anchors).toHaveLength(FAKE_PRODUCTS.length);
    for (const p of FAKE_PRODUCTS) {
      expect(html).toContain(`href="/product/${p.id}"`);
    }
    // The prerender-product-grid wrapper is present exactly once.
    expect(html.match(/<ul class="prerender-product-grid">/g)).toHaveLength(1);
  });

  test("emits nothing when products is empty", () => {
    expect(productTilesHtml([], "http://example.com")).toBe("");
  });

  test("collectionSchema numberOfItems matches products length", () => {
    for (const n of [0, 1, 3, 12]) {
      const products = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Prod ${i}` }));
      const s = collectionSchema(FAKE_CAT, products);
      expect(s.mainEntity["@type"]).toBe("ItemList");
      expect(s.mainEntity.numberOfItems).toBe(n);
      expect(s.mainEntity.itemListElement).toHaveLength(n);
    }
  });

  test("body HTML tile count and ItemList count agree", () => {
    const html = buildBodyHtml(FAKE_CAT, FAKE_PRODUCTS, [FAKE_CAT], "http://example.com");
    const anchors = (html.match(/<a href="\/product\/[^"]+"/g) || []).length;
    const schema = collectionSchema(FAKE_CAT, FAKE_PRODUCTS);
    expect(anchors).toBe(schema.mainEntity.numberOfItems);
    expect(anchors).toBe(FAKE_PRODUCTS.length);
  });
});

// --------------------------------------------------------------------------
// Config resolution: no silent defaults
// --------------------------------------------------------------------------

describe("resolveApiBase", () => {
  test("prefers PRERENDER_API_URL over REACT_APP_BACKEND_URL", () => {
    expect(
      resolveApiBase({
        PRERENDER_API_URL: "https://ci.example.com",
        REACT_APP_BACKEND_URL: "https://prod.example.com",
      }),
    ).toBe("https://ci.example.com");
  });

  test("falls back to REACT_APP_BACKEND_URL", () => {
    expect(resolveApiBase({ REACT_APP_BACKEND_URL: "https://prod.example.com/" })).toBe(
      "https://prod.example.com",
    );
  });

  test("throws when neither variable is set — no silent localhost default", () => {
    expect(() => resolveApiBase({})).toThrow(/No API URL configured/);
  });
});

// --------------------------------------------------------------------------
// runPrerender: failure modes → build fails loudly
// --------------------------------------------------------------------------

describe("runPrerender failure modes", () => {
  test("rejects when the API is unreachable (preflight)", async () => {
    const buildDir = makeScratchBuildDir();
    await expect(
      runPrerender({
        apiBase: "http://127.0.0.1:1",           // guaranteed refused
        buildDir,
        logger: { log: () => {} },
      }),
    ).rejects.toThrow(/preflight failed/i);
  });

  test("rejects when preflight succeeds but a category fetch returns 0 items unexpectedly", async () => {
    // Simulate: preflight says "Chandelier" has products, but the products
    // endpoint returns an empty items array. Real-world cause of the
    // production regression.
    const responder = (url) => {
      if (url.endsWith("/api/products/categories")) return ["Chandelier"];
      if (url.includes("/api/products?category=")) return { items: [], total: 0 };
      throw new Error("unexpected url: " + url);
    };
    await expect(runWithMockFetch(responder)).rejects.toThrow(
      /preflight reported this category has products, but the product fetch returned 0/i,
    );
  });

  test("rejects when preflight succeeds but a category fetch throws", async () => {
    const responder = (url) => {
      if (url.endsWith("/api/products/categories")) return ["Chandelier"];
      if (url.includes("/api/products?category=")) throw new Error("simulated network error");
      throw new Error("unexpected url: " + url);
    };
    await expect(runWithMockFetch(responder)).rejects.toThrow(/product fetch failed/i);
  });
});

/**
 * Runs the prerender under a monkey-patched http/https fetcher.
 *
 * `require.cache` is cleared so the script's `fetchJson` closure is rebuilt
 * against the stub. We do this only inside the test to avoid leaking mocks
 * into other suites.
 */
async function runWithMockFetch(responder) {
  jest.resetModules();
  jest.doMock("http", () => makeHttpStub(responder));
  jest.doMock("https", () => makeHttpStub(responder));
  // Re-require after mocking so fetchJson picks up the stubs.
  // eslint-disable-next-line global-require
  const fresh = require("../../scripts/prerender-categories");
  return fresh.runPrerender({
    apiBase: "http://any.example.com",
    buildDir: makeScratchBuildDir(),
    logger: { log: () => {} },
  });
}

function makeHttpStub(responder) {
  const { EventEmitter } = require("events");
  return {
    get(url, _opts, cb) {
      // Node http.get supports both `get(url, cb)` and `get(url, opts, cb)`.
      if (typeof _opts === "function") { cb = _opts; }
      const req = new EventEmitter();
      req.destroy = (err) => req.emit("error", err || new Error("destroyed"));
      // Kick off asynchronously so callers can attach error handlers.
      process.nextTick(() => {
        let value;
        try {
          value = responder(url);
        } catch (e) {
          req.emit("error", e);
          return;
        }
        const res = new EventEmitter();
        res.statusCode = 200;
        res.resume = () => {};
        cb(res);
        process.nextTick(() => {
          res.emit("data", Buffer.from(JSON.stringify(value)));
          res.emit("end");
        });
      });
      return req;
    },
  };
}
