import React from "react";
import { Link } from "react-router-dom";
import { BRAND_ORIGIN } from "../lib/brandOrigin";

export default function CraftOriginLink({ label = BRAND_ORIGIN, className = "" }) {
  return <Link to="/craft" className={`inline-flex flex-col gap-1 text-[#D4AF37] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${className}`}>
    <span className="text-[11px] uppercase tracking-[0.16em] leading-relaxed">{label}</span>
    <span className="text-xs text-white/60 underline underline-offset-4">See our workshop &amp; craftsmanship</span>
  </Link>;
}
