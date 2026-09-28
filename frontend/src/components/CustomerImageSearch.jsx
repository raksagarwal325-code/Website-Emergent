import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { productPath } from "../lib/productUrl";

// Decode and re-encode uploaded pixels. Never use uploaded bytes or a blob URL
// directly as the DOM image source (including files with a spoofed MIME type).
export async function makeSearchPreview(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}

export default function CustomerImageSearch() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const trigger = useRef(null);
  const dialog = useRef(null);
  const input = useRef(null);
  const controller = useRef(null);
  const sequence = useRef(0);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector("button")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      trigger.current?.focus();
    };
  }, [open]);

  const close = () => {
    sequence.current += 1;
    controller.current?.abort();
    setBusy(false);
    setOpen(false);
  };

  const search = async (file) => {
    if (!file) return;
    const attempt = ++sequence.current;
    controller.current?.abort();
    setBusy(false);
    setResult(null);
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    setBusy(true);
    controller.current = new AbortController();
    try {
      const safePreview = await makeSearchPreview(file);
      if (attempt !== sequence.current) return;
      setPreview(safePreview);
      const response = await api.searchByImage(file, controller.current.signal);
      if (attempt === sequence.current) setResult(response);
    } catch (err) {
      if (attempt === sequence.current) {
        const message = err.response?.data?.detail;
        setError(typeof message === "string" ? message : "Image search could not finish. Please try again.");
      }
    } finally {
      if (attempt === sequence.current) setBusy(false);
    }
  };

  const keyDown = (event) => {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key !== "Tab") return;
    const focusable = [...dialog.current.querySelectorAll('button, a[href], input:not([hidden]), [tabindex="0"]')].filter((node) => !node.disabled);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return <>
    <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-label="Search by image" title="Search by image" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#D4AF37] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]">
      <Camera size={20} aria-hidden="true" />
    </button>
    {open && createPortal(
      <div className="fixed inset-0 z-[100] bg-black/80 p-3 sm:p-8 flex items-start justify-center overflow-y-auto" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="image-search-title" onKeyDown={keyDown} className="my-auto w-full max-w-4xl border border-[#D4AF37]/30 bg-[#101010] p-5 sm:p-8 text-white shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><h2 id="image-search-title" className="font-serif text-2xl sm:text-3xl">Find your light</h2><p className="mt-2 text-sm text-white/65">Upload a product photo or screenshot to find a match or explore similar designs.</p></div>
            <button type="button" onClick={close} aria-label="Close image search" className="p-2 text-white/70 hover:text-white"><X size={22} /></button>
          </div>
          <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); search(e.dataTransfer.files?.[0]); }} className="mt-6 flex flex-wrap items-center gap-4 border border-dashed border-white/25 p-5">
            {preview && <img src={preview} alt="Your search reference" className="h-24 w-24 object-contain bg-white" />}
            <div><button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-2 bg-[#D4AF37] px-5 py-3 text-sm text-black"><Upload size={16} />{preview ? "Choose another image" : "Upload an image"}</button><p className="mt-2 text-xs text-white/55">Or drop it here · JPG, PNG, WebP · Up to 10 MB</p><p className="mt-1 text-xs text-white/55">For best results, crop around one light. Your upload is not saved.</p></div>
            <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload image for product search" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; search(file); }} />
          </div>
          {busy && <p role="status" className="mt-6 flex items-center gap-2 text-sm text-[#D4AF37]"><Loader2 className="animate-spin" size={18} />Searching our catalogue…</p>}
          {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
          {result && <div aria-live="polite">
            {(!result.index_complete || !result.similarity_available) && <p className="mt-5 text-sm text-white/65">Image search is still preparing some catalogue photos. These results may be incomplete; please try again later.</p>}
            {!result.matches?.length && <p className="mt-5 text-sm">{result.available ? "No close match found. Try a clearer photo cropped around the light, or search by name." : "Image search is getting ready. Please use the text search for now."}</p>}
            {["exact", "similar"].map((type) => {
              const items = (result.matches || []).filter((match) => match.match_type === type);
              if (!items.length) return null;
              return <div key={type} className="mt-7"><h3 className="font-serif text-xl">{type === "exact" ? "Matching products" : "Similar designs"}</h3>{type === "similar" && <p className="mt-1 text-xs text-white/55">Visual suggestions; details and proportions may differ.</p>}<div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {items.map(({ product }) => <Link key={product.id} to={productPath(product)} onClick={close} className="group border border-white/10 p-3 hover:border-[#D4AF37]/60"><img src={api.resolveImage(product.images?.[0])} alt={product.name} loading="lazy" className="h-36 sm:h-48 w-full object-contain" /><p className="mt-3 font-serif text-sm sm:text-base group-hover:text-[#D4AF37]">{product.name}</p><p className="mt-1 text-xs text-white/50">{product.sku}</p><p className="mt-3 text-xs text-[#D4AF37]">View product →</p></Link>)}
              </div></div>;
            })}
          </div>}
        </section>
      </div>, document.body,
    )}
  </>;
}
