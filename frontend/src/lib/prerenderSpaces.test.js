const { inject, bodyHtml, schemas, page } = require("../../scripts/prerender-spaces");

describe("double-height space prerender", () => {
  const template = '<!doctype html><html><head><title>orig</title><meta name="description" content="orig"/></head><body><div id="root"></div></body></html>';

  test("emits a crawlable H1, self-canonical and internal links", () => {
    const html = inject(template);
    const canonical = `https://samratglass.com/${page.slug}`;

    expect(html).toContain(`<h1>${page.h1}</h1>`);
    expect(html).toContain(`<link rel="canonical" href="${canonical}" />`);
    expect(html).toContain('href="/double-height-chandeliers-india"');
    expect(html).toContain('href="/category/chandeliers"');
    expect(html).toContain('href="/contact"');
  });

  test("keeps the space page distinct from the commercial landing page", () => {
    const html = bodyHtml();
    expect(html).toMatch(/product-first/i);
    expect(html).toMatch(/project planning/i);
    expect(html).toMatch(/intentionally separate/i);
  });

  test("emits WebPage and BreadcrumbList schemas", () => {
    const types = schemas().map(({ data }) => data["@type"]);
    expect(types).toEqual(["WebPage", "BreadcrumbList"]);
  });
});
