const { inject, bodyHtml, schemas, pages } = require("../../scripts/prerender-authority-pages");

const doubleHeight = pages.find((page) => page.slug === "double-height-chandeliers-india");

describe("double-height authority prerender", () => {
  const template = '<!doctype html><html><head><title>orig</title><meta name="description" content="orig"/></head><body><div id="root"></div></body></html>';

  test("emits FAQ schema alongside WebPage and BreadcrumbList", () => {
    const types = schemas(doubleHeight).map(({ data }) => data["@type"]);
    expect(types).toEqual(["WebPage", "BreadcrumbList", "FAQPage"]);
    expect(schemas(doubleHeight)[2].data.mainEntity).toHaveLength(5);
  });

  test("prerender exposes verified project evidence and selected products", () => {
    const html = bodyHtml(doubleHeight);
    expect(html).toContain("Lucknow — SGE-CH-011");
    expect(html).toContain("Nagpur — SGE-CH-002");
    expect(html).toContain("Mumbai — SGE-CH-069");
    expect(html).toContain('/product/noorjahan-grand-two-tier-24-light-crystal-chandelier-sge-ch-011');
    expect(html).toContain('/product/tarangrekha-crackle-mosaic-glass-two-tier-twelve-light-chandelier-sge-ch-111');
    expect(html).toContain('/product/rajdarbar-crystal-draped-two-tier-antique-gold-chandelier-twelve-light-sge-ch-048');
  });

  test("injects canonical metadata and crawlable commercial proof", () => {
    const html = inject(template, doubleHeight);
    expect(html).toContain('<link rel="canonical" href="https://samratglass.com/double-height-chandeliers-india" />');
    expect(html).toContain('data-schema="double-height-chandeliers-faq"');
    expect(html).toContain('href="/space/double-height-staircase"');
    expect(html).toContain('href="/custom-lighting-bulk-orders"');
    expect(html).toMatch(/Frequently asked questions/i);
  });
});
