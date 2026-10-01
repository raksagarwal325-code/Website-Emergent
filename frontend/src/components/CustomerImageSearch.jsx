import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Camera, Upload, X, Loader2, MessageCircle } from "lucide-react";
import { api } from "../lib/api";
import { trackWhatsAppClick } from "../lib/analytics";
import { productPath } from "../lib/productUrl";
import { productImageAlt } from "../lib/imageSeo";
import { waImageSearchLink } from "../lib/whatsapp";
import { normalizeImageSearchFile } from "../lib/imageSearchFile";

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

export function waitForPoll(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, milliseconds);
    function done() {
      signal?.removeEventListener("abort", aborted);
      resolve();
    }
    function aborted() {
      clearTimeout(timer);
      const error = new Error("Image search cancelled");
      error.name = "AbortError";
      reject(error);
    }
    if (signal?.aborted) aborted();
    else signal?.addEventListener("abort", aborted, { once: true });
  });
}

export default function CustomerImageSearch({ variant = "catalogue", onOpen, onClose }) {
  const landingTrigger = variant === "landing";
  const menuTrigger = variant === "menu";
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState("Searching our catalogue…");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const trigger = useRef(null);
  const dialog = useRef(null);
  const input = useRef(null);
  const controller = useRef(null);
  const sequence = useRef(0);
  const whatsappLink = waImageSearchLink(whatsappNumber);

  useEffect(() => {
    let active = true;
    const request = typeof api.getSettings === "function" ? api.getSettings() : null;
    request?.then((value) => {
      if (active) setWhatsappNumber(value?.whatsapp_number || "");
    }).catch(() => {});
    return () => { active = false; };
  }, []);

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
    if (typeof onClose === "function") onClose();
  };

  const search = async (selectedFile) => {
    if (!selectedFile) return;
    const attempt = ++sequence.current;
    controller.current?.abort();
    setBusy(false);
    setResult(null);
    setError("");
    const file = normalizeImageSearchFile(selectedFile);
    if (!file) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    setBusy(true);
    setBusyMessage("Searching our catalogue…");
    controller.current = new AbortController();
    try {
      const safePreview = await makeSearchPreview(file);
      if (attempt !== sequence.current) return;
      setPreview(safePreview);
      let response = await api.searchByImage(file, controller.current.signal);
      if (response.search_status === "processing" && response.job_id) {
        setBusyMessage("Checking the full catalogue for the closest designs…");
        for (let poll = 0; poll < 60 && response.search_status === "processing"; poll += 1) {
          await waitForPoll(response.poll_after_ms ?? 1500, controller.current.signal);
          response = await api.getImageSearchJob(response.job_id, controller.current.signal);
        }
        if (response.search_status === "processing") {
          throw new Error("Detailed image search is taking longer than expected. Please try again shortly.");
        }
        if (response.search_status === "failed") {
          throw new Error(response.detail || "Detailed image search could not finish. Please try again.");
        }
      }
      if (attempt === sequence.current) setResult(response);
    } catch (err) {
      if (attempt === sequence.current) {
        const message = err.response?.data?.detail;
        const timedOut = err.code === "ECONNABORTED" || /timeout/i.test(err.message || "");
        setError(typeof message === "string" ? message : timedOut
          ? "Image search took too long to start. Please try the image again."
          : (err.message || "Image search could not finish. Please try again."));
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
    <button
      ref={trigger}
      type="button"
      onClick={() => {
        if (typeof onOpen === "function") onOpen();
        setOpen(true);
      }}
      aria-label="Upload a photo to find exact or similar products"
      title="Upload a photo to find exact or similar products"
      className={menuTrigger
        ? "group relative inline-flex min-h-12 w-full items-center justify-center gap-3 overflow-hidden border border-[#D4AF37]/55 bg-[#D4AF37]/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E6C85C] transition-[background-color,border-color,color] hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
        : landingTrigger
          ? "group relative inline-flex min-h-12 w-full items-center justify-center gap-3 overflow-hidden border border-[#D4AF37] bg-[#D4AF37] px-7 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-black shadow-[0_0_28px_rgba(212,175,55,0.2)] transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#ead06f] hover:shadow-[0_0_34px_rgba(212,175,55,0.32)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] sm:w-auto"
          : "absolute right-1.5 top-1/2 inline-flex h-9 -translate-y-1/2 items-center gap-2 border border-[#D4AF37] bg-[#D4AF37] px-3 text-xs font-semibold uppercase tracking-[0.08em] text-black shadow-[0_0_18px_rgba(212,175,55,0.18)] transition-colors hover:bg-[#ead06f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"}
    >
      {landingTrigger && <span aria-hidden="true" className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[500%]" />}
      <Camera size={landingTrigger ? 18 : menuTrigger ? 17 : 16} aria-hidden="true" className={landingTrigger ? "relative z-10" : undefined} />
      <span className={landingTrigger ? "relative z-10" : undefined}>{landingTrigger ? "Upload a photo" : menuTrigger ? "Search with a photo" : "Upload photo"}</span>
    </button>
    {open && createPortal(
      <div data-customer-image-search-overlay="true" className="fixed inset-0 z-[100] bg-black/80 p-3 sm:p-8 flex items-start justify-center overflow-y-auto" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="image-search-title" onKeyDown={keyDown} className="my-auto w-full max-w-4xl border border-[#D4AF37]/30 bg-[#101010] p-5 sm:p-8 text-white shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><div className="text-[9px] font-medium uppercase tracking-[0.3em] text-[#D4AF37]">Search by photo</div><h2 id="image-search-title" className="mt-2 font-serif text-2xl sm:text-3xl">Upload a photo. We’ll find the closest match.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">Use a product photo, room image or screenshot. Exact matches appear first, followed by similar designs.</p></div>
            <button type="button" onClick={close} aria-label="Close image search" className="p-2 text-white/70 hover:text-white"><X size={22} /></button>
          </div>
          <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); search(e.dataTransfer.files?.[0]); }} className="mt-6 flex flex-wrap items-center gap-4 border border-dashed border-white/25 p-5">
            {preview && <img src={preview} alt="Your search reference" className="h-24 w-24 object-contain bg-white" />}
            <div><button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-2 bg-[#D4AF37] px-5 py-3 text-sm text-black"><Upload size={16} />{preview ? "Choose another photo" : "Choose a photo"}</button><p className="mt-2 text-xs text-white/55">Drag and drop, or choose a photo · JPG, PNG or WebP · Up to 10 MB</p><p className="mt-1 text-xs text-white/55">Tip: crop around one light for a more accurate result. Your photo is deleted automatically after the search.</p></div>
            <input ref={input} hidden type="file" accept="image/*,.jpg,.jpeg,.png,.webp" aria-label="Upload image for product search" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; search(file); }} />
          </div>
          {busy && <p role="status" className="mt-6 flex items-center gap-2 text-sm text-[#D4AF37]"><Loader2 className="animate-spin" size={18} />{busyMessage}</p>}
          {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
          {result && <div aria-live="polite">
            {(!result.index_complete || !result.similarity_available) && <p className="mt-5 text-sm text-white/65">Image search is still preparing some catalogue photos. These results may be incomplete; please try again later.</p>}
            {!result.matches?.length && <p className="mt-6 text-sm leading-relaxed text-white/65">{result.available ? "We couldn’t identify a dependable catalogue match from this photograph." : "Our visual catalogue is still preparing, so these results may be incomplete."}</p>}
            {["exact", "closest", "related", "similar", "possible"].map((type) => {
              const items = (result.matches || []).filter((match) => match.match_type === type);
              if (!items.length) return null;
              return <div key={type} className="mt-7"><h3 className="font-serif text-xl">{type === "exact" ? "Your catalogue match" : type === "closest" ? "The closest expression we found" : type === "related" ? "In the same design language" : type === "similar" ? "Further pieces to consider" : "Possibilities worth exploring"}</h3>{type === "closest" && <p className="mt-1 text-xs leading-relaxed text-white/55">The strongest visual relationship in form and detailing. Please confirm scale, light count and finish.</p>}{type === "related" && <p className="mt-1 text-xs leading-relaxed text-white/55">Curated around the leading design; proportions, glass, light count or finish may vary.</p>}{type === "similar" && <p className="mt-1 text-xs leading-relaxed text-white/55">Selected for a related silhouette or decorative character; individual details may differ.</p>}{type === "possible" && <p className="mt-1 text-sm leading-relaxed text-white/65">The photograph did not allow a confident match. Consider these as starting points, or let our team continue the search.</p>}<div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {items.map(({ product }) => <Link key={product.id} to={productPath(product)} onClick={close} className="group border border-white/10 p-3 hover:border-[#D4AF37]/60"><img src={api.resolveImage(product.images?.[0])} alt={productImageAlt({ name: product.name, category: product.category, sku: product.sku })} loading="lazy" className="h-36 sm:h-48 w-full object-contain" /><p className="mt-3 font-serif text-sm sm:text-base group-hover:text-[#D4AF37]">{product.name}</p><p className="mt-1 text-xs text-white/50">{product.sku}</p><p className="mt-3 text-xs text-[#D4AF37]">View product →</p></Link>)}
              </div></div>;
            })}
            <div className="relative mt-8 overflow-hidden border border-[#D4AF37]/35 bg-[#D4AF37]/[0.055] p-5 sm:p-6">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_10%,rgba(212,175,55,0.13),transparent_38%)]" />
              <div className="relative">
                <div className="text-[9px] font-medium uppercase tracking-[0.28em] text-[#D4AF37]">Still looking?</div>
                <h3 className="mt-2 font-serif text-xl leading-snug text-[#FFF8ED]">{result.matches?.length ? "Not the light you had in mind?" : "No match yet? Let our team take over."}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">Send us the photo on WhatsApp. We’ll compare the shape, glass, finish and proportions, then suggest the closest piece—or discuss making it to order in Firozabad.</p>
                {whatsappLink && <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackWhatsAppClick({ source: "image_search_concierge", page: window.location.pathname })}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 border border-[#D4AF37] bg-[#D4AF37] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#E3C85F]"
                ><MessageCircle size={16} aria-hidden="true" />Let our team help</a>}
                <p className="mt-3 text-[10px] leading-relaxed text-white/42">WhatsApp will open with a prepared message. Attach the same photo and send it.</p>
              </div>
            </div>
          </div>}
        </section>
      </div>, document.body,
    )}
  </>;
}
