import React from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { getProductDimensionData } from "../lib/productDimensions";
import { imgGuardProps, imgGuardStyle, containerGuardProps, containerGuardStyle } from "../lib/imageGuard";

function measurementText(measurement) {
  if (!measurement) return null;
  const primary = measurement.inchText || measurement.sourceText;
  if (!primary) return null;
  return measurement.cmText ? `${primary} / ${measurement.cmText}` : primary;
}

function GalleryDimensionPlate({ product, config, imageSrc }) {
  const heightText = measurementText(config.height);
  const spanText = measurementText(config.span);
  const hasStructuredSize = Boolean(config.height || config.span);

  return (
    <div
      data-testid="dimension-gallery-panel"
      className="absolute inset-0 z-20 overflow-hidden bg-[#12070f] px-5 py-6 sm:px-10 sm:py-10"
      {...containerGuardProps}
      style={{ ...containerGuardStyle }}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(212,175,55,0.08),transparent_38%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-[#D4AF37]/20 pb-4 sm:gap-6 sm:pb-5">
          <div className="min-w-0 max-w-[58%]">
            <div className="text-[8px] uppercase tracking-[0.28em] text-[#D4AF37] sm:text-[9px] sm:tracking-[0.3em]">
              Dimensions & Scale
            </div>
            <div className="mt-2 line-clamp-2 font-serif text-lg leading-tight text-white sm:text-2xl">
              {product.name}
            </div>
            <div className="mt-1 text-[8px] uppercase tracking-[0.18em] text-white/35 sm:text-[9px]">
              {product.category} · {product.sku}
            </div>
          </div>

          <div className="max-w-[42%] text-right">
            <div className="text-[7px] uppercase tracking-[0.22em] text-[#BF9972] sm:text-[8px] sm:tracking-[0.24em]">
              Approx. dimensions
            </div>
            <div className="mt-2 line-clamp-2 font-serif text-sm leading-tight text-white sm:text-xl">
              {config.exactSummary}
            </div>
            {config.metricSummary && (
              <div className="mt-1 text-[8px] tracking-[0.06em] text-white/55 sm:text-[10px] sm:tracking-[0.08em]">
                {config.metricSummary}
              </div>
            )}
          </div>
        </div>

        <div className="relative min-h-0 flex-1 py-4 sm:py-7">
          {imageSrc && (
            <img
              src={imageSrc}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain object-center opacity-90"
              {...imgGuardProps}
              style={imgGuardStyle}
            />
          )}

          {config.height && (
            <div
              className="pointer-events-none absolute bottom-[12%] left-2 top-[10%] w-px bg-[#D4AF37]/80"
              aria-hidden="true"
            >
              <span className="absolute -left-2 top-0 h-px w-4 bg-[#D4AF37]/80" />
              <span className="absolute -left-2 bottom-0 h-px w-4 bg-[#D4AF37]/80" />
              <span className="absolute left-3 top-1/2 hidden -translate-y-1/2 whitespace-nowrap bg-[#12070f]/95 px-2 py-1.5 text-[8px] uppercase tracking-[0.18em] text-[#E5C453] sm:block">
                Overall height · {heightText}
              </span>
            </div>
          )}

          {config.span && (
            <div
              className="pointer-events-none absolute bottom-2 left-[14%] right-[14%] h-px bg-[#D4AF37]/80"
              aria-hidden="true"
            >
              <span className="absolute -top-2 left-0 h-4 w-px bg-[#D4AF37]/80" />
              <span className="absolute -top-2 right-0 h-4 w-px bg-[#D4AF37]/80" />
              <span className="absolute left-1/2 top-2 hidden -translate-x-1/2 whitespace-nowrap bg-[#12070f]/95 px-2 py-1.5 text-[8px] uppercase tracking-[0.18em] text-[#E5C453] sm:block">
                {config.spanLabel} · {spanText}
              </span>
            </div>
          )}
        </div>

        <div
          className={`relative z-10 grid gap-x-4 gap-y-3 border-t border-white/10 pt-4 ${hasStructuredSize ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1"}`}
        >
          {config.height && (
            <div>
              <div className="text-[7px] uppercase tracking-[0.2em] text-[#BF9972] sm:text-[8px] sm:tracking-[0.22em]">
                Overall Height
              </div>
              <div className="mt-1 font-serif text-sm text-white sm:text-lg">{heightText}</div>
              {config.height.humanText && (
                <div className="mt-1 text-[9px] font-medium text-white/65 sm:text-[10px]">
                  ≈ {config.height.humanText} tall
                </div>
              )}
            </div>
          )}

          {config.span && (
            <div>
              <div className="text-[7px] uppercase tracking-[0.2em] text-[#BF9972] sm:text-[8px] sm:tracking-[0.22em]">
                {config.spanLabel}
              </div>
              <div className="mt-1 font-serif text-sm text-white sm:text-lg">{spanText}</div>
              {config.span.humanText && (
                <div className="mt-1 text-[9px] font-medium text-white/65 sm:text-[10px]">
                  ≈ {config.span.humanText} wide
                </div>
              )}
            </div>
          )}

          {config.lights && (
            <div>
              <div className="text-[7px] uppercase tracking-[0.2em] text-[#BF9972] sm:text-[8px] sm:tracking-[0.22em]">
                Lights
              </div>
              <div className="mt-1 font-serif text-sm text-white sm:text-lg">{config.lights}</div>
              <div className="mt-1 text-[8px] text-white/45 sm:text-[9px]">light points</div>
            </div>
          )}

          {config.footprint && (
            <div>
              <div className="text-[7px] uppercase tracking-[0.2em] text-[#BF9972] sm:text-[8px] sm:tracking-[0.22em]">
                Approx. Footprint
              </div>
              <div className="mt-1 font-serif text-sm text-white sm:text-lg">{config.footprint}</div>
              <div className="mt-1 text-[8px] text-white/45 sm:text-[9px]">widest span</div>
            </div>
          )}

          {!hasStructuredSize && config.rawDimensions && (
            <div>
              <div className="text-[7px] uppercase tracking-[0.2em] text-[#BF9972] sm:text-[8px] sm:tracking-[0.22em]">
                Approx. Dimensions
              </div>
              <div className="mt-1 font-serif text-sm text-white sm:text-lg">{config.rawDimensions}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GalleryDimensionThumbnail({ config, active, onSelect }) {
  return (
    <button
      type="button"
      data-testid="thumb-dimensions"
      data-dimension-thumb="true"
      onClick={onSelect}
      aria-label="View dimensions and scale"
      aria-pressed={active}
      className={`aspect-square overflow-hidden border p-2 transition-colors ${active ? "border-[#D4AF37]" : "border-white/10 hover:border-white/30"}`}
    >
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#12070f] px-2 text-center">
        <div className="h-6 w-px bg-[#D4AF37]/60" aria-hidden="true" />
        <div className="mt-2 text-[7px] uppercase tracking-[0.2em] text-[#D4AF37]">Dimensions</div>
        <div className="mt-1 line-clamp-2 font-serif text-[10px] leading-tight text-white sm:text-[11px]">
          {config.exactSummary}
        </div>
        {config.metricSummary && (
          <div className="mt-1 line-clamp-1 text-[7px] tracking-[0.05em] text-white/45">
            {config.metricSummary}
          </div>
        )}
      </div>
    </button>
  );
}

export default function ProductDimensionPilot() {
  const { id } = useParams();
  const [product, setProduct] = React.useState(null);
  const [galleryFrameTarget, setGalleryFrameTarget] = React.useState(null);
  const [thumbnailHost, setThumbnailHost] = React.useState(null);
  const [thumbnailTarget, setThumbnailTarget] = React.useState(null);
  const [imageSrc, setImageSrc] = React.useState("");
  const [dimensionSelected, setDimensionSelected] = React.useState(false);
  const attachedThumbsRef = React.useRef(new WeakSet());

  const config = React.useMemo(
    () => (product ? getProductDimensionData(product) : null),
    [product],
  );

  React.useEffect(() => {
    let cancelled = false;
    setProduct(null);
    setDimensionSelected(false);
    attachedThumbsRef.current = new WeakSet();

    api.getProduct(id)
      .then((nextProduct) => {
        if (!cancelled) setProduct(nextProduct);
      })
      .catch(() => {
        if (!cancelled) setProduct(null);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  React.useEffect(() => {
    const removeHost = () => {
      const existing = document.querySelector('[data-dimension-gallery-host="true"]');
      if (existing) existing.remove();
      setThumbnailHost(null);
      setThumbnailTarget(null);
    };

    if (!config) {
      removeHost();
      setGalleryFrameTarget(null);
      return undefined;
    }

    const scan = () => {
      const image = document.querySelector('[data-testid="product-main-image"]');
      const firstThumb = document.querySelector('[data-testid="thumb-0"]');
      const thumbnailContainer = firstThumb?.parentElement || null;

      setGalleryFrameTarget(image?.parentElement || null);
      setThumbnailTarget(thumbnailContainer);
      setImageSrc(firstThumb?.querySelector("img")?.src || image?.src || "");

      if (thumbnailContainer) {
        let host = thumbnailContainer.querySelector('[data-dimension-gallery-host="true"]');
        if (!host) {
          host = document.createElement("div");
          host.dataset.dimensionGalleryHost = "true";
          host.style.display = "contents";
          const realChildren = Array.from(thumbnailContainer.children).filter(
            (child) => child !== host && child.dataset?.dimensionGalleryHost !== "true",
          );
          thumbnailContainer.insertBefore(host, realChildren[2] || null);
        }
        setThumbnailHost(host);
      }

      document.querySelectorAll('button[data-testid^="thumb-"]:not([data-dimension-thumb])').forEach((button) => {
        if (attachedThumbsRef.current.has(button)) return;
        attachedThumbsRef.current.add(button);
        button.addEventListener("click", () => setDimensionSelected(false));
      });
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    return () => {
      observer.disconnect();
      const existing = document.querySelector('[data-dimension-gallery-host="true"]');
      if (existing) existing.remove();
    };
  }, [config, id]);

  React.useEffect(() => {
    const image = galleryFrameTarget?.querySelector('[data-testid="product-main-image"]');
    if (!image) return undefined;
    image.style.visibility = dimensionSelected ? "hidden" : "visible";
    return () => {
      image.style.visibility = "visible";
    };
  }, [dimensionSelected, galleryFrameTarget]);

  React.useEffect(() => {
    if (!thumbnailTarget) return undefined;
    const realThumbs = thumbnailTarget.querySelectorAll('button[data-testid^="thumb-"]:not([data-dimension-thumb])');
    realThumbs.forEach((button) => {
      if (dimensionSelected) {
        button.style.borderColor = "rgba(255,255,255,0.10)";
      } else {
        button.style.removeProperty("border-color");
      }
    });
    return () => {
      realThumbs.forEach((button) => button.style.removeProperty("border-color"));
    };
  }, [dimensionSelected, thumbnailTarget]);

  if (!product || !config) return null;

  return (
    <>
      {thumbnailHost
        ? createPortal(
            <GalleryDimensionThumbnail
              config={config}
              active={dimensionSelected}
              onSelect={() => setDimensionSelected(true)}
            />,
            thumbnailHost,
          )
        : null}

      {dimensionSelected && galleryFrameTarget
        ? createPortal(
            <GalleryDimensionPlate product={product} config={config} imageSrc={imageSrc} />,
            galleryFrameTarget,
          )
        : null}
    </>
  );
}
