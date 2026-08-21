import React from "react";
import AdminHomepageBase from "./AdminHomepageBase";

export default function AdminHomepage() {
  return (
    <div className="admin-homepage-without-projects">
      <style>{`\n        .admin-homepage-without-projects [data-testid=\"hp-section-gallery\"] { display: none; }\n      `}</style>
      <AdminHomepageBase />
    </div>
  );
}
