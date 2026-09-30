import React, { useEffect, useState } from "react";
import { Camera, Sparkles, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import CustomerImageSearch from "./CustomerImageSearch";

const DISCOVERY_KEY = "sge-image-search-discovery-dismissed";

function hasSeenImageSearch(key) {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch (_) {
    return false;
  }
}

function rememberImageSearch(key) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch (_) {
    // The prompt can still be dismissed when session storage is blocked.
  }
}

export default function ImageSearchDiscoveryPrompt() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const storageKey = `${DISCOVERY_KEY}:${pathname || "/"}`;
  const excluded = pathname.startsWith("/admin") || pathname.startsWith("/catalogue");

  useEffect(() => {
    setVisible(false);
    if (excluded || hasSeenImageSearch(storageKey)) return undefined;

    let frame = null;
    let footerObserver = null;
    const reveal = () => setVisible(true);
    const checkPosition = () => {
      frame = null;
      const pageHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      if (pageHeight - viewportHeight < 400) return;
      const progress = (window.scrollY + viewportHeight) / pageHeight;
      const catalogueBrowseDepth = pathname === "/catalog" && window.scrollY >= 1800;
      if (progress >= 0.78 || catalogueBrowseDepth) reveal();
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(checkPosition);
    };

    const footer = document.querySelector("footer");
    if (footer && "IntersectionObserver" in window) {
      footerObserver = new window.IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) reveal();
        },
        { rootMargin: "500px 0px" },
      );
      footerObserver.observe(footer);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    checkPosition();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      footerObserver?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [excluded, pathname, storageKey]);

  if (!visible || excluded) return null;

  const dismiss = () => {
    rememberImageSearch(storageKey);
    setVisible(false);
  };

  return (
    <aside
      role="dialog"
      aria-label="Search for a product using a photo"
      data-testid="image-search-discovery-prompt"
      className="fixed bottom-20 left-3 right-3 z-40 overflow-hidden border border-[#D4AF37]/35 bg-[#140910]/[0.98] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.62)] backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-auto sm:w-[410px] sm:p-6"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_4%_0%,rgba(212,175,55,0.18),transparent_42%)]" />
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss photo search suggestion"
        className="absolute right-3 top-3 z-10 p-2 text-white/45 transition-colors hover:text-white"
      >
        <X size={18} />
      </button>

      <div className="relative pr-7">
        <div className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.28em] text-[#D4AF37]">
          <Sparkles size={13} aria-hidden="true" />
          Already have a design in mind?
        </div>
        <h2 className="mt-3 font-serif text-2xl leading-tight text-[#FFF8ED]">Seen a light you love?</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/62">
          Upload the photo and we’ll help you find the same design—or the closest match in our collection.
        </p>

        <div className="mt-5">
          <CustomerImageSearch variant="landing" onClose={dismiss} />
        </div>

        <div className="mt-3 flex items-center gap-2 text-[10px] leading-relaxed text-white/42">
          <Camera size={13} aria-hidden="true" className="shrink-0 text-[#D4AF37]" />
          Use a screenshot, room photo or saved image.
        </div>
      </div>
    </aside>
  );
}
