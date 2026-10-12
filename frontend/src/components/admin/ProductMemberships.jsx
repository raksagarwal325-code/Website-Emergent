import React from "react";

export default function ProductMemberships({ productId, memberships }) {
  if (!memberships) return <span className="block text-xs text-white/40 mt-2">Assignments unavailable</span>;
  const { collections = [], families = [] } = memberships.get(productId) || {};
  return <span data-testid={`product-memberships-${productId}`} className="block mt-2 space-y-1 text-xs leading-relaxed">
    <span className={collections.length ? "block text-[#D4AF37]" : "block text-white/40"}>Collection: {collections.join(", ") || "Not assigned"}</span>
    <span className={families.length ? "block text-[#BF9972]" : "block text-white/40"}>Variant family: {families.join(", ") || "Not assigned"}</span>
  </span>;
}
