import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, FileVideo, Image as ImageIcon, LoaderCircle, RefreshCw, Upload } from "lucide-react";
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
  ["recommended", "Has SOP recommendation"],
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
  const [applyingRecommendations, setApplyingRecommendations] = useState(false);
  const [recommendationPreview, setRecommendationPreview] = useState(false);
  const [selectedRecommendationTypes, setSelectedRecommendationTypes] = useState([
    "video_reel",
    "installation",
  ]);
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
      if (issueFilter === "low_resolution" && (!asset.low_resolution || asset.use_count === 0)) return false;
      if (issueFilter === "unused" && asset.use_count !== 0) return false;
      if (issueFilter === "unclassified" && asset.usage_type !== "unclassified") return false;
      if (issueFilter === "recommended" && !asset.recommendation) return false;
      if (!needle) return true;
      const haystack = [
        asset.url,
        asset.usage_label,
        ...usageSummary(asset.used_by),
      ].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [report, query, usageFilter, issueFilter]);

  const recommendations = useMemo(
    () => (report?.assets || []).filter((asset) => asset.recommendation),
    [report]
  );
  const highConfidenceRecommendations = useMemo(
    () => recommendations.filter((asset) => (asset.recommendation?.confidence || 0) >= 0.90),
    [recommendations]
  );
  const recommendationGroups = useMemo(() => {
    const grouped = new Map();
    highConfidenceRecommendations.forEach((asset) => {
      const key = asset.recommendation.usage_type;
      if (!grouped.has(key)) {
        grouped.set(key, {
          usageType: key,
          label: asset.recommendation.label,
          assets: [],
        });
      }
      grouped.get(key).assets.push(asset);
    });
    return Array.from(grouped.values());
  }, [highConfidenceRecommendations]);

  const selectedRecommendations = useMemo(
    () => highConfidenceRecommendations.filter((asset) =>
      selectedRecommendationTypes.includes(asset.recommendation.usage_type)
    ),
    [highConfidenceRecommendations, selectedRecommendationTypes]
  );

  const toggleRecommendationType = (usageType) => {
    setSelectedRecommendationTypes((current) =>
      current.includes(usageType)
        ? current.filter((value) => value !== usageType)
        : [...current, usageType]
    );
  };

  const recommendationPayload = (asset) => ({
    id: asset.id,
    url: asset.url,
    usage_type: asset.recommendation.usage_type,
    confidence: asset.recommendation.confidence,
    reason: asset.recommendation.reason,
  });

  const applyRecommendations = async (selectedAssets) => {
    if (!selectedAssets.length || applyingRecommendations) return;
    setApplyingRecommendations(true);
    try {
      const result = await api.adminApplyMediaRecommendations(
        selectedAssets.map(recommendationPayload)
      );
      toast.success(`Approved ${result.approved} SOP recommendation${result.approved === 1 ? "" : "s"}`);
      setRecommendationPreview(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Recommendations could not be applied");
    } finally {
      setApplyingRecommendations(false);
    }
  };

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
    ["Broken references", summary.invalid || 0],
    ["Potential duplicate groups", summary.duplicate_groups || 0],
    ["Low-res images in use", summary.low_resolution_in_use || 0],
    ["Usage labels assigned", `${summary.classified || 0}/${summary.assets || 0}`],
    ["Pair checks ready", `${summary.products_pair_assessed || 0}/${summary.products_total || 0}`],
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
      <p className="-mt-5 text-[11px] leading-relaxed text-white/45">
        Broken references and low-resolution images currently used on the website need attention.
        Duplicate groups require review. Usage labels and pair checks are workflow progress, not website errors.
      </p>

      {recommendations.length > 0 && (
        <section data-testid="media-recommendations" className="border border-[#D4AF37]/35 bg-[#D4AF37]/[0.035] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#D4AF37]">
                <CheckCircle2 size={17} />
                <h3 className="text-xs uppercase tracking-[0.2em]">SOP recommendations</h3>
              </div>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/50">
                {recommendations.length} assets have evidence-based suggestions. Only {highConfidenceRecommendations.length} high-confidence recommendations are included in bulk approval. Nothing changes until you preview and confirm.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRecommendationPreview((open) => !open)}
              className="border border-[#D4AF37]/60 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]"
            >
              {recommendationPreview ? "Close preview" : "Preview recommendations"}
            </button>
          </div>

          {recommendationPreview && (
            <div data-testid="media-recommendation-preview" className="mt-5 border-t border-white/10 pt-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {recommendationGroups.map((group) => {
                  const selected = selectedRecommendationTypes.includes(group.usageType);
                  const needsBulbReview = ["white_bulbs_off", "black_bulbs_on"].includes(group.usageType);
                  return (
                    <label key={group.usageType} className={`cursor-pointer border p-3 ${selected ? "border-[#D4AF37]/60" : "border-white/10"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.14em] text-white/55">{group.label}</div>
                          <div className="mt-1 font-serif text-xl">{group.assets.length}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleRecommendationType(group.usageType)}
                          aria-label={`Select ${group.label} recommendations`}
                          className="mt-1 accent-[#D4AF37]"
                        />
                      </div>
                      <div className="mt-3 flex gap-1.5">
                        {group.assets.slice(0, 3).map((asset) => (
                          asset.kind === "image" ? (
                            <img
                              key={asset.id}
                              src={api.resolveImage(asset.url)}
                              alt=""
                              loading="lazy"
                              className="h-12 w-12 border border-white/10 bg-black object-contain"
                            />
                          ) : (
                            <div key={asset.id} className="flex h-12 w-12 items-center justify-center border border-white/10 bg-black">
                              <FileVideo size={15} className="text-white/50" />
                            </div>
                          )
                        ))}
                      </div>
                      {needsBulbReview && (
                        <div className="mt-2 text-[9px] leading-relaxed text-amber-200/70">
                          Not selected by default: visually verify bulb state first.
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-3xl text-[11px] leading-relaxed text-white/45">
                  Approval stores classification metadata only. It does not replace, delete, reorder or detach any product or project image. White/black recommendations should still be visually reviewed because background analysis cannot independently verify bulb state.
                </p>
                <button
                  type="button"
                  disabled={!selectedRecommendations.length || applyingRecommendations}
                  onClick={() => applyRecommendations(selectedRecommendations)}
                  className="inline-flex items-center gap-2 bg-[#D4AF37] px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-black disabled:opacity-40"
                >
                  {applyingRecommendations && <LoaderCircle className="animate-spin" size={13} />}
                  Confirm {selectedRecommendations.length} selected
                </button>
              </div>
            </div>
          )}
        </section>
      )}

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

                {asset.recommendation && (
                  <div className="border border-[#D4AF37]/25 bg-black/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-[#D4AF37]">
                        Recommended: {asset.recommendation.label} · {Math.round(asset.recommendation.confidence * 100)}%
                      </div>
                      <button
                        type="button"
                        disabled={applyingRecommendations}
                        onClick={() => applyRecommendations([asset])}
                        className="text-[9px] uppercase tracking-[0.16em] text-white/65 hover:text-[#D4AF37]"
                      >
                        Review & apply
                      </button>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">{asset.recommendation.reason}</p>
                  </div>
                )}

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
            Products with verified missing lit/unlit pair ({report.missing_products.length})
          </summary>
          <p className="mt-3 text-xs leading-relaxed text-white/45">
            Only fully classified products are assessed. {summary.products_pair_unassessed || 0} products remain not assessed; they are not counted as missing. A verified complete product needs both White background / bulbs off and Black background / bulbs on.
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
