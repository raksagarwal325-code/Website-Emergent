import React, { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { LEGAL_PAGES, LEGAL_ORDER } from "../lib/legalContent";

const formatDate = () =>
  new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function Section({ section }) {
  return (
    <section className="mb-10">
      {section.heading && (
        <h2 className="font-serif text-xl md:text-2xl text-white mb-4 brand-gradient-text">{section.heading}</h2>
      )}
      {section.text && <p className="text-white/70 leading-relaxed">{section.text}</p>}
      {section.bullets && (
        <ul className="mt-2 space-y-2">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex gap-3 text-white/75 leading-relaxed">
              <span className="mt-2 h-1 w-1 bg-[#D4AF37] flex-shrink-0"></span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {section.blocks && (
        <div className="space-y-1 text-white/75 leading-relaxed">
          {section.blocks.map((b, i) => (
            <React.Fragment key={i}>
              {b.subheading && (
                <div className="text-[10px] uppercase tracking-[0.28em] text-[#BF9972] mt-4 mb-1">{b.subheading}</div>
              )}
              {b.text && <p>{b.text}</p>}
            </React.Fragment>
          ))}
        </div>
      )}
    </section>
  );
}

export default function LegalPage() {
  const { slug } = useParams();
  const page = LEGAL_PAGES[slug];

  useEffect(() => {
    if (page) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    if (page) document.title = `${page.title} · Samrat Glass Emporium`;
  }, [page]);

  if (!page) return <Navigate to="/" replace />;

  return (
    <div data-testid={`legal-page-${slug}`} className="min-h-screen relative">
      {/* Ambient warm glow */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ background: "radial-gradient(ellipse at 50% 0%, #D4AF37 0%, transparent 55%)" }}></div>

      <div className="relative max-w-4xl mx-auto px-6 pt-16 md:pt-24 pb-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/40 mb-8" aria-label="breadcrumb">
          <Link to="/" className="hover:text-[#D4AF37] transition-colors">Home</Link>
          <ChevronRight size={12} className="text-white/25" />
          <span className="text-white/70">{page.title}</span>
        </nav>

        {/* Title block */}
        <div className="border-b border-[#BF9972]/25 pb-8 mb-10">
          <div className="eyebrow mb-3">Legal</div>
          <h1 data-testid="legal-title" className="font-serif text-4xl sm:text-5xl leading-[1.1] text-white">
            {page.title}
          </h1>
          <div className="mt-4 text-xs text-white/50">
            Last updated: <span data-testid="legal-updated" className="text-white/70">{formatDate()}</span>
          </div>
        </div>

        {/* Intro */}
        {page.intro && (
          <p className="text-white/75 leading-relaxed text-base md:text-lg mb-12 font-serif italic">{page.intro}</p>
        )}

        {/* Sections */}
        <div>
          {page.sections.map((s, i) => (
            <Section key={i} section={s} />
          ))}
        </div>

        {/* Cross-links */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="eyebrow mb-4">Other policies</div>
          <div className="flex flex-wrap gap-3">
            {LEGAL_ORDER.filter((k) => k !== slug).map((k) => (
              <Link
                key={k}
                to={`/legal/${k}`}
                data-testid={`legal-link-${k}`}
                className="text-xs uppercase tracking-[0.24em] border border-white/15 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/70 px-4 py-2 transition-colors"
              >
                {LEGAL_PAGES[k].title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
