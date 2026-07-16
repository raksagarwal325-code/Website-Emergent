import React from "react";
import { Link } from "react-router-dom";
import { Home, ShoppingBag, MessageCircle } from "lucide-react";
import SEO from "../components/SEO";
import { useSettings } from "../context/SettingsContext";

export default function NotFound() {
  const { settings } = useSettings();
  const waNumber = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waLink = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent("Hello, I landed on a page that couldn't be found — can you help?")}`
    : null;

  return (
    <div data-testid="page-not-found" className="max-w-3xl mx-auto px-6 py-24 text-center">
      <SEO
        title="Page not found · Samrat Glass Emporium"
        description="The page you're looking for doesn't exist. Browse our catalogue or reach us on WhatsApp."
        path="/404"
      />
      <div className="eyebrow mb-6">Error · 404</div>
      <h1
        data-testid="notfound-title"
        className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-tight"
      >
        Page not found
      </h1>
      <p className="mt-6 text-white/60 max-w-xl mx-auto leading-relaxed">
        The link you followed may be broken, or the page may have been moved.
        Head back to the home page, browse the catalogue, or send us a message —
        we'll help you find what you were looking for.
      </p>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          data-testid="notfound-home-btn"
          className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] transition-colors"
        >
          <Home size={14} /> Home
        </Link>
        <Link
          to="/catalog"
          data-testid="notfound-catalog-btn"
          className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.28em]"
        >
          <ShoppingBag size={14} /> Browse Catalogue
        </Link>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            data-testid="notfound-whatsapp-btn"
            className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.28em]"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
