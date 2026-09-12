import React, { useState } from "react";
import { Activity, Download, FileSpreadsheet, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { API } from "../lib/api";
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

export default function AdminCatalogueExcelControl() {
  const [downloading, setDownloading] = useState(false);
  const [category, setCategory] = useState("Chandelier");

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

  return (
    <div className="fixed left-4 bottom-4 z-[70] w-[280px] sm:left-6 sm:bottom-6">
      <div className="border border-[#D4AF37]/60 bg-[#0d0d0d]/95 p-3 shadow-2xl backdrop-blur">
        <Link
          to="/admin/health"
          data-testid="admin-website-health-link"
          className="mb-3 flex items-center justify-between border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/65 transition hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
        >
          Website Health
          <Activity size={14} />
        </Link>

        <label htmlFor="admin-catalogue-category" className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-white/45">
          Export category
        </label>
        <select
          id="admin-catalogue-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={downloading}
          className="mb-3 w-full border border-white/20 bg-[#171717] px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37] disabled:cursor-wait disabled:opacity-70"
        >
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
          <option value="">Full catalogue — all products</option>
        </select>

        <button
          type="button"
          data-testid="admin-download-catalogue-excel"
          onClick={download}
          disabled={downloading}
          className="group flex w-full items-center gap-3 text-left transition disabled:cursor-wait disabled:opacity-70"
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
    </div>
  );
}
