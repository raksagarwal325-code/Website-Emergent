import React, { useEffect, useState } from "react";
import { Activity, Check, Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { API, api } from "../lib/api";
import { buildProjectSlugs } from "../lib/slug";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "Chandelier", label: "Chandeliers" },
  { value: "Hanging Light", label: "Hanging Lights" },
  { value: "Wall Light", label: "Wall Lights" },
  { value: "Table Lamp", label: "Table Lamps" },
  { value: "Floor Lamp", label: "Floor Lamps" },
  { value: "Candle Stand", label: "Candle Stands" },
  { value: "Floor Chandelier", label: "Floor Chandeliers" },
  { value: "Table Chandelier", label: "Table Chandeliers" },
  { value: "Ceiling Light", label: "Ceiling Lights" },
  { value: "Gate Light", label: "Gate Lights" },
];

const fallbackFilename = (category) => {
  const day = new Date().toISOString().slice(0, 10);
  const slug = String(category || "full-product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `samrat-glass-${slug}-catalogue-${day}.xlsx`;
};

const filenameFromDisposition = (header, category) => {
  const match = /filename\*?=(?:UTF-8''|\")?([^\";]+)/i.exec(header || "");
  return match ? decodeURIComponent(match[1].replace(/^\"|\"$/g, "").trim()) : fallbackFilename(category);
};

export default function AdminCatalogueExcelControl({ onImported }) {
  const [downloading, setDownloading] = useState(false);
  const [category, setCategory] = useState("Chandelier");
  const [importFile, setImportFile] = useState(null);
  const [importReason, setImportReason] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    const requestedProject = params.get("project");
    const requestedProduct = params.get("product");
    if (!requestedTab && !requestedProject && !requestedProduct) return undefined;

    let cancelled = false;
    let timer = null;

    const clickTab = (tab) => {
      const button = document.querySelector(`[data-testid="admin-tab-${tab}"]`);
      if (!button) return false;
      button.click();
      return true;
    };

    const focusProject = async () => {
      if (!requestedProject) return;
      try {
        const settings = await api.adminGetSettings();
        if (cancelled) return;
        const items = settings?.homepage_content?.gallery?.items || [];
        const slugs = buildProjectSlugs(items);
        const index = slugs.indexOf(requestedProject);
        if (index < 0) return;

        let attempts = 0;
        const reveal = () => {
          if (cancelled) return;
          const editor = document.querySelector(`[data-testid="project-editor-${index}"]`);
          if (!editor) {
            attempts += 1;
            if (attempts < 30) timer = window.setTimeout(reveal, 120);
            return;
          }
          const toggle = editor.querySelector("button[aria-expanded]");
          if (toggle?.getAttribute("aria-expanded") !== "true") toggle?.click();
          editor.scrollIntoView({ behavior: "smooth", block: "center" });
        };
        reveal();
      } catch (_) {
        // Leave the user in Project Gallery even if exact-item resolution fails.
      }
    };

    const focusProduct = () => {
      if (!requestedProduct) return;
      let attempts = 0;
      const reveal = () => {
        if (cancelled) return;
        const editButton = document.querySelector(`[data-testid="edit-${requestedProduct}"]`);
        if (!editButton) {
          attempts += 1;
          if (attempts < 40) timer = window.setTimeout(reveal, 100);
          return;
        }
        editButton.click();
        window.setTimeout(() => {
          const form = document.querySelector('[data-testid="p-save-btn"]')?.closest("form");
          form?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      };
      reveal();
    };

    let attempts = 0;
    const openRequestedArea = () => {
      if (cancelled) return;
      const tab = requestedTab || (requestedProject ? "homepage" : requestedProduct ? "products" : "dashboard");
      if (!clickTab(tab)) {
        attempts += 1;
        if (attempts < 30) timer = window.setTimeout(openRequestedArea, 100);
        return;
      }
      if (requestedProject) window.setTimeout(focusProject, 80);
      if (requestedProduct) window.setTimeout(focusProduct, 80);
    };

    openRequestedArea();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const query = category ? `?category=${encodeURIComponent(category)}` : "";
      const response = await fetch(`${API}/admin/catalogue/products.xlsx${query}`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "X-Requested-With": "fetch",
        },
      });
      if (!response.ok) {
        let message = `Excel export failed (${response.status})`;
        try {
          const payload = await response.json();
          if (payload?.detail) message = payload.detail;
        } catch (_) {
          // Keep the status-based fallback when the response is not JSON.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = filenameFromDisposition(response.headers.get("Content-Disposition"), category);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);

      const count = response.headers.get("X-Catalogue-Products");
      const images = response.headers.get("X-Catalogue-Embedded-Images");
      const categoryLabel = category
        ? CATEGORIES.find((item) => item.value === category)?.label || category
        : "Full catalogue";
      toast.success(
        count
          ? `${categoryLabel} Excel downloaded — ${count} products${images ? `, ${images} images embedded` : ""}`
          : `${categoryLabel} Excel downloaded`
      );
    } catch (error) {
      toast.error(error?.message || "Excel export failed");
    } finally {
      setDownloading(false);
    }
  };

  const importRequest = async (path, fields = {}) => {
    const form = new FormData();
    form.append("file", importFile);
    Object.entries(fields).forEach(([key, value]) => form.append(key, value));
    const response = await fetch(`${API}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Requested-With": "fetch" },
      body: form,
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch (_) {
      // Preserve the status-based fallback for non-JSON proxy failures.
    }
    if (!response.ok) throw new Error(payload?.detail || `Excel import failed (${response.status})`);
    return payload;
  };

  const chooseImportFile = (event) => {
    const file = event.target.files?.[0] || null;
    setPreview(null);
    if (file && !file.name.toLowerCase().endsWith(".xlsx")) {
      setImportFile(null);
      event.target.value = "";
      toast.error("Choose an .xlsx catalogue file");
      return;
    }
    if (file && file.size > 50 * 1024 * 1024) {
      setImportFile(null);
      event.target.value = "";
      toast.error("The Excel file must be 50 MB or smaller");
      return;
    }
    setImportFile(file);
  };

  const previewImport = async () => {
    if (!importFile || previewing || applying) return;
    setPreviewing(true);
    setPreview(null);
    try {
      const result = await importRequest("/admin/catalogue/import/preview");
      setPreview(result);
      if (result.errors?.length) toast.error("The workbook has errors that must be corrected");
      else if (!result.changed_field_count) toast.success("No specification changes found");
      else toast.success(`${result.changed_field_count} specification changes ready to review`);
    } catch (error) {
      toast.error(error?.message || "Excel preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const applyImport = async () => {
    if (!importFile || !preview?.can_apply || !importReason.trim() || applying) return;
    setApplying(true);
    try {
      const result = await importRequest("/admin/catalogue/import/apply", {
        preview_token: preview.preview_token,
        reason: importReason.trim(),
      });
      await onImported?.();
      toast.success(`${result.updated_count} products updated · ${result.changed_field_count} specification changes`);
      setImportFile(null);
      setImportReason("");
      setPreview(null);
      const input = document.getElementById("admin-catalogue-import-file");
      if (input) input.value = "";
    } catch (error) {
      toast.error(error?.message || "Excel import failed");
      setPreview(null);
    } finally {
      setApplying(false);
    }
  };

  return (
    <section
      data-testid="admin-catalogue-tools"
      className="w-full border border-[#D4AF37]/30 bg-[#0d0d0d]/55 p-4 sm:p-5"
      aria-labelledby="admin-catalogue-tools-title"
    >
      <div className="mb-4">
        <div id="admin-catalogue-tools-title" className="eyebrow mb-1">Admin tools</div>
        <p className="text-xs leading-5 text-white/45">
          Review Website Health, export catalogue data, or preview corrected specifications before applying them.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.85fr_1fr_1.15fr] lg:items-end">
        <Link
          to="/admin/health"
          data-testid="admin-website-health-link"
          className="flex min-h-[42px] items-center justify-between border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/65 transition hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
        >
          Website Health
          <Activity size={14} />
        </Link>

        <div>
          <label htmlFor="admin-catalogue-category" className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-white/45">
            Export category
          </label>
          <select
            id="admin-catalogue-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={downloading}
            className="w-full border border-white/20 bg-[#171717] px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37] disabled:cursor-wait disabled:opacity-70"
          >
            {CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
            <option value="">Full catalogue — all products</option>
          </select>
        </div>

        <button
          type="button"
          data-testid="admin-download-catalogue-excel"
          onClick={download}
          disabled={downloading}
          className="group flex min-h-[42px] w-full items-center gap-3 border border-white/15 p-2.5 text-left transition hover:border-[#D4AF37]/60 disabled:cursor-wait disabled:opacity-70"
          title="Download the selected product category as Excel with embedded primary images"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#D4AF37] text-black">
            {downloading ? <LoaderCircle size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
          </span>
          <span>
            <span className="block text-[10px] uppercase tracking-[0.24em] text-white/45">Admin catalogue</span>
            <span className="mt-0.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-white">
              {downloading ? "Preparing Excel…" : "Download Excel"}
              {!downloading && <Download size={13} className="text-[#D4AF37]" />}
            </span>
            <span className="mt-0.5 block text-[10px] text-white/45">Selected category · specs · tags · images</span>
          </span>
        </button>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5" data-testid="admin-catalogue-import">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-[#D4AF37]">Import corrected specifications</div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-white/45">
              Upload an Excel file downloaded here. Products are matched by SKU and Product ID. Only non-empty Spec: cells can change; names, prices, images, categories and publishing status are protected.
            </p>
          </div>
          <span className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/35 sm:mt-0">Preview required before applying</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_1fr_auto] lg:items-end">
          <div>
            <label htmlFor="admin-catalogue-import-file" className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-white/45">Corrected Excel file</label>
            <input
              id="admin-catalogue-import-file"
              data-testid="admin-catalogue-import-file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={chooseImportFile}
              disabled={previewing || applying}
              className="block w-full border border-white/20 bg-[#171717] px-3 py-2 text-xs text-white file:mr-3 file:border-0 file:bg-[#D4AF37] file:px-3 file:py-1.5 file:text-[10px] file:uppercase file:tracking-[0.16em] file:text-black disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="admin-catalogue-import-reason" className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-white/45">Reason for change</label>
            <input
              id="admin-catalogue-import-reason"
              data-testid="admin-catalogue-import-reason"
              value={importReason}
              onChange={(event) => setImportReason(event.target.value)}
              maxLength={500}
              placeholder="For example: Correct verified Kandil specifications"
              disabled={applying}
              className="min-h-[42px] w-full border border-white/20 bg-[#171717] px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#D4AF37] disabled:opacity-60"
            />
          </div>
          <button
            type="button"
            data-testid="admin-preview-catalogue-import"
            onClick={previewImport}
            disabled={!importFile || previewing || applying}
            className="flex min-h-[42px] items-center justify-center gap-2 border border-[#D4AF37]/70 px-5 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/25"
          >
            {previewing ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}
            {previewing ? "Checking…" : "Preview import"}
          </button>
        </div>

        {preview && (
          <div className="mt-4 border border-[#D4AF37]/30 bg-black/20 p-4" data-testid="admin-catalogue-import-preview">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-white">
                  {preview.changed_product_count} products · {preview.changed_field_count} specification changes
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
                  {preview.matched_count} SKUs matched · {preview.unchanged_count} unchanged
                </div>
              </div>
              <button
                type="button"
                data-testid="admin-apply-catalogue-import"
                onClick={applyImport}
                disabled={!preview.can_apply || !importReason.trim() || applying}
                className="flex min-h-[42px] items-center gap-2 bg-[#D4AF37] px-5 text-[10px] uppercase tracking-[0.2em] text-black transition hover:bg-[#B5952F] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
              >
                {applying ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}
                {applying ? "Applying…" : "Apply specification updates"}
              </button>
            </div>

            {preview.errors?.length > 0 && (
              <div className="mt-4 border border-red-400/30 bg-red-950/20 p-3" role="alert">
                <div className="text-[10px] uppercase tracking-[0.2em] text-red-300">Correct these workbook errors</div>
                <ul className="mt-2 space-y-1 text-xs text-red-100/80">
                  {preview.errors.map((error, index) => (
                    <li key={`${error.row}-${error.sku}-${index}`}>Row {error.row}{error.sku ? ` · ${error.sku}` : ""}: {error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.items?.length > 0 && (
              <div className="mt-4 max-h-80 overflow-y-auto border border-white/10" data-testid="admin-catalogue-import-changes">
                {preview.items.map((item) => (
                  <div key={item.id} className="border-b border-white/10 p-3 last:border-b-0">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <span className="text-xs font-medium text-[#D4AF37]">{item.sku}</span>
                      <span className="text-xs text-white/70">{item.name}</span>
                      <span className="text-[10px] text-white/30">Excel row {item.row}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {item.changes.map((change) => (
                        <div key={change.field} className="grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-[180px_1fr_24px_1fr] sm:items-center">
                          <span className="text-white/45">{change.field}</span>
                          <span className="break-words text-red-200/70">{change.old || "(blank)"}</span>
                          <span className="hidden text-center text-white/25 sm:block">→</span>
                          <span className="break-words text-emerald-200/85">{change.new}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
