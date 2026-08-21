import React from "react";
import AdminHomepageBase from "./AdminHomepageBase";
import AdminProjectCaseStudies from "./AdminProjectCaseStudies";

export default function AdminHomepage() {
  return (
    <div className="space-y-8">
      <AdminHomepageBase />
      <AdminProjectCaseStudies />
    </div>
  );
}
