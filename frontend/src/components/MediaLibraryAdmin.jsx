import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Copy, FileVideo, Image as ImageIcon, LoaderCircle, RefreshCw, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";

const ISSUE_FILTERS = [
  ["all", "All assets"],
  ["invalid", "Invalid"],
  ["duplicate", "Duplicates"],
  ["low_resolution", "Low resolution"],
  ["unused", "Unused"],
  ["unclassified", "Unclassified"],
];

const formatBytes = (value) => {
  if (!value) return "Size unavailable";
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
};

export const usageSummary = (usedBy = []) => {
  if (!usedBy.length) return ["Not currently used"];
  return usedBy.map((use) => {
    if (use.type === "product") return `${use.name}${use.sku ? ` · ${use.sku}` : ""} · image ${use.slot}`;
    if (use.type === "project") return `${use.name}${use.location ? ` · ${use.location}` : ""} · image ${use.slot}`;
    return `${use.name} · ${use.type}`;
  });
};

export default function MediaLibraryAdmin() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState("all");
  const [issueFilter, setIssueFilter] = useState("all");
  const [busyId, setBusyId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("unclassified");
  const fileInput = useRef(null);

  const load = async () => {
    setError("");
    try {
      setReport(await api.adminMediaLibrary());
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Media Library could not be loaded");
    }
  };

  useEffect(() => { load(); }, []);

  const assets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (report?.assets || []).filter((asset) => {
      if (usageFilter !== "all" && asset.usage_type !== usageFilter) return false;
      if (issueFilter === "invalid" && asset.validity !== "invalid") return false;
      if (issueFilter === "duplicate" && !asset.duplicate_url && !asset.duplicate_content) return false;
      if (issueFilter === "low_resolution" && !asset.low_resolution) return false;
      if (issueFilter === "unused" && asset.use_count !== 0) return false;
      if (issueFilter === "unclassified" && asset.usage_type !== "unclassified") return false;
      if (!needle) return true;
      const haystack = [
        asset.url,
        asset.usage_label,
        ...usageSummary(asset.used_by),
      ].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [report, query, usageFilter, issueFilter]);

  const updateUsage = async (asset, usageType) => {
    setBusyId(asset.id);
    try {
      await api.adminUpdateMediaAsset(asset.id, {
        url: asset.url,
        usage_type: usageType,
        notes: asset.notes || "",
      });
      setReport((current) => ({
        ...current,
        assets: current.assets.map((row) => (
          row.id === asset.id
            ? {
                ...row,
                usage_type: usageType,
                usage_label: current.usage_types.find((item) => item.value === usageType)?.label || usageType,
              }
            : row
        )),
      }));
      await load();
      toast.success("Media type updated");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Media type update failed");
    } finally {
      setBusyId("");
    }
  };

  const scan = async () => {
    if (scanning) return;
    setScanning(true);
    setScanProgress("Starting…");
    let scanned = 0;
    let failed = 0;
    let remaining = 1;
    let batches = 0;
    try {
      // Keep every request short enough for Cloudflare. The scan is resumable,
      // so a transient failure never starts over or launches overlapping work.
      while (remaining > 0 && batches < 200) {
        const result = await api.adminScanMediaLibrary(10);
        scanned += result.scanned || 0;
        failed += result.failed || 0;
        remaining = result.remaining || 0;
        batches += 1;
        setScanProgress(remaining ? `${scanned} scanned · ${remaining} remaining` : "Finishing…");
        if (!result.total_considered) break;
        // Briefly yield between batches so normal admin/API requests remain responsive.
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      toast.success(
        `Scanned ${scanned} file${scanned === 1 ? "" : "s"}${failed ? ` · ${failed} skipped` : ""}${remaining ? ` · ${remaining} remaining` : ""}`
      );
      await load();
    } catch (err) {
      toast.error(
        err?.response?.data?.detail ||
        `Metadata scan paused after ${scanned} files. Click Scan metadata to resume.`
      );
      await load();
    } finally {
      setScanning(false);
      setScanProgress("");
    }
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading) return;
    setUploading(true);
    try {
      const result = await api.upload(file);
      if (!result.asset_id) throw new Error("Upload did not return a media asset id");
      await api.adminUpdateMediaAsset(result.asset_id, {
        url: result.url,
        usage_type: uploadType,
        notes: "",
      });
      toast.success("Media uploaded to the library");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (error) {
    return (
      <div data-testid="media-library-error" role="alert" className="border border-red-400/30 bg-red-500/5 p-8 text-center">
        <AlertTriangle className="mx-auto text-[#E5B579]" size={24} />
        <div className="font-serif text-xl mt-3">Media Library unavailable</div>
        <p className="text-sm text-white/55 mt-2">{error}</p>
        <button type="button" onClick={load} className="mt-5 border border-[#D4AF37]/60 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Retry</button>
      </div>
    );
  }

  if (!report) {
    return <div data-testid="media-library-loading" className="border border-white/10 p-10 text-center text-sm text-white/50">Loading Media Library…</div>;
  }

  const summary = report.summary || {};
  const metricCards = [
    ["Assets", summary.assets || 0],
    ["Invalid", summary.invalid || 0],
    ["Duplicates", summary.duplicate_assets || 0],
    ["Low resolution", summary.low_resolution || 0],
    ["Unclassified", summary.unclassified || 0],
    ["Products missing pair", summary.products_missing_required_slots || 0],
  ];

  return (
    <div data-testid="admin-media-library" className="space-y-8">
      <section className="border border-white/10 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="eyebrow mb-2">Catalogue operations</div>
            <h2 className="font-serif text-3xl">Media Library</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
              One inventory for product, project, hero and category media. Classify assets by their approved use, see exact dimensions and usage, and find missing pairs or invalid references without changing product records.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label>
              <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-white/45">Upload as</span>
              <select value={uploadType} onChange={(event) => setUploadType(event.target.value)} className="border border-white/15 bg-[#111] px-3 py-2 text-xs">
                {report.usage_types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className="inline-flex min-h-[38px] items-center gap-2 border border-[#D4AF37]/60 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#D4AF37] disabled:opacity-50">
              {uploading ? <LoaderCircle className="animate-spin" size={14} /> : <Upload size={14} />} Upload media
            </button>
            <input ref={fileInput} data-testid="media-upload-input" type="file" accept="image/*,video/*" onChange={upload} className="hidden" />
            <button type="button" disabled={scanning} onClick={scan} className="inline-flex min-h-[38px] items-center gap-2 border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/70 disabled:opacity-50">
              <RefreshCw className={scanning ? "animate-spin" : ""} size={14} /> {scanning ? (scanProgress || "Scanning…") : "Scan metadata"}
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {metricCards.map(([label, value]) => (
          <div key={label} className="border border-white/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{label}</div>
            <div className="mt-2 font-serif text-2xl">{value}</div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search URL, SKU, product or project…" className="min-w-[240px] flex-1 border border-white/15 bg-[#0a0a0a] px-4 py-2.5 text-sm outline-none focus:border-[#D4AF37]" />
          <select value={usageFilter} onChange={(event) => setUsageFilter(event.target.value)} className="border border-white/15 bg-[#111] px-3 py-2 text-xs">
            <option value="all">All usage types</option>
            {report.usage_types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)} className="border border-white/15 bg-[#111] px-3 py-2 text-xs">
            {ISSUE_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="text-xs text-white/45">{assets.length} of {summary.assets || 0} assets shown</div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {assets.map((asset) => (
            <article key={asset.id} data-testid={`media-asset-${asset.id}`} className="grid grid-cols-[104px_1fr] gap-4 border border-white/10 p-4">
              <div className="flex h-[132px] items-center justify-center overflow-hidden bg-black/50">
                {asset.kind === "video" ? (
                  <video src={api.resolveImage(asset.url)} className="h-full w-full object-contain" muted preload="metadata" />
                ) : asset.validity === "invalid" ? (
                  <AlertTriangle size={24} className="text-red-300" />
                ) : (
                  <img src={api.resolveImage(asset.url)} alt="" loading="lazy" className="h-full w-full object-contain" />
                )}
              </div>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 border border-white/15 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-white/60">
                      {asset.kind === "video" ? <FileVideo size={11} /> : <ImageIcon size={11} />} {asset.kind}
                    </span>
                    {asset.validity === "invalid" && <span className="border border-red-400/40 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-red-200">Invalid</span>}
                    {asset.validity === "unverified" && <span className="border border-amber-300/30 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-amber-100">External · unverified</span>}
                    {(asset.duplicate_url || asset.duplicate_content) && <span className="inline-flex items-center gap-1 border border-[#E5B579]/40 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-[#E5B579]"><Copy size={10} /> Duplicate</span>}
                    {asset.low_resolution && <span className="border border-[#E5B579]/40 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-[#E5B579]">Low resolution</span>}
                  </div>
                  <span className="text-[10px] text-white/40">{asset.width && asset.height ? `${asset.width} × ${asset.height}px` : "Resolution not scanned"} · {formatBytes(asset.size_bytes)}</span>
                </div>

                <select disabled={busyId === asset.id} value={asset.usage_type} onChange={(event) => updateUsage(asset, event.target.value)} className="w-full border border-white/15 bg-[#111] px-3 py-2 text-xs disabled:opacity-50">
                  {report.usage_types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>

                <div className="space-y-1">
                  {usageSummary(asset.used_by).map((label, index) => <div key={`${label}-${index}`} className="truncate text-[11px] text-white/55">{label}</div>)}
                </div>

                <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.16em]">
                  <a href={api.resolveImage(asset.url)} target="_blank" rel="noreferrer" className="text-[#D4AF37] hover:underline">Open asset</a>
                  {asset.original_available && asset.file_id && <a href={api.adminMediaOriginalUrl(asset.file_id)} target="_blank" rel="noreferrer" className="text-[#BF9972] hover:underline">View original</a>}
                  {asset.used_by.filter((use) => use.type === "product").slice(0, 1).map((use) => (
                    <Link key={use.id} to={`/admin?tab=products&product=${encodeURIComponent(use.id)}`} className="text-white/60 hover:text-white">Edit product</Link>
                  ))}
                </div>
                <div className="truncate text-[10px] text-white/30" title={asset.url}>{asset.url}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border border-white/10 p-5">
        <details>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
            Products missing required lit/unlit pair ({report.missing_products.length})
          </summary>
          <p className="mt-3 text-xs leading-relaxed text-white/45">
            A product is complete here only after its assets are explicitly classified as both White background / bulbs off and Black background / bulbs on. The library never guesses from image order.
          </p>
          <div className="mt-4 max-h-[480px] divide-y divide-white/5 overflow-y-auto">
            {report.missing_products.map((product) => (
              <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-sm">{product.name}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/40">{product.sku || "No SKU"} · Missing: {product.missing_labels.join(", ")}</div>
                </div>
                <Link to={`/admin?tab=products&product=${encodeURIComponent(product.id)}`} className="border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/65 hover:border-[#D4AF37] hover:text-[#D4AF37]">Edit product</Link>
              </div>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}
