import React, { useEffect, useState } from "react";
import AdminHomepageBase from "./AdminHomepageBase";
import AdminProjectGallery from "./AdminProjectGallery";

export default function AdminHomepage() {
  const [mode, setMode] = useState(() => window.location.hash === "#project-gallery" ? "projects" : "homepage");

  useEffect(() => {
    const syncFromHash = () => setMode(window.location.hash === "#project-gallery" ? "projects" : "homepage");
    window.addEventListener("hashchange", syncFromHash);
    syncFromHash();
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <div>
      <style>{`\n        .admin-homepage-without-projects [data-testid=\"hp-section-gallery\"] { display: none; }\n        body.project-gallery-admin-mode [data-testid=\"admin-tab-homepage\"] { border-bottom-color: transparent !important; color: rgba(255,255,255,.6) !important; }\n      `}</style>

      {mode === "projects" ? (
        <ProjectGalleryMode />
      ) : (
        <div className="admin-homepage-without-projects">
          <AdminHomepageBase />
        </div>
      )}
    </div>
  );
}

function ProjectGalleryMode() {
  useEffect(() => {
    document.body.classList.add("project-gallery-admin-mode");
    return () => document.body.classList.remove("project-gallery-admin-mode");
  }, []);

  return <AdminProjectGallery />;
}
