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

    // Diagnostic only: exercise the real local production build at phone widths.
    // The quality proxy permits anonymous reads only; block non-read requests
    // and analytics so these checks never submit enquiries or generate leads.
    for (const width of [320, 360, 390, 430]) {
      const phone = await browser.newContext({
        viewport: { width, height: 850 }, isMobile: true,
        hasTouch: true, deviceScaleFactor: 2,
      });
      await phone.route("**/*", async route => {
        const req = route.request();
        if (!["GET", "HEAD", "OPTIONS"].includes(req.method()) ||
            /google-analytics|googletagmanager|analytics\.google|bzrcdn\.openai/i.test(req.url())) {
          return route.abort();
        }
        return route.continue();
      });
      const page = await phone.newPage();
      let productPath = null;
      const base = "http://127.0.0.1:4173";
      const check = async (path, action) => {
        const report = { width, path, errors: [] };
        try {
          const response = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 30000 });
          report.http = response?.status();
          if (!response?.ok()) report.errors.push("HTTP failure");
          await page.locator("h1").first().waitFor({ state: "visible", timeout: 15000 });
          if (path === "/") await page.getByTestId("welcome-intro").waitFor({state:"hidden",timeout:10000});
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(500);
          report.layout = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            document: document.documentElement.scrollWidth,
            body: document.body.scrollWidth,
            title: document.querySelector("h1")?.innerText,
          }));
          if (Math.max(report.layout.document, report.layout.body) > report.layout.viewport + 2)
            report.errors.push("Horizontal overflow");
          if (action) await action(report);
        } catch (error) {
          report.errors.push(String(error.message).slice(0, 500));
        }
        console.log("MOBILE_DIAGNOSTIC " + JSON.stringify(report));
      };
      try {
        await check("/", async report => {
          const menu = page.getByRole("button", {name:"Menu", exact:true});
          await menu.click({timeout:5000});
          report.menuOpened = await page.getByRole("link",{name:"Catalog",exact:true}).first().isVisible();
          await page.keyboard.press("Escape");
          report.whatsappLinks = await page.locator('a[href*="wa.me/"]').count();
        });
        await check("/catalog", async report => {
          const search = page.getByTestId("catalog-search");
          await search.waitFor({state:"visible",timeout:10000});
          await search.fill("chandelier");
          await page.waitForTimeout(1000);
          report.searchValue = await search.inputValue();
          await search.clear();
          await page.waitForTimeout(1000);
          const link = page.locator('a[href^="/product/"]').first();
          await link.waitFor({state:"attached",timeout:10000});
          productPath = await link.getAttribute("href");
          report.productPath = productPath;
          report.fileInputs = await page.locator('input[type="file"]').count();
        });
        await check("/category/chandeliers");
        if (productPath && /^\/product\/[^/?#]+\/?$/.test(productPath)) {
          await check(productPath, async report => {
            report.images = await page.locator("img").count();
            report.whatsappLinks = await page.locator('a[href*="wa.me/"]').count();
          });
        } else {
          console.log("MOBILE_DIAGNOSTIC " + JSON.stringify({width,path:"product",errors:["No catalogue product link found"]}));
        }
        for (const path of ["/gallery","/collections","/favorites","/cart","/contact"]) await check(path);
      } finally {
        await phone.close();
      }
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
