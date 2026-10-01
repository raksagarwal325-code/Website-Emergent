/* eslint-disable no-console */
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;

const urls = [
  "http://127.0.0.1:4173/",
  "http://127.0.0.1:4173/category/chandeliers/",
  "http://127.0.0.1:4173/gallery/",
];

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  let failures = 0;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });

  try {
    for (const url of urls) {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
      await page.waitForTimeout(750);

      const results = await new AxeBuilder({ page })
        .withTags(tags)
        .analyze();

      if (results.violations.length) {
        failures += results.violations.length;
        console.error(`\nAccessibility violations for ${url}: ${results.violations.length}`);
        for (const violation of results.violations) {
          console.error(`- [${violation.impact || "unknown"}] ${violation.id}: ${violation.help}`);
          for (const node of violation.nodes.slice(0, 5)) {
            console.error(`  target: ${node.target.join(" ")}`);
            if (node.failureSummary) console.error(`  ${node.failureSummary.replace(/\n/g, " ")}`);
          }
        }
      } else {
        console.log(`Accessibility OK: ${url}`);
      }

      await page.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }

  if (failures) {
    console.error(`\naxe found ${failures} WCAG violation group(s) across representative public pages.`);
    process.exit(1);
  }

  console.log("\naxe accessibility gate passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
