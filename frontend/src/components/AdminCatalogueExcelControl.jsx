import React, { useState } from "react";
import { Download, FileSpreadsheet, LoaderCircle } from "lucide-react";
import { API } from "../lib/api";
import { toast } from "sonner";

const fallbackFilename = () => {
  const day = new Date().toISOString().slice(0, 10);
  return `samrat-glass-full-product-catalogue-${day}.xlsx`;
};

const filenameFromDisposition = (header) => {
  const match = /filename\*?=(?:UTF-8''|\")?([^\";]+)/i.exec(header || "");
  return match ? decodeURIComponent(match[1].replace(/^\"|\"$/g, "").trim()) : fallbackFilename();
};

export default function AdminCatalogueExcelControl() {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(`${API}/admin/catalogue/products.xlsx`, {
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
      anchor.download = filenameFromDisposition(response.headers.get("Content-Disposition"));
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);

      const count = response.headers.get("X-Catalogue-Products");
      const images = response.headers.get("X-Catalogue-Embedded-Images");
      toast.success(
        count
          ? `Excel catalogue downloaded — ${count} products${images ? `, ${images} images embedded` : ""}`
          : "Excel catalogue downloaded"
      );
    } catch (error) {
      toast.error(error?.message || "Excel export failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed left-4 bottom-4 z-[70] sm:left-6 sm:bottom-6">
      <button
        type="button"
        data-testid="admin-download-catalogue-excel"
        onClick={download}
        disabled={downloading}
        className="group flex items-center gap-3 border border-[#D4AF37]/60 bg-[#0d0d0d]/95 px-4 py-3 text-left shadow-2xl backdrop-blur transition hover:border-[#D4AF37] disabled:cursor-wait disabled:opacity-70"
        title="Download the complete admin product catalogue as Excel with embedded primary images"
      >
        <span className="flex h-9 w-9 items-center justify-center bg-[#D4AF37] text-black">
          {downloading ? <LoaderCircle size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
        </span>
        <span>
          <span className="block text-[10px] uppercase tracking-[0.24em] text-white/45">Admin catalogue</span>
          <span className="mt-0.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-white">
            {downloading ? "Preparing Excel…" : "Download Excel"}
            {!downloading && <Download size={13} className="text-[#D4AF37]" />}
          </span>
          <span className="mt-0.5 hidden text-[10px] text-white/45 sm:block">All products · specs · tags · images</span>
        </span>
      </button>
    </div>
  );
}
