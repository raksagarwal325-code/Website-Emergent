const fs = require("fs");
const os = require("os");
const path = require("path");
const { run } = require("../../scripts/prerender-legal-pages");
const { LEGAL_ORDER, LEGAL_PAGES, LEGAL_META_DESCRIPTIONS, LEGAL_DEFAULT_UPDATED_AT } = require("./legalContent");
const { parseLegalBody } = require("./legalPolicyBody");
const { normalizePublicLegalPage } = require("./publicClaimNormalization");

const TEMPLATE = '<html><head><title>Generic</title><meta name="description" content="Generic" /><meta property="og:title" content="Generic" /></head><body><div id="root"></div></body></html>';
const content = { LEGAL_ORDER, LEGAL_PAGES, LEGAL_META_DESCRIPTIONS, LEGAL_DEFAULT_UPDATED_AT };

async function build(settings) {
  const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "legal-prerender-"));
  fs.writeFileSync(path.join(buildDir, "index.html"), TEMPLATE);
  await run({
    buildDir,
    apiBase: "https://samratglass.com",
    fetcher: async () => settings,
    content,
    parser: { parseLegalBody },
    normalizer: { normalizePublicLegalPage },
    logger: { log: () => {} },
  });
  return buildDir;
}

test("serves every current legal policy with its actual default wording and unique metadata", async () => {
  const buildDir = await build({ legal_content: {} });
  try {
    for (const slug of LEGAL_ORDER) {
      const html = fs.readFileSync(path.join(buildDir, "legal", slug, "index.html"), "utf8");
      expect(html).toContain(`<h1>${LEGAL_PAGES[slug].title.replace(/&/g, "&amp;")}</h1>`);
      expect(html).toContain(`<link rel="canonical" href="https://samratglass.com/legal/${slug}" />`);
      expect(html).toContain('<nav aria-label="Other policies">');
      expect((html.match(/rel="canonical"/g) || [])).toHaveLength(1);
      expect((html.match(/property="og:title"/g) || [])).toHaveLength(1);
      expect(html).not.toContain('<meta name="description" content="Generic"');
    }
    const shipping = fs.readFileSync(path.join(buildDir, "legal", "shipping", "index.html"), "utf8");
    expect(shipping).toContain("dispatch in 7–10 business days");
    expect(shipping).not.toContain("Standard delivery usually takes 7–10 business days");
  } finally {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
});

test("uses the current admin-authored legal policy while escaping its text", async () => {
  const buildDir = await build({
    legal_content: {
      shipping: { body: "Custom shipping intro\n## Delivery Timeline\nCurrent policy <script>alert(1)</script>\n- Contact us", updated_at: "24 September 2026" },
    },
  });
  try {
    const html = fs.readFileSync(path.join(buildDir, "legal", "shipping", "index.html"), "utf8");
    expect(html).toContain("Custom shipping intro");
    expect(html).toContain("Current policy &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("Last updated: 24 September 2026");
    expect(html).not.toContain("Standard pieces typically dispatch");
  } finally {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
});
