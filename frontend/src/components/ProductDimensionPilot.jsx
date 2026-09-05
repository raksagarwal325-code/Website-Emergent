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
    mode: "section",
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

function SectionPilot({ config, imageSrc }) {
  return (
    <section data-testid="dimension-section-pilot" className="mt-12 md:mt-16 border-y border-[#D4AF37]/20 bg-[#140911]/65 py-8 md:py-12">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-center">
        <div className="md:col-span-7">
          <div className="eyebrow mb-3 text-[#D4AF37]">Dimensions & Scale</div>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight">A clearer sense of proportion.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60">
            Approximate dimensions are shown for scale reference. As each piece is handcrafted, minor variations may occur.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            <div className="border-t border-white/15 pt-4">
              <div className="text-[9px] uppercase tracking-[0.24em] text-[#BF9972]">Height</div>
              <div className="mt-2 font-serif text-2xl text-white">{config.height}</div>
            </div>
            <div className="border-t border-white/15 pt-4">
              <div className="text-[9px] uppercase tracking-[0.24em] text-[#BF9972]">Width</div>
              <div className="mt-2 font-serif text-2xl text-white">{config.width}</div>
            </div>
            <div className="border-t border-white/15 pt-4">
              <div className="text-[9px] uppercase tracking-[0.24em] text-[#BF9972]">Lights</div>
              <div className="mt-2 font-serif text-2xl text-white">{config.lights}</div>
            </div>
          </div>
        </div>

        <div className="md:col-span-5">
          <div className="relative aspect-[4/5] overflow-hidden border border-white/10 bg-black/55 p-8">
            {imageSrc && (
              <img src={imageSrc} alt="" aria-hidden="true" className="h-full w-full object-contain object-center opacity-85" />
            )}
            <div className="pointer-events-none absolute inset-y-[12%] left-4 w-px bg-[#D4AF37]/60" aria-hidden="true">
              <span className="absolute -left-1.5 top-0 h-px w-3 bg-[#D4AF37]/60" />
              <span className="absolute -left-1.5 bottom-0 h-px w-3 bg-[#D4AF37]/60" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black/70 px-2 py-1 text-[8px] uppercase tracking-[0.2em] text-[#E5C453]">{config.height}</span>
            </div>
            <div className="pointer-events-none absolute bottom-4 left-[16%] right-[16%] h-px bg-[#D4AF37]/60" aria-hidden="true">
              <span className="absolute -top-1.5 left-0 h-3 w-px bg-[#D4AF37]/60" />
              <span className="absolute -top-1.5 right-0 h-3 w-px bg-[#D4AF37]/60" />
              <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap bg-black/70 px-2 py-1 text-[8px] uppercase tracking-[0.2em] text-[#E5C453]">{config.width}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ProductDimensionPilot() {
  const [sku, setSku] = React.useState(null);
  const [overlayTarget, setOverlayTarget] = React.useState(null);
  const [sectionTarget, setSectionTarget] = React.useState(null);
  const [imageSrc, setImageSrc] = React.useState("");

  React.useEffect(() => {
    let sectionMount = null;

    const scan = () => {
      const nextSku = readCurrentSku();
      setSku(nextSku);

      const config = nextSku ? PILOTS[nextSku] : null;
      const image = document.querySelector('[data-testid="product-main-image"]');
      setImageSrc(image?.src || "");

      if (config?.mode === "overlay") {
        setOverlayTarget(image?.parentElement || null);
      } else {
        setOverlayTarget(null);
      }

      if (config?.mode === "section") {
        const handcrafted = document.querySelector('[data-testid="handcrafted-note"]');
        if (handcrafted?.parentElement) {
          sectionMount = document.getElementById("product-dimension-pilot-section-mount");
          if (!sectionMount) {
            sectionMount = document.createElement("div");
            sectionMount.id = "product-dimension-pilot-section-mount";
            handcrafted.parentElement.insertBefore(sectionMount, handcrafted);
          }
          setSectionTarget(sectionMount);
        }
      } else {
        setSectionTarget(null);
        document.getElementById("product-dimension-pilot-section-mount")?.remove();
      }
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });

    return () => {
      observer.disconnect();
      document.getElementById("product-dimension-pilot-section-mount")?.remove();
    };
  }, []);

  const config = sku ? PILOTS[sku] : null;
  if (!config) return null;

  return (
    <>
      {config.mode === "overlay" && overlayTarget ? createPortal(<OverlayPilot config={config} />, overlayTarget) : null}
      {config.mode === "section" && sectionTarget ? createPortal(<SectionPilot config={config} imageSrc={imageSrc} />, sectionTarget) : null}
    </>
  );
}
