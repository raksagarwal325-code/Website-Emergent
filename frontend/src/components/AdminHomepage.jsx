import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Images } from "lucide-react";
import AdminHomepageBase from "./AdminHomepageBase";
import AdminProjectGallery from "./AdminProjectGallery";

export default function AdminHomepage() {
  const [mode, setMode] = useState("homepage");
  const [tabHost, setTabHost] = useState(null);
  const hostRef = useRef(null);

  useEffect(() => {
    const homepageButton = document.querySelector('[data-testid="admin-tab-homepage"]');
    const nav = homepageButton?.parentElement;
    if (!homepageButton || !nav) return undefined;

    const host = document.createElement("span");
    host.setAttribute("data-project-gallery-tab-host", "true");
    homepageButton.insertAdjacentElement("afterend", host);
    hostRef.current = host;
    setTabHost(host);

    const nativeTabs = Array.from(nav.querySelectorAll('button[data-testid^="admin-tab-"]'));
    const leaveProjectMode = () => setMode("homepage");
    nativeTabs.forEach((button) => button.addEventListener("click", leaveProjectMode));

    return () => {
      nativeTabs.forEach((button) => button.removeEventListener("click", leaveProjectMode));
      if (host.parentNode) host.parentNode.removeChild(host);
      hostRef.current = null;
      document.body.classList.remove("project-gallery-admin-mode");
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("project-gallery-admin-mode", mode === "projects");
    return () => document.body.classList.remove("project-gallery-admin-mode");
  }, [mode]);

  const openProjects = () => {
    const homepageButton = document.querySelector('[data-testid="admin-tab-homepage"]');
    if (homepageButton) homepageButton.click();
    window.setTimeout(() => setMode("projects"), 0);
  };

  return (
    <div>
      <style>{`\n        .admin-homepage-without-projects [data-testid=\"hp-section-gallery\"] { display: none; }\n        body.project-gallery-admin-mode [data-testid=\"admin-tab-homepage\"] { border-bottom-color: transparent !important; color: rgba(255,255,255,.6) !important; }\n      `}</style>

      {tabHost && createPortal(
        <button
          type="button"
          data-testid="admin-tab-project-gallery"
          onClick={openProjects}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-[0.24em] border-b-2 transition-colors ${mode === "projects" ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-white/60 hover:text-white"}`}
        >
          <Images size={14} /> Project Gallery
        </button>,
        tabHost
      )}

      {mode === "projects" ? (
        <AdminProjectGallery />
      ) : (
        <div className="admin-homepage-without-projects">
          <AdminHomepageBase />
        </div>
      )}
    </div>
  );
}
