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

  // Diagnostic-only: compare two alternate intro timings against this run's
  // existing three baseline reports, using the same Lighthouse mobile config.
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const { execFileSync } = require("child_process");
  const mobileConfig = JSON.parse(fs.readFileSync("lighthouserc.mobile.json","utf8"));
  const summarize = (dir, label) => {
    const reports = fs.readdirSync(dir).filter(n => /^lhr-.*\.json$/.test(n)).map(n => JSON.parse(fs.readFileSync(path.join(dir,n),"utf8")));
    if (reports.length !== 3) throw new Error(label + ": expected exactly 3 Lighthouse reports");
    const runs = reports.map(r => {
      if (r.runtimeError || !r.categories?.performance || !r.requestedUrl) throw new Error(label + ": invalid Lighthouse report");
      const expected = label === "baseline" ? "" : "?intro_diag=" + label;
      if (new URL(r.requestedUrl).search !== expected) throw new Error("Unexpected requested URL " + r.requestedUrl);
      return { score:r.categories.performance.score * 100,
        lcp:r.audits["largest-contentful-paint"].numericValue,
        tbt:r.audits["total-blocking-time"].numericValue,
        cls:r.audits["cumulative-layout-shift"].numericValue };
    });
    const median = Object.fromEntries(Object.keys(runs[0]).map(k => [k,runs.map(r=>r[k]).sort((a,b)=>a-b)[1]]));
    console.log("INTRO_DIAGNOSTIC " + JSON.stringify({label,runs,median}));
  };
  summarize(".lighthouseci/mobile","baseline");
  for (const label of ["short","off"]) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(),"sge-intro-lh-"));
    try {
      const config = structuredClone(mobileConfig);
      config.ci.collect.url = ["http://127.0.0.1:4173/?intro_diag=" + label];
      const file = path.join(temp,"lighthouserc.json");
      fs.writeFileSync(file,JSON.stringify(config));
      execFileSync("npx",["--yes","@lhci/cli@0.15.x","collect","--config="+file],{cwd:temp,stdio:"inherit",timeout:240000});
      summarize(path.join(temp,".lighthouseci"),label);
    } finally { fs.rmSync(temp,{recursive:true,force:true}); }
  }

})().catch((error) => {
  console.error(error);
  process.exit(1);
});
