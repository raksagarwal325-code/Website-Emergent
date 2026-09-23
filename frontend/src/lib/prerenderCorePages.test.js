const fs = require("fs");
const os = require("os");
const path = require("path");
const { PAGES, inject, run } = require("../../scripts/prerender-core-pages");

const TEMPLATE = '<html><head><title>Default</title><meta name="description" content="Default" /><meta property="og:title" content="Default" /></head><body><div id="root"></div></body></html>';

test("writes distinct initial content and metadata for all core routes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "core-prerender-"));
  try {
    fs.writeFileSync(path.join(dir, "index.html"), TEMPLATE);
    expect(run(dir)).toBe(PAGES.length);
    for (const page of PAGES) {
      const output = fs.readFileSync(path.join(dir, page.route, "index.html"), "utf8");
      expect(output).toContain(`<h1>${page.h1.replace(/&/g, "&amp;")}</h1>`);
      expect(output).toContain(`<link rel="canonical" href="https://samratglass.com${page.route}" />`);
      expect(output).toContain('<nav aria-label="Related pages"><a href="/');
      expect((output.match(/rel="canonical"/g) || [])).toHaveLength(1);
      expect((output.match(/property="og:title"/g) || [])).toHaveLength(1);
    }
    // The homepage must not become the source template for the other routes.
    expect(inject(TEMPLATE, PAGES[1])).not.toContain(PAGES[0].h1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
