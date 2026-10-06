/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const profiles = {
  mobile: {
    target: { performance: 0.70, lcpMs: 4000, tbtMs: 300, cls: 0.10 },
    hard: { performance: 0.50, lcpMs: 7500, tbtMs: 1200, cls: 0.15 },
  },
  desktop: {
    target: { performance: 0.80, lcpMs: 2500, tbtMs: 300, cls: 0.10 },
    hard: { performance: 0.60, lcpMs: 4500, tbtMs: 800, cls: 0.15 },
  },
};

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function findReportFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findReportFiles(full);
    return /^lhr-.*\.json$/i.test(entry.name) ? [full] : [];
  });
}

function reportProfile(report) {
  const settings = report.configSettings || {};
  if (settings.formFactor === "desktop") return "desktop";
  if (settings.formFactor === "mobile") return "mobile";
  return settings.screenEmulation?.mobile === false ? "desktop" : "mobile";
}

const allReports = findReportFiles(path.join(root, ".lighthouseci"))
  .map((file) => JSON.parse(fs.readFileSync(file, "utf8")));

function metrics(report) {
  return {
    performance: Number(report.categories?.performance?.score),
    lcpMs: Number(report.audits?.["largest-contentful-paint"]?.numericValue),
    tbtMs: Number(report.audits?.["total-blocking-time"]?.numericValue),
    cls: Number(report.audits?.["cumulative-layout-shift"]?.numericValue),
  };
}

function fmt(key, value) {
  if (key === "performance") return `${Math.round(value * 100)}`;
  if (key === "cls") return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

let failed = false;
const summary = {};

for (const [profile, config] of Object.entries(profiles)) {
  const reports = allReports.filter((report) => reportProfile(report) === profile);
  if (reports.length < 3) {
    console.error(`::error::${profile}: expected 3 Lighthouse reports, found ${reports.length}`);
    failed = true;
    continue;
  }

  const runs = reports.map(metrics);
  const med = {
    performance: median(runs.map((x) => x.performance)),
    lcpMs: median(runs.map((x) => x.lcpMs)),
    tbtMs: median(runs.map((x) => x.tbtMs)),
    cls: median(runs.map((x) => x.cls)),
  };
  summary[profile] = { runs, median: med };

  console.log(`\n=== ${profile.toUpperCase()} Lighthouse median (3 runs) ===`);
  console.log(`Performance: ${fmt("performance", med.performance)}`);
  console.log(`LCP: ${fmt("lcpMs", med.lcpMs)}`);
  console.log(`TBT: ${fmt("tbtMs", med.tbtMs)}`);
  console.log(`CLS: ${fmt("cls", med.cls)}`);

  for (const key of Object.keys(config.hard)) {
    const value = med[key];
    const hard = config.hard[key];
    const target = config.target[key];
    const lowerIsBetter = key !== "performance";
    const hardFailed = lowerIsBetter ? value > hard : value < hard;
    const targetMissed = lowerIsBetter ? value > target : value < target;

    if (hardFailed) {
      console.error(`::error::${profile} ${key} median ${fmt(key, value)} breached hard guardrail ${fmt(key, hard)}`);
      failed = true;
    } else if (targetMissed) {
      console.warn(`::warning::${profile} ${key} median ${fmt(key, value)} missed target ${fmt(key, target)}`);
    }
  }
}

const outPath = path.join(root, ".lighthouseci", "median-summary.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(`\nWrote ${outPath}`);

if (failed) process.exit(1);
