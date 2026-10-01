const { inject, bodyHtml, schemas, page, pages, injectIndex, indexSchemas } = require("../../scripts/prerender-spaces");

describe("double-height space prerender", () => {
  const template = '<!doctype html><html><head><title>orig</title><meta name="description" content="orig"/></head><body><div id="root"></div></body></html>';

  test("emits a crawlable H1, self-canonical and internal links", () => {
    const html = inject(template);
    const canonical = `https://samratglass.com/${page.slug}`;

    expect(html).toContain("<h1>Lighting for Double-Height &amp; Staircase Spaces</h1>");
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


describe("all Shop by Space prerenders", () => {
  const template = '<!doctype html><html><head><title>orig</title><meta name="description" content="orig"/></head><body><div id="root"></div></body></html>';

  test("covers every public space route", () => {
    expect(pages.map((item) => item.slug)).toEqual([
      "space/living-room",
      "space/dining-room",
      "space/double-height-staircase",
      "space/foyer-entrance",
      "space/bedroom",
      "space/hotel-hospitality",
      "space/restaurant",
      "space/retail-showroom",
      "space/banquet-event-space",
    ]);
    for (const target of pages) {
      const html = inject(template, target);
      expect(html).toContain(`<link rel="canonical" href="https://samratglass.com/${target.slug}" />`);
      expect(html).toContain("<h1>");
      expect(html).toContain('href="/spaces"');
    }
  });

  test("prerenders the Shop by Space index with all nine destinations", () => {
    const html = injectIndex(template);
    expect(html).toContain('<link rel="canonical" href="https://samratglass.com/spaces" />');
    expect(html).toContain("<h1>Shop by Space</h1>");
    for (const target of pages) {
      expect(html).toContain(`href="/${target.slug}"`);
    }
    expect(indexSchemas()[0].data.numberOfItems).toBe(9);
  });
});
