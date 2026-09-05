import React from "react";
import { createPortal } from "react-dom";

const PILOTS = {
  "SGE-CH-011": {
    mode: "overlay",
    height: '72"',
    width: '60"',
    lights: "24",
    label: "Noorjahan Grand",
  },
  "SGE-CH-033": {
    mode: "gallery",
    height: '56"',
    width: '52"',
    lights: "24",
    label: "Gajmahal",
  },
};

function readCurrentSku() {
  const text = document.querySelector('[data-testid="product-reference-code"]')?.textContent || "";
  const match = text.match(/SGE-[A-Z]+-\d+/i);
  return match?.[0]?.toUpperCase() || null;
}

function DimensionLine({ axis, value, label }) {
  if (axis === "vertical") {
    return (
      <div className="pointer-events-none absolute left-3 top-[16%] bottom-[16%] z-30 hidden sm:flex items-center" aria-hidden="true">
        <div className="relative h-full w-px bg-[#D4AF37]/72">
          <span className="absolute -left-1.5 top-0 h-px w-3 bg-[#D4AF37]/72" />
          <span className="absolute -left-1.5 bottom-0 h-px w-3 bg-[#D4AF37]/72" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black/70 px-2 py-1 text-[9px] uppercase tracking-[0.22em] text-[#E5C453] backdrop-blur-sm">
            {label} · {value}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute bottom-3 left-[18%] right-[18%] z-30 hidden sm:block" aria-hidden="true">
      <div className="relative h-px bg-[#D4AF37]/72">
        <span className="absolute -top-1.5 left-0 h-3 w-px bg-[#D4AF37]/72" />
        <span className="absolute -top-1.5 right-0 h-3 w-px bg-[#D4AF37]/72" />
        <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap bg-black/70 px-2 py-1 text-[9px] uppercase tracking-[0.22em] text-[#E5C453] backdrop-blur-sm">
          {label} · {value}
        </span>
      </div>
    </div>
  );
}

function OverlayPilot({ config }) {
  return (
    <>
      <DimensionLine axis="vertical" label="Approx. height" value={config.height} />
      <DimensionLine axis="horizontal" label="Approx. width" value={config.width} />
      <div className="pointer-events-none absolute bottom-3 right-3 z-30 border border-[#D4AF37]/35 bg-[#10070d]/88 px-3 py-2 text-right backdrop-blur-md sm:bottom-12" data-testid="dimension-overlay-pilot">
        <div className="text-[8px] uppercase tracking-[0.24em] text-[#BF9972]">Dimensions at a glance</div>
        <div className="mt-1 font-serif text-sm text-white">{config.height} H × {config.width} W</div>
        <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-white/55">{config.lights} lights · approx.</div>
      </div>
    </>
  );
}

function GalleryDimensionPlate({ config, imageSrc }) {
  return (
    <div
      data-testid="dimension-gallery-pilot"
      className="absolute inset-0 z-20 overflow-hidden bg-[#12070f] px-6 py-7 sm:px-10 sm:py-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(212,175,55,0.08),transparent_38%)]" aria-hidden="true" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-5 border-b border-[#D4AF37]/20 pb-5">
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-[#D4AF37]">Dimensions & Scale</div>
            <div className="mt-2 font-serif text-2xl leading-tight text-white sm:text-3xl">{config.label}</div>
          </div>
          <div className="text-right">
            <div className="text-[8px] uppercase tracking-[0.24em] text-[#BF9972]">Approx. dimensions</div>
            <div className="mt-2 font-serif text-lg text-white sm:text-xl">{config.height} H × {config.width} W</div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 py-5 sm:py-7">
          {imageSrc && (
            <img
              src={imageSrc}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain object-center opacity-90"
            />
          )}

          <div className="pointer-events-none absolute bottom-[12%] left-2 top-[10%] w-px bg-[#D4AF37]/65" aria-hidden="true">
            <span className="absolute -left-1.5 top-0 h-px w-3 bg-[#D4AF37]/65" />
            <span className="absolute -left-1.5 bottom-0 h-px w-3 bg-[#D4AF37]/65" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#12070f]/90 px-2 py-1 text-[8px] uppercase tracking-[0.2em] text-[#E5C453]">
              Height · {config.height}
            </span>
          </div>

          <div className="pointer-events-none absolute bottom-2 left-[14%] right-[14%] h-px bg-[#D4AF37]/65" aria-hidden="true">
            <span className="absolute -top-1.5 left-0 h-3 w-px bg-[#D4AF37]/65" />
            <span className="absolute -top-1.5 right-0 h-3 w-px bg-[#D4AF37]/65" />
            <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap bg-[#12070f]/90 px-2 py-1 text-[8px] uppercase tracking-[0.2em] text-[#E5C453]">
              Width · {config.width}
            </span>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
          <div>
            <div className="text-[8px] uppercase tracking-[0.24em] text-[#BF9972]">Height</div>
            <div className="mt-1 font-serif text-lg text-white">{config.height}</div>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-[0.24em] text-[#BF9972]">Width</div>
            <div className="mt-1 font-serif text-lg text-white">{config.width}</div>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-[0.24em] text-[#BF9972]">Lights</div>
            <div className="mt-1 font-serif text-lg text-white">{config.lights}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GalleryDimensionThumbnail({ config, active, onSelect }) {
  return (
    <button
      type="button"
      data-testid="thumb-2"
      data-dimension-thumb="true"
      onClick={onSelect}
      aria-label="View dimensions and scale"
      className={`aspect-square overflow-hidden border p-2 transition-colors ${active ? "border-[#D4AF37]" : "border-white/10 hover:border-white/30"}`}
    >
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#12070f] px-2 text-center">
        <div className="h-6 w-px bg-[#D4AF37]/60" aria-hidden="true" />
        <div className="mt-2 text-[7px] uppercase tracking-[0.2em] text-[#D4AF37]">Dimensions</div>
        <div className="mt-1 font-serif text-[11px] leading-tight text-white">{config.height} × {config.width}</div>
        <div className="mt-1 text-[7px] uppercase tracking-[0.16em] text-white/45">Scale</div>
      </div>
    </button>
  );
}

export default function ProductDimensionPilot() {
  const [sku, setSku] = React.useState(null);
  const [overlayTarget, setOverlayTarget] = React.useState(null);
  const [galleryFrameTarget, setGalleryFrameTarget] = React.useState(null);
  const [thumbnailTarget, setThumbnailTarget] = React.useState(null);
  const [imageSrc, setImageSrc] = React.useState("");
  const [dimensionSelected, setDimensionSelected] = React.useState(false);
  const attachedThumbsRef = React.useRef(new WeakSet());

  React.useEffect(() => {
    const scan = () => {
      const nextSku = readCurrentSku();
      setSku(nextSku);

      const config = nextSku ? PILOTS[nextSku] : null;
      const image = document.querySelector('[data-testid="product-main-image"]');

      if (config?.mode === "overlay") {
        setOverlayTarget(image?.parentElement || null);
      } else {
        setOverlayTarget(null);
      }

      if (config?.mode === "gallery") {
        const firstThumb = document.querySelector('[data-testid="thumb-0"]');
        const firstThumbImage = firstThumb?.querySelector("img");
        setGalleryFrameTarget(image?.parentElement || null);
        setThumbnailTarget(firstThumb?.parentElement || null);
        setImageSrc(firstThumbImage?.src || image?.src || "");

        document.querySelectorAll('button[data-testid^="thumb-"]:not([data-dimension-thumb])').forEach((button) => {
          if (attachedThumbsRef.current.has(button)) return;
          attachedThumbsRef.current.add(button);
          button.addEventListener("click", () => setDimensionSelected(false));
        });
      } else {
        setGalleryFrameTarget(null);
        setThumbnailTarget(null);
        setDimensionSelected(false);
      }
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const image = galleryFrameTarget?.querySelector('[data-testid="product-main-image"]');
    if (!image) return undefined;
    image.style.visibility = dimensionSelected ? "hidden" : "visible";
    return () => {
      image.style.visibility = "visible";
    };
  }, [dimensionSelected, galleryFrameTarget]);

  const config = sku ? PILOTS[sku] : null;
  if (!config) return null;

  return (
    <>
      {config.mode === "overlay" && overlayTarget
        ? createPortal(<OverlayPilot config={config} />, overlayTarget)
        : null}

      {config.mode === "gallery" && thumbnailTarget
        ? createPortal(
            <GalleryDimensionThumbnail
              config={config}
              active={dimensionSelected}
              onSelect={() => setDimensionSelected(true)}
            />,
            thumbnailTarget,
          )
        : null}

      {config.mode === "gallery" && dimensionSelected && galleryFrameTarget
        ? createPortal(<GalleryDimensionPlate config={config} imageSrc={imageSrc} />, galleryFrameTarget)
        : null}
    </>
  );
}
