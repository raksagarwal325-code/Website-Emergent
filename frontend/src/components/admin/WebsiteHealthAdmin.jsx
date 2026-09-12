import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Gauge,
  Image as ImageIcon,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { API, api } from "../../lib/api";

const VALID_STATUS = new Set(["published", "draft"]);
const VALID_PRICE_DISPLAY = new Set(["starting_from", "fixed", "on_request"]);

const text = (value) => String(value || "").trim();
const imagesOf = (product) => (Array.isArray(product?.images) ? product.images.map(text).filter(Boolean) : []);
const specsOf = (product) => (
  product?.specs && typeof product.specs === "object" && !Array.isArray(product.specs)
    ? Object.entries(product.specs).filter(([, value]) => text(value))
    : []
);
const tagsOf = (product) => (Array.isArray(product?.tags) ? product.tags.map(text).filter(Boolean) : []);

export function productCompleteness(product) {
  const images = imagesOf(product);
  const checks = [
    [10, Boolean(text(product?.name)), "Product name"],
    [10, Boolean(text(product?.sku)), "SKU"],
    [10, Boolean(text(product?.category)), "Category"],
    [15, images.length >= 1, "Primary image"],
    [5, images.length >= 2, "Second image / alternate view"],
    [10, text(product?.short_description).length >= 60, "Useful short description"],
    [15, text(product?.description).length >= 160, "Detailed description"],
    [10, specsOf(product).length >= 1, "Confirmed specifications"],
    [5, tagsOf(product).length >= 1, "Search / catalogue tags"],
    [5, VALID_PRICE_DISPLAY.has(product?.price_display || "starting_from"), "Price display mode"],
    [5, VALID_STATUS.has(product?.status || "published"), "Publication status"],
  ];

  return {
    score: checks.reduce((total, [weight, passed]) => total + (passed ? weight : 0), 0),
    missing: checks.filter(([, passed]) => !passed).map(([, , label]) => label),
  };
}

const duplicateMap = (products, selector) => {
  const map = new Map();
  products.forEach((product) => {
    const key = text(selector(product)).toLowerCase();
    if (!key) return;
    const existing = map.get(key) || [];
    existing.push(product);
    map.set(key, existing);
  });
  return new Map(Array.from(map.entries()).filter(([, items]) => items.length > 1));
};

const validImageUrl = (url) => /^\/api\/files\//i.test(url) || /^https?:\/\//i.test(url);

