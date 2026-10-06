/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const reportDir = path.resolve(__dirname, "..", ".lighthouseci");

function findReports(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findReports(full);
    return /^lhr-.*\.json$/i.test(entry.name) ? [full] : [];
  });
}

const files = findReports(reportDir);

if (!files.length) {
  console.error("No Lighthouse JSON reports found in .lighthouseci");
  process.exit(1);
}

const metricIds = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "speed-index",
  "total-blocking-time",
  "cumulative-layout-shift",
  "interactive",
];

for (const file of files.sort()) {
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  const url = report.finalDisplayedUrl || report.finalUrl || report.requestedUrl || file;
  const relative = path.relative(reportDir, file);
  const profile = relative.split(path.sep)[0] || "unknown";
  console.log(`\n=== Lighthouse performance diagnosis [${profile}] ===`);
  console.log(url);

  const categories = report.categories || {};
  for (const key of ["performance", "accessibility", "best-practices", "seo"]) {
    const score = categories[key]?.score;
    if (typeof score === "number") console.log(`${key}: ${Math.round(score * 100)}`);
  }

  console.log("Metrics:");
  for (const id of metricIds) {
    const audit = report.audits?.[id];
    if (!audit) continue;
    console.log(`- ${audit.title}: ${audit.displayValue || audit.numericValue || "n/a"}`);
  }

  const opportunities = Object.entries(report.audits || {})
    .map(([id, audit]) => {
      const savingsMs = Number(audit?.details?.overallSavingsMs || 0);
      const savingsBytes = Number(audit?.details?.overallSavingsBytes || 0);
      return {
        id,
        title: audit?.title || id,
        score: audit?.score,
        displayValue: audit?.displayValue || "",
        savingsMs,
        savingsBytes,
      };
    })
    .filter((item) =>
      (item.savingsMs > 0 || item.savingsBytes > 0) &&
      item.score !== null &&
      item.score < 1
    )
    .sort((a, b) => (b.savingsMs - a.savingsMs) || (b.savingsBytes - a.savingsBytes))
    .slice(0, 8);

  console.log("Top measurable opportunities:");
  if (!opportunities.length) {
    console.log("- No Lighthouse opportunity audit reported measurable savings.");
  } else {
    for (const item of opportunities) {
      const bits = [];
      if (item.displayValue) bits.push(item.displayValue);
      if (item.savingsMs) bits.push(`${Math.round(item.savingsMs)} ms potential savings`);
      if (item.savingsBytes) bits.push(`${Math.round(item.savingsBytes / 1024)} KiB potential savings`);
      console.log(`- ${item.title}: ${bits.join(" · ")}`);
    }
  }

  const lcp = report.audits?.["largest-contentful-paint-element"];
  if (lcp?.details?.items?.length) {
    const item = lcp.details.items[0];
    const node = item.node || item.items?.[0]?.node;
    if (node) {
      console.log("LCP element:");
      console.log(`- selector: ${node.selector || "n/a"}`);
      console.log(`- snippet: ${String(node.snippet || "").replace(/\s+/g, " ").slice(0, 240)}`);
    }
  }

  const resourceSummary = report.audits?.["resource-summary"]?.details?.items || [];
  if (resourceSummary.length) {
    console.log("Transfer by resource type:");
    for (const item of resourceSummary) {
      console.log(`- ${item.resourceType}: ${Math.round(Number(item.transferSize || 0) / 1024)} KiB`);
    }
  }
}
