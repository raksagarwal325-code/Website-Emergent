const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  DEFAULT_SHARE_IMAGE,
  fetchPublishedProducts,
  injectProduct,
  runPrerenderProducts,
} = require("../../scripts/prerender-products");
const { productPath } = require("../../scripts/prerender-categories");

const PRODUCT = {
  id: "product-1",
  name: "Rajdarbar Diamond-Lattice Five-Light Table Chandelier",
  sku: "SGE-TA-009",
  category: "Table Chandelier",
  short_description: "A handcrafted clear-glass table chandelier from Firozabad.",
  images: ["/api/files/lumiere-catalog/products/rajdarbar.webp"],
  status: "published",
  price: 36000,
  price_display: "starting_from",
};

const TEMPLATE = `<!doctype html><html><head><title>Default</title><meta name="description" content="Default"/><meta property="og:image" content="/logo.jpeg"/><meta name="twitter:image" content="/logo.jpeg"/></head><body><div id="root"></div></body></html>`;

describe("product social prerender", () => {
  test("puts the already public price in the initial Product offer", () => {
    const html = injectProduct(TEMPLATE, PRODUCT, "https://samratglass.com");
    const script = html.match(/<script type="application\\/ld\\+json" data-schema="prerender-product">(.*?)<\\/script>/);
    expect(script).not.toBeNull();
    const data = JSON.parse(script[1]);
    expect(data.offers).toEqual({
      "@type": "Offer",
      url: `https://samratglass.com${productPath(PRODUCT)}`,
      price: "36000",
      priceCurrency: "INR",
    });
  });

  test("does not expose internal Price on Request amounts or emit an incomplete Product snippet", () => {
    const html = injectProduct(TEMPLATE, { ...PRODUCT, price_display: "on_request" }, "https://samratglass.com");
    expect(html).not.toContain('data-schema="prerender-product"');
    expect(html).not.toContain('"price":"36000"');
  });

  test("does not emit an offer for a missing or zero price", () => {
    for (const price of [0, null, undefined]) {
      const html = injectProduct(TEMPLATE, { ...PRODUCT, price }, "https://samratglass.com");
      expect(html).not.toContain('data-schema="prerender-product"');
    }
  });
  test("puts an absolute product image in the initial Open Graph and Twitter metadata", () => {
    const html = injectProduct(TEMPLATE, PRODUCT, "https://samratglass.com");
    const expected = "https://samratglass.com/api/social-preview/lumiere-catalog/products/rajdarbar.webp.jpg";
    expect(html).toContain(`<meta property="og:image" content="${expected}" />`);
    expect(html).toContain(`<meta property="og:image:secure_url" content="${expected}" />`);
    expect(html).toContain('<meta property="og:image:type" content="image/jpeg" />');
    expect(html).toContain(`<meta name="twitter:image" content="${expected}" />`);
    expect(html).toContain(`<meta property="og:image:alt" content="${PRODUCT.name}" />`);
    expect(html).toContain(`<link rel="canonical" href="https://samratglass.com${productPath(PRODUCT)}" />`);
    expect((html.match(/property="og:image"/g) || [])).toHaveLength(1);
  });

  test("uses the absolute logo when a product has no image", () => {
    const html = injectProduct(TEMPLATE, { ...PRODUCT, images: [] }, "https://api.example.com");
    expect(html).toContain(`<meta property="og:image" content="${DEFAULT_SHARE_IMAGE}" />`);
  });

  test("fetches every public catalogue page", async () => {
    const calls = [];
    const fetcher = async (url) => {
      calls.push(url);
      const page = Number(new URL(url).searchParams.get("page"));
      return {
        items: page === 1 ? [PRODUCT] : [{ ...PRODUCT, id: "product-2", sku: "SGE-TA-010" }],
        total: 2,
        total_pages: 2,
      };
    };
    const products = await fetchPublishedProducts("https://api.example.com", fetcher);
    expect(products).toHaveLength(2);
    expect(calls).toHaveLength(2);
  });

  test("writes the product-specific index file at its readable URL", async () => {
    const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-prerender-"));
    fs.writeFileSync(path.join(buildDir, "index.html"), TEMPLATE, "utf8");
    const result = await runPrerenderProducts({
      apiBase: "https://samratglass.com",
      buildDir,
      fetcher: async () => ({ items: [PRODUCT], total: 1, total_pages: 1 }),
      logger: { log: () => {} },
    });
    const output = path.join(buildDir, productPath(PRODUCT), "index.html");
    expect(result.count).toBe(1);
    expect(fs.readFileSync(output, "utf8")).toContain(PRODUCT.name);
  });

  test("fails rather than publishing an incomplete catalogue", async () => {
    await expect(fetchPublishedProducts("https://api.example.com", async () => ({
      items: [PRODUCT],
      total: 2,
      total_pages: 1,
    }))).rejects.toThrow(/expected 2 published products but fetched 1/);
  });
});