export function buildWebsiteHealth(products = []) {
  const safeProducts = Array.isArray(products) ? products : [];
  const duplicateSkus = duplicateMap(safeProducts, (product) => product.sku);
  const duplicateNames = duplicateMap(safeProducts, (product) => product.name);
  const duplicatePrimary = duplicateMap(safeProducts, (product) => imagesOf(product)[0]);

  const attention = [];
  const imageIssues = [];
  const seoIssues = [];
  const completeness = safeProducts.map((product) => ({ product, ...productCompleteness(product) }));

  const push = (bucket, product, severity, issue, detail = "") => {
    bucket.push({
      id: `${product?.id || product?.sku || product?.name || "product"}-${issue}-${bucket.length}`,
      product,
      severity,
      issue,
      detail,
    });
  };

  safeProducts.forEach((product) => {
    const name = text(product.name);
    const sku = text(product.sku);
    const category = text(product.category);
    const images = imagesOf(product);
    const primary = images[0] || "";
    const shortDescription = text(product.short_description);
    const description = text(product.description);

    if (!name) push(attention, product, "critical", "Missing product name");
    if (!sku) push(attention, product, "critical", "Missing SKU");
    if (!category) push(attention, product, "critical", "Missing category");
    if (!primary) {
      push(attention, product, "critical", "Missing primary image");
      push(imageIssues, product, "critical", "Missing primary image");
    } else if (!validImageUrl(primary)) {
      push(attention, product, "critical", "Unsupported primary image URL", primary);
      push(imageIssues, product, "critical", "Unsupported primary image URL", primary);
    }

    if (images.length === 1) {
      push(imageIssues, product, "review", "Only one product image", "Consider a second angle or lit/unlit pair where available.");
    }
    if (new Set(images).size !== images.length) {
      push(imageIssues, product, "review", "Duplicate image URL inside product");
    }

    if (shortDescription.length < 60) {
      push(attention, product, "review", "Short description needs review", `${shortDescription.length} characters`);
      push(seoIssues, product, "review", "Short description is thin", `${shortDescription.length} characters`);
    }
    if (description.length < 160) {
      push(attention, product, "review", "Description needs review", `${description.length} characters`);
      push(seoIssues, product, "review", "Description is thin", `${description.length} characters`);
    }
    if (name && (name.length < 24 || name.length > 100)) {
      push(seoIssues, product, "review", "Product title length needs review", `${name.length} characters`);
    }
    if (specsOf(product).length === 0) {
      push(attention, product, "review", "No confirmed specifications");
    }
    if (tagsOf(product).length === 0) {
      push(seoIssues, product, "review", "No catalogue/search tags");
    }
    if (!text(product.seo_slug)) {
      push(seoIssues, product, "info", "No stored SEO slug", "Readable name + SKU fallback is still available.");
    }
  });

  duplicateSkus.forEach((items, key) => items.forEach((product) => {
    push(attention, product, "critical", "Duplicate SKU", key);
    push(seoIssues, product, "critical", "Duplicate SKU", key);
  }));
  duplicateNames.forEach((items, key) => items.forEach((product) => {
    push(seoIssues, product, "review", "Duplicate product name", key);
  }));
  duplicatePrimary.forEach((items, key) => items.forEach((product) => {
    push(imageIssues, product, "review", "Primary image reused by multiple products", key);
  }));

  const categoryMap = new Map();
  safeProducts.forEach((product) => {
    const category = text(product.category) || "Uncategorised";
    const current = categoryMap.get(category) || { products: 0, drafts: 0, noImage: 0, completenessTotal: 0 };
    current.products += 1;
    if ((product.status || "published") === "draft") current.drafts += 1;
    if (imagesOf(product).length === 0) current.noImage += 1;
    current.completenessTotal += productCompleteness(product).score;
    categoryMap.set(category, current);
  });

  const categories = Array.from(categoryMap.entries())
    .map(([category, value]) => ({
      category,
      ...value,
      averageCompleteness: value.products ? Math.round(value.completenessTotal / value.products) : 0,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const averageCompleteness = completeness.length
    ? Math.round(completeness.reduce((sum, item) => sum + item.score, 0) / completeness.length)
    : 0;

  return {
    attention,
    imageIssues,
    seoIssues,
    completeness: completeness.sort((a, b) => a.score - b.score),
    categories,
    averageCompleteness,
    criticalCount: attention.filter((item) => item.severity === "critical").length,
  };
}

const severityClasses = {
  critical: "border-red-400/40 bg-red-500/5 text-red-200",
  review: "border-amber-300/30 bg-amber-400/5 text-amber-100",
  info: "border-white/10 bg-white/[0.02] text-white/60",
};

const shortSha = (sha) => (sha ? String(sha).slice(0, 12) : "Unavailable");

function Metric({ label, value, hint }) {
  return (
    <div className="border border-white/10 p-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">{label}</div>
      <div className="mt-2 font-serif text-3xl">{value}</div>
      {hint && <div className="mt-2 text-xs text-white/45">{hint}</div>}
    </div>
  );
}

function IssueTable({ items, emptyMessage }) {
  if (!items.length) {
    return <div className="border border-emerald-300/20 bg-emerald-400/5 p-6 text-sm text-emerald-100">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 250).map((item) => (
        <div key={item.id} className={`grid gap-3 border p-4 md:grid-cols-[120px_1fr_1.2fr] ${severityClasses[item.severity] || severityClasses.info}`}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] opacity-60">{item.severity}</div>
            <div className="mt-1 text-xs font-medium">{item.product?.sku || "No SKU"}</div>
          </div>
          <div>
            <div className="text-sm text-white">{item.product?.name || "Unnamed product"}</div>
            <div className="mt-1 text-[11px] opacity-60">{item.product?.category || "No category"}</div>
          </div>
          <div>
            <div className="text-sm">{item.issue}</div>
            {item.detail && <div className="mt-1 break-all text-[11px] opacity-60">{item.detail}</div>}
          </div>
        </div>
      ))}
      {items.length > 250 && <div className="text-xs text-white/45">Showing first 250 of {items.length} findings.</div>}
    </div>
  );
}

