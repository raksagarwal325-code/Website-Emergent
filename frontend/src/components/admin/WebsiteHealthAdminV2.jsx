import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Gauge,
  Image as ImageIcon,
  Layers3,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { API, api } from "../../lib/api";
import WebsiteHealthOpsPanels from "./WebsiteHealthOpsPanels";
import WebsiteHealthGrowthPanels from "./WebsiteHealthGrowthPanels";

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
const isPublished = (product) => (product?.status || "published") === "published";

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
const productKey = (product) => product?.id || product?.sku || product?.name || "unknown-product";

export function groupFindings(items = []) {
  const grouped = new Map();
  items.forEach((item) => {
    const key = productKey(item.product);
    const existing = grouped.get(key) || { product: item.product, findings: [] };
    existing.findings.push(item);
    grouped.set(key, existing);
  });
  return Array.from(grouped.values()).sort((a, b) => {
    const rank = { critical: 0, review: 1, info: 2 };
    const aRank = Math.min(...a.findings.map((item) => rank[item.severity] ?? 3));
    const bRank = Math.min(...b.findings.map((item) => rank[item.severity] ?? 3));
    if (aRank !== bRank) return aRank - bRank;
    return text(a.product?.sku).localeCompare(text(b.product?.sku));
  });
}

const uniqueProductCount = (items) => new Set(items.map((item) => productKey(item.product))).size;

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
      id: `${productKey(product)}-${issue}-${bucket.length}`,
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
      push(seoIssues, product, "info", "No stored SEO slug", "Readable name + SKU fallback is available, so this is informational only.");
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
    const current = categoryMap.get(category) || {
      products: 0,
      published: 0,
      drafts: 0,
      noImage: 0,
      completenessTotal: 0,
    };
    current.products += 1;
    if (isPublished(product)) current.published += 1;
    else current.drafts += 1;
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

  const publishedCompleteness = completeness.filter(({ product }) => isPublished(product));
  const draftCompleteness = completeness.filter(({ product }) => !isPublished(product));
  const publishedAttention = attention.filter((item) => isPublished(item.product));
  const draftAttention = attention.filter((item) => !isPublished(item.product));
  const publishedImageIssues = imageIssues.filter((item) => isPublished(item.product));
  const publishedSeoIssues = seoIssues.filter((item) => isPublished(item.product));
  const publishedSeoActionable = publishedSeoIssues.filter((item) => item.severity !== "info");

  const publishedAverageCompleteness = publishedCompleteness.length
    ? Math.round(publishedCompleteness.reduce((sum, item) => sum + item.score, 0) / publishedCompleteness.length)
    : 0;

  return {
    attention,
    imageIssues,
    seoIssues,
    completeness: completeness.sort((a, b) => a.score - b.score),
    publishedCompleteness: publishedCompleteness.sort((a, b) => a.score - b.score),
    draftCompleteness: draftCompleteness.sort((a, b) => a.score - b.score),
    publishedAttention,
    draftAttention,
    publishedImageIssues,
    publishedSeoIssues,
    publishedSeoActionable,
    categories,
    publishedAverageCompleteness,
    publishedCount: publishedCompleteness.length,
    draftCount: draftCompleteness.length,
    productsNeedingAttention: uniqueProductCount(publishedAttention.filter((item) => item.severity !== "info")),
    productsWithImageIssues: uniqueProductCount(publishedImageIssues),
    productsWithSeoIssues: uniqueProductCount(publishedSeoActionable),
    criticalPublishedProducts: uniqueProductCount(publishedAttention.filter((item) => item.severity === "critical")),
    seoInformationalCount: publishedSeoIssues.filter((item) => item.severity === "info").length,
  };
}

const severityClasses = {
  critical: "border-red-400/40 bg-red-500/5 text-red-200",
  review: "border-amber-300/30 bg-amber-400/5 text-amber-100",
  info: "border-white/10 bg-white/[0.02] text-white/60",
};

