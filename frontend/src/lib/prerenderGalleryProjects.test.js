const fs = require("fs");
const os = require("os");
const path = require("path");
const { projectRoutes, inject, run } = require("../../scripts/prerender-gallery-projects");
const { inject: injectCore, run: runCore, PAGES } = require("../../scripts/prerender-core-pages");

const TEMPLATE = '<html><head><title>Default</title><meta name="description" content="Default"/><meta property="og:title" content="Default"/></head><body><div id="root"></div></body></html>';
const projects = [
  { title: "A Client Installation — Lucknow", location: "Lucknow", note: "Verified lighting in a private residence.", images: ["/api/files/gallery/one.jpg"] },
  { title: "A Client Installation — Lucknow", location: "Pune", note: "A second verified project.", images: [] },
];

test("uses the gallery's title slug and collision suffix; only current settings projects are emitted", async () => {
  const routes = projectRoutes(projects);
  expect(routes.map((entry) => entry.route)).toEqual([
    "/gallery/a-client-installation-lucknow", "/gallery/a-client-installation-lucknow-2",
  ]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gallery-prerender-"));
  try {
    fs.writeFileSync(path.join(dir, "index.html"), TEMPLATE);
    expect(await run({ buildDir: dir, apiBase: "https://example.test", fetcher: async () => ({ homepage_content: { gallery: { items: projects } } }), logger: { log: () => {} } })).toEqual(routes.map(({ route }) => route));
    const output = fs.readFileSync(path.join(dir, routes[0].route, "index.html"), "utf8");
    expect(output).toContain('<h1>A Client Installation — Lucknow</h1>');
    expect(output).toContain('<link rel="canonical" href="https://samratglass.com/gallery/a-client-installation-lucknow" />');
    expect(output).toContain('Verified lighting in a private residence.');
    expect(output).toContain('https://samratglass.com/api/files/gallery/one.jpg');
    expect((output.match(/rel="canonical"/g) || [])).toHaveLength(1);
    expect((output.match(/property="og:title"/g) || [])).toHaveLength(1);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "gallery-projects-manifest.json"), "utf8"));
    const landing = injectCore(TEMPLATE, PAGES.find((page) => page.route === "/gallery"), manifest);
    for (const { route, title } of manifest) {
      expect(landing).toContain(`href="${route}"`);
      expect(landing).toContain(title);
    }
    runCore(dir);
    const builtGallery = fs.readFileSync(path.join(dir, "gallery", "index.html"), "utf8");
    expect(builtGallery).toContain(`href="${routes[0].route}"`);
    expect(fs.existsSync(path.join(dir, "gallery-projects-manifest.json"))).toBe(false);
    expect(landing).not.toContain("/gallery/noorvastra-etched-tulip-crystal-chandelier-custom-twelve-light-two-tier-installa");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("does not invent project pages when settings are empty", async () => {
  await expect(run({ apiBase: "https://example.test", fetcher: async () => ({ homepage_content: { gallery: { items: [] } } }) }))
    .rejects.toThrow(/no gallery projects/);
});

test("escapes admin-authored project fields in initial HTML", () => {
  const html = inject(TEMPLATE, { route: "/gallery/test", project: { title: 'Test <script>alert(1)</script>', note: 'A "verified" project', images: [] } });
  expect(html).not.toContain('<script>alert(1)</script>');
  expect(html).toContain('Test &lt;script&gt;alert(1)&lt;/script&gt;');
});