export default function WebsiteHealthAdmin() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [release, setRelease] = useState(null);
  const [releaseError, setReleaseError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("attention");
  const [query, setQuery] = useState("");
  const [refreshedAt, setRefreshedAt] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setReleaseError("");
    const [catalogue, siteStats, releaseResult] = await Promise.all([
      api.listAllProducts({ include_drafts: 1, limit: 5000, raw: true }).catch(() => []),
      api.stats().catch(() => null),
      fetch(`${API}/admin/health/release`, {
        credentials: "include",
        headers: { "X-Requested-With": "fetch" },
      }).then(async (response) => {
        if (!response.ok) throw new Error(`Release check failed (${response.status})`);
        return response.json();
      }).catch((error) => {
        setReleaseError(error?.message || "Release check unavailable");
        return null;
      }),
    ]);
    setProducts(catalogue);
    setStats(siteStats);
    setRelease(releaseResult);
    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const health = useMemo(() => buildWebsiteHealth(products), [products]);
  const normalizedQuery = query.trim().toLowerCase();
  const filterIssues = (items) => {
    if (!normalizedQuery) return items;
    return items.filter((item) => [
      item.product?.sku,
      item.product?.name,
      item.product?.category,
      item.issue,
      item.detail,
    ].some((value) => text(value).toLowerCase().includes(normalizedQuery)));
  };

  const tabs = [
    ["attention", "Needs Attention", AlertTriangle],
    ["completeness", "Product Completeness", Gauge],
    ["images", "Image Audit", ImageIcon],
    ["seo", "SEO Health", FileSearch],
    ["release", "Release / Sync", ShieldCheck],
  ];

  return (
    <div data-testid="admin-website-health" className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="eyebrow mb-3">Backoffice · Website Health</div>
          <h1 className="font-serif text-4xl">Website Health</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
            Read-only operational checks across catalogue completeness, product imagery, SEO readiness and release alignment. Nothing on this page changes product data.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/admin" className="border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70 hover:text-white">Back to Admin</a>
          <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 border border-[#D4AF37]/50 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#D4AF37] disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Products audited" value={products.length} hint={stats?.products != null ? `Public stats: ${stats.products}` : "Current Admin catalogue"} />
        <Metric label="Average completeness" value={`${health.averageCompleteness}%`} hint="Across all stored products" />
        <Metric label="Critical findings" value={health.criticalCount} hint="Missing/duplicate identity or primary image" />
        <Metric label="Image findings" value={health.imageIssues.length} hint="Includes review-level alternate-image gaps" />
        <Metric label="SEO findings" value={health.seoIssues.length} hint="Readiness checks, not Search Console data" />
      </div>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10">
        {tabs.map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-[11px] uppercase tracking-[0.18em] ${tab === key ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-white/50 hover:text-white"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab !== "release" && (
        <div className="mt-6 relative max-w-xl">
          <Search size={15} className="absolute left-3 top-3 text-white/35" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU, product, category or issue" className="w-full border border-white/15 bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#D4AF37]/70" />
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="border border-white/10 p-8 text-sm text-white/50">Running health checks…</div>
        ) : tab === "attention" ? (
          <div className="space-y-8">
            <IssueTable items={filterIssues(health.attention)} emptyMessage="No catalogue findings require attention." />
            <div>
              <h2 className="font-serif text-2xl">Category snapshot</h2>
              <div className="mt-4 overflow-x-auto border border-white/10">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-white/5 text-[10px] uppercase tracking-[0.18em] text-white/50"><tr><th className="p-3">Category</th><th className="p-3">Products</th><th className="p-3">Drafts</th><th className="p-3">No image</th><th className="p-3">Avg completeness</th></tr></thead>
                  <tbody>{health.categories.map((row) => <tr key={row.category} className="border-t border-white/10"><td className="p-3">{row.category}</td><td className="p-3">{row.products}</td><td className="p-3">{row.drafts}</td><td className="p-3">{row.noImage}</td><td className="p-3">{row.averageCompleteness}%</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </div>
        ) : tab === "completeness" ? (
          <div className="space-y-2">
            {health.completeness
              .filter(({ product }) => !normalizedQuery || [product?.sku, product?.name, product?.category].some((value) => text(value).toLowerCase().includes(normalizedQuery)))
              .slice(0, 300)
              .map(({ product, score, missing }) => (
                <div key={product.id || product.sku} className="grid gap-3 border border-white/10 p-4 md:grid-cols-[110px_1fr_100px_1.4fr] md:items-center">
                  <div className="text-xs text-white/60">{product.sku || "No SKU"}</div>
                  <div><div className="text-sm">{product.name || "Unnamed product"}</div><div className="text-[11px] text-white/40">{product.category || "No category"}</div></div>
                  <div className={`font-serif text-2xl ${score >= 90 ? "text-emerald-300" : score >= 75 ? "text-[#D4AF37]" : "text-amber-200"}`}>{score}%</div>
                  <div className="text-xs text-white/45">{missing.length ? `Missing/review: ${missing.join(", ")}` : "Complete against current Admin checks"}</div>
                </div>
              ))}
          </div>
        ) : tab === "images" ? (
          <IssueTable items={filterIssues(health.imageIssues)} emptyMessage="No structural product-image issues found." />
        ) : tab === "seo" ? (
          <div className="space-y-4">
            <div className="border border-white/10 p-4 text-xs leading-5 text-white/50">
              This is a catalogue-content readiness audit. Product pages currently generate SEO metadata/canonical URLs from stored product data; this tab does not claim Google indexing status. Search Console should remain the source for crawl/indexing performance.
            </div>
            <IssueTable items={filterIssues(health.seoIssues)} emptyMessage="No SEO-readiness findings found." />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Metric label="API health" value={releaseError ? "Check failed" : "Connected"} hint={releaseError || API} />
              <Metric label="Runtime source" value={release?.runtime || "Unavailable"} hint="Git metadata is only shown when the runtime exposes it." />
              <Metric label="Git branch" value={release?.git_branch || "Unavailable"} hint={release?.git_dirty === true ? "Workspace has local changes" : release?.git_dirty === false ? "Workspace clean" : "Dirty-state unavailable"} />
              <Metric label="Git HEAD" value={shortSha(release?.git_head)} hint={release?.git_head || "No Git repository visible in this runtime"} />
              <Metric label="Deployment SHA" value={shortSha(release?.deployment_sha)} hint={release?.deployment_sha || "Hosting platform did not expose a deployment SHA"} />
              <Metric label="SHA alignment" value={release?.aligned === true ? "Match" : release?.aligned === false ? "Mismatch" : "Not comparable"} hint="Only compared when both runtime and deployment SHAs are available." />
            </div>
            <div className={`border p-5 ${release?.aligned === false || release?.git_dirty === true ? "border-amber-300/30 bg-amber-400/5" : "border-white/10"}`}>
              <div className="flex items-start gap-3">
                {release?.aligned === true && release?.git_dirty === false ? <CheckCircle2 className="mt-0.5 text-emerald-300" size={18} /> : <AlertTriangle className="mt-0.5 text-[#D4AF37]" size={18} />}
                <div>
                  <div className="text-sm">Release interpretation</div>
                  <div className="mt-1 text-xs leading-5 text-white/50">
                    {release?.aligned === false
                      ? "The deployment SHA and visible Git HEAD differ. Verify the GitHub → Emergent → production handoff before publishing another release."
                      : release?.git_dirty === true
                        ? "The runtime Git workspace contains local changes. This is normal during SHA-pinned Emergent sync, but verify the exact approved files before publishing."
                        : release?.aligned === true
                          ? "The available runtime/deployment SHA signals agree."
                          : "Exact SHA alignment cannot be inferred from this runtime. Continue using the existing SHA-pinned sync SOP rather than assuming alignment."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-[11px] text-white/35">Last refreshed: {refreshedAt ? refreshedAt.toLocaleString() : "—"}</div>
    </div>
  );
}