const actionClass = "inline-flex items-center gap-1.5 border border-[#D4AF37]/45 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#D4AF37] hover:bg-[#D4AF37]/10";
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

function ProductActions({ product }) {
  if (!product?.id) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/admin?tab=products&product=${encodeURIComponent(product.id)}`} className={actionClass}><Wrench size={12} /> Edit product</a>
      <a href={`/product/${encodeURIComponent(product.id)}`} className={actionClass}><ExternalLink size={12} /> View product</a>
    </div>
  );
}

function ProductFindingGroups({ groups, emptyMessage }) {
  if (!groups.length) {
    return <div className="border border-emerald-300/20 bg-emerald-400/5 p-6 text-sm text-emerald-100">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {groups.slice(0, 250).map(({ product, findings }) => {
        const hasCritical = findings.some((item) => item.severity === "critical");
        const hasReview = findings.some((item) => item.severity === "review");
        const style = hasCritical ? severityClasses.critical : hasReview ? severityClasses.review : severityClasses.info;
        return (
          <div key={productKey(product)} className={`border p-4 ${style}`}>
            <div className="grid gap-3 md:grid-cols-[130px_1fr_auto] md:items-start">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-60">{hasCritical ? "Critical" : hasReview ? "Review" : "Info"}</div>
                <div className="mt-1 text-xs font-medium">{product?.sku || "No SKU"}</div>
              </div>
              <div>
                <div className="text-sm text-white">{product?.name || "Unnamed product"}</div>
                <div className="mt-1 text-[11px] opacity-60">{product?.category || "No category"}</div>
              </div>
              <div className="text-[11px] opacity-60">{findings.length} finding{findings.length === 1 ? "" : "s"}</div>
            </div>
            <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
              {findings.map((item) => (
                <div key={item.id} className="grid gap-1 md:grid-cols-[1fr_1.4fr]">
                  <div className="text-sm">{item.issue}</div>
                  {item.detail ? <div className="break-all text-[11px] opacity-60">{item.detail}</div> : <div />}
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-white/10 pt-3"><ProductActions product={product} /></div>
          </div>
        );
      })}
      {groups.length > 250 && <div className="text-xs text-white/45">Showing first 250 of {groups.length} affected products.</div>}
    </div>
  );
}

function CompletenessRows({ items }) {
  if (!items.length) {
    return <div className="border border-emerald-300/20 bg-emerald-400/5 p-6 text-sm text-emerald-100">No completeness gaps found.</div>;
  }
  return (
    <div className="space-y-2">
      {items.slice(0, 300).map(({ product, score, missing }) => (
        <div key={productKey(product)} className="grid gap-3 border border-white/10 p-4 xl:grid-cols-[110px_1fr_90px_1.3fr_auto] xl:items-center">
          <div className="text-xs text-white/60">{product.sku || "No SKU"}</div>
          <div><div className="text-sm">{product.name || "Unnamed product"}</div><div className="text-[11px] text-white/40">{product.category || "No category"}</div></div>
          <div className={`font-serif text-2xl ${score >= 90 ? "text-emerald-300" : score >= 75 ? "text-[#D4AF37]" : "text-amber-200"}`}>{score}%</div>
          <div className="text-xs text-white/45">Missing/review: {missing.join(", ")}</div>
          <ProductActions product={product} />
        </div>
      ))}
    </div>
  );
}

export default function WebsiteHealthAdminV2() {
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
        if (!response.ok) throw new Error(`Deployment check failed (${response.status})`);
        return response.json();
      }).catch((error) => {
        setReleaseError(error?.message || "Deployment check unavailable");
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

  const filterCompleteness = (items) => items.filter(({ product, missing }) => (
    missing.length > 0 && (
      !normalizedQuery || [product?.sku, product?.name, product?.category, ...(missing || [])]
        .some((value) => text(value).toLowerCase().includes(normalizedQuery))
    )
  ));

  const tabs = [
    ["attention", "Needs Attention", AlertTriangle],
    ["completeness", "Product Completeness", Gauge],
    ["images", "Image Audit", ImageIcon],
    ["seo", "SEO Health", FileSearch],
    ["overview", "Catalogue Overview", BarChart3],
    ["operations", "Live Site Operations", Activity],
    ["growth", "Catalogue Growth Controls", Layers3],
    ["deployment", "Deployment Info", ShieldCheck],
  ];

  const publishedAttentionGroups = groupFindings(filterIssues(health.publishedAttention));
  const imageGroups = groupFindings(filterIssues(health.publishedImageIssues));
  const seoActionableGroups = groupFindings(filterIssues(health.publishedSeoActionable));
  const seoInfoGroups = groupFindings(filterIssues(health.publishedSeoIssues.filter((item) => item.severity === "info")));
  const incompletePublished = filterCompleteness(health.publishedCompleteness);
  const incompleteDrafts = filterCompleteness(health.draftCompleteness);
  const completePublishedCount = health.publishedCompleteness.filter((item) => item.missing.length === 0).length;
  const searchEnabled = ["attention", "completeness", "images", "seo"].includes(tab);

  return (
    <div data-testid="admin-website-health" className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="eyebrow mb-3">Backoffice · Website Health</div>
          <h1 className="font-serif text-4xl">Website Health</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
            Focused checks for catalogue quality, live-site health, search readiness and growth structure. Each area has its own tab so only the information you choose is shown.
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
        <Metric label="Products audited" value={products.length} hint={`${health.publishedCount} published · ${health.draftCount} drafts${stats?.products != null ? ` · public stats ${stats.products}` : ""}`} />
        <Metric label="Published completeness" value={`${health.publishedAverageCompleteness}%`} hint="Average across published products only" />
        <Metric label="Products needing attention" value={health.productsNeedingAttention} hint={`${health.criticalPublishedProducts} published products have critical findings`} />
        <Metric label="Products with image issues" value={health.productsWithImageIssues} hint={`${health.publishedImageIssues.length} total image findings`} />
        <Metric label="Products with SEO-content issues" value={health.productsWithSeoIssues} hint={`${health.publishedSeoActionable.length} actionable findings · ${health.seoInformationalCount} informational`} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10">
        {tabs.map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} data-testid={`website-health-tab-${key}`} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-[11px] uppercase tracking-[0.18em] ${tab === key ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-white/50 hover:text-white"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {searchEnabled && (
        <div className="mt-6 relative max-w-xl">
          <Search size={15} className="absolute left-3 top-3 text-white/35" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU, product, category or issue" className="w-full border border-white/15 bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#D4AF37]/70" />
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="border border-white/10 p-8 text-sm text-white/50">Running health checks…</div>
        ) : tab === "attention" ? (
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div><div className="eyebrow mb-2">Published catalogue</div><h2 className="font-serif text-2xl">Needs Attention</h2><p className="mt-2 text-xs text-white/45">Only published products with actionable catalogue findings are shown here.</p></div>
              <div className="text-xs text-white/45">{publishedAttentionGroups.length} affected products · {filterIssues(health.publishedAttention).length} findings</div>
            </div>
            <ProductFindingGroups groups={publishedAttentionGroups} emptyMessage="No published catalogue findings require attention." />
          </section>
        ) : tab === "completeness" ? (
          <div className="space-y-10">
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div><div className="eyebrow mb-2">Published catalogue</div><h2 className="font-serif text-2xl">Products with completeness gaps</h2><p className="mt-2 text-xs text-white/45">Complete 100% products are omitted so this tab stays actionable.</p></div>
                <div className="text-xs text-white/45">{incompletePublished.length} need review · {completePublishedCount} complete</div>
              </div>
              <CompletenessRows items={incompletePublished} />
            </section>
            {incompleteDrafts.length > 0 && (
              <section>
                <div className="mb-4"><div className="eyebrow mb-2">Drafts</div><h2 className="font-serif text-2xl">Draft completeness gaps</h2></div>
                <CompletenessRows items={incompleteDrafts} />
              </section>
            )}
          </div>
        ) : tab === "images" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-serif text-2xl">Image Audit</h2><p className="mt-2 text-xs text-white/45">Each finding links directly to the affected product editor.</p></div><div className="text-xs text-white/45">{imageGroups.length} published products affected · {filterIssues(health.publishedImageIssues).length} findings</div></div>
            <ProductFindingGroups groups={imageGroups} emptyMessage="No structural product-image issues found in published products." />
          </div>
        ) : tab === "seo" ? (
          <div className="space-y-8">
            <div className="border border-white/10 p-4 text-xs leading-5 text-white/50">
              This is a catalogue-content readiness audit, not Search Console. Missing stored SEO slugs are informational because readable name + SKU fallback URLs already work and therefore do not inflate the main SEO-content warning count.
            </div>
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><h2 className="font-serif text-2xl">Actionable SEO-content checks</h2><div className="text-xs text-white/45">{seoActionableGroups.length} affected products · {filterIssues(health.publishedSeoActionable).length} findings</div></div>
              <ProductFindingGroups groups={seoActionableGroups} emptyMessage="No actionable SEO-content findings found in published products." />
            </section>
            {seoInfoGroups.length > 0 && <section><div className="mb-4"><h2 className="font-serif text-2xl">Informational</h2><p className="mt-2 text-xs text-white/45">Useful context that does not count as a published-site SEO warning.</p></div><ProductFindingGroups groups={seoInfoGroups} emptyMessage="No informational SEO notes." /></section>}
          </div>
        ) : tab === "overview" ? (
          <section>
            <div className="mb-4"><div className="eyebrow mb-2">Catalogue overview</div><h2 className="font-serif text-2xl">Category snapshot</h2><p className="mt-2 text-xs text-white/45">Reference data only — it is intentionally kept out of Needs Attention.</p></div>
            <div className="overflow-x-auto border border-white/10">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/5 text-[10px] uppercase tracking-[0.18em] text-white/50"><tr><th className="p-3">Category</th><th className="p-3">Products</th><th className="p-3">Published</th><th className="p-3">Drafts</th><th className="p-3">No image</th><th className="p-3">Avg completeness</th></tr></thead>
                <tbody>{health.categories.map((row) => <tr key={row.category} className="border-t border-white/10"><td className="p-3">{row.category}</td><td className="p-3">{row.products}</td><td className="p-3">{row.published}</td><td className="p-3">{row.drafts}</td><td className="p-3">{row.noImage}</td><td className="p-3">{row.averageCompleteness}%</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        ) : tab === "operations" ? (
          <WebsiteHealthOpsPanels />
        ) : tab === "growth" ? (
          <WebsiteHealthGrowthPanels />
        ) : (
          <div className="space-y-6">
            <div className="border border-white/10 p-5 text-sm leading-6 text-white/55">
              <div className="mb-2 font-serif text-xl text-white">What Deployment Info means</div>
              This is a read-only technical check showing whether the running site exposes Git/deployment identifiers. It does not publish, sync or change anything. Because the Emergent production runtime does not currently expose enough Git metadata, this page may show “Unavailable”; your approved SHA-pinned GitHub → Emergent sync process remains the authoritative release check.
            </div>
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
                <div><div className="text-sm">Deployment interpretation</div><div className="mt-1 text-xs leading-5 text-white/50">{release?.aligned === false ? "The deployment SHA and visible Git HEAD differ. Verify the GitHub → Emergent → production handoff before publishing another release." : release?.git_dirty === true ? "The runtime Git workspace contains local changes. This is normal during SHA-pinned Emergent sync, but verify the exact approved files before publishing." : release?.aligned === true ? "The available runtime/deployment SHA signals agree." : "Exact SHA alignment cannot be inferred from this runtime. Continue using the existing SHA-pinned sync SOP rather than assuming alignment."}</div></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && !["operations", "growth"].includes(tab) && <div className="mt-8 text-[11px] text-white/35">Last refreshed: {refreshedAt ? refreshedAt.toLocaleString() : "—"}</div>}
    </div>
  );
}
