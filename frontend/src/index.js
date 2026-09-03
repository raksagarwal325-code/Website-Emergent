import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import "@/liveImageFallback.css";
import App from "@/App";

// Responsive WebP variants are an optimisation, not a hard dependency.
// If a variant request fails on the live site, retry the exact original
// uploaded product image instead of leaving a browser broken-image icon.
const restoreOriginalProductImage = (event) => {
  const img = event.target;
  if (!img || img.tagName !== "IMG" || img.dataset?.variantFallbackApplied === "true") return;

  try {
    const failed = new URL(img.currentSrc || img.src, window.location.href);
    const match = failed.pathname.match(/^\/api\/image-variant\/(?:320|640|960|1280)\/(.+)$/);
    if (!match) return;

    img.dataset.variantFallbackApplied = "true";
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    img.src = `${failed.origin}/api/files/${match[1]}`;
  } catch (_) {
    // Leave non-variant image errors to the component's normal fallback.
  }
};

document.addEventListener("error", restoreOriginalProductImage, true);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
