import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { LEGAL_PAGES, LEGAL_ORDER, LEGAL_DEFAULT_UPDATED_AT } from "../lib/legalContent";
import { api } from "../lib/api";
import SEO from "../components/SEO";

const LEGAL_META_DESCRIPTIONS = {
  privacy:
    "How Samrat Glass Emporium collects, uses, and protects information from website visitors, product inquiries, catalogue downloads, and WhatsApp conversations.",
  terms:
    "Terms & Conditions for using the Samrat Glass Emporium website, catalogue, and inquiry services — pricing, orders, product variations, and intellectual property.",
  shipping:
    "Pan-India shipping and delivery information for Samrat Glass Emporium — delivery timelines, packaging, charges, and transit damage handling.",
  returns:
    "Return and replacement policy for Samrat Glass Emporium — eligible cases, damage reporting timelines, and handling of handcrafted glass products.",
  payment:
    "Accepted payment methods, order confirmation, custom-order advances, and GST invoicing at Samrat Glass Emporium.",
};

/**
 * Parse an admin-authored plain-text policy body into the same
 * `{ intro, sections: [{ heading, text, bullets }] }` shape used by
 * the code-shipped defaults. Format is intentionally minimal so
 * admins never need code / rich-text tooling:
 *
 *   ## Heading            → starts a new section with that heading
 *   - bullet              → appends a bullet to the current section
 *   (blank line)          → paragraph separator inside the current section
 *   any other line        → appended to the current section's text
 *
 * Text is rendered by React as text nodes (never dangerouslySetInnerHTML),
 * so any HTML/scripts an admin might paste in are shown as literal text.
 * Returns null when the body is missing/blank so the caller can fall
 * back to the code default.
 */
export function parseLegalBody(body) {
  if (typeof body !== "string") return null;
  const trimmed = body.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return null;

  const lines = trimmed.split("\n");
  const intro = [];
  const sections = [];
  let current = null;
  let seenHeading = false;

  const pushIntro = (line) => intro.push(line);
  const ensureSection = () => {
    if (!current) {
      current = { heading: "", text: "", bullets: [] };
      sections.push(current);
    }
    return current;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^##\s+/.test(line)) {
      current = { heading: line.replace(/^##\s+/, "").trim(), text: "", bullets: [] };
      sections.push(current);
      seenHeading = true;
      continue;
    }
    if (/^-\s+/.test(line)) {
      ensureSection().bullets.push(line.replace(/^-\s+/, "").trim());
      continue;
    }
    if (!seenHeading) {
      pushIntro(line);
      continue;
    }
    // paragraph line — append to current section's text, preserving blank lines
    const s = ensureSection();
    s.text = s.text ? `${s.text}\n${line}` : line;
  }

  // Clean up trailing/leading blank lines in text blocks
  const clean = (s) => (s || "").replace(/^\n+/, "").replace(/\n+$/, "");
  const outSections = sections.map((s) => ({
    heading: s.heading,
    text: clean(s.text),
    bullets: s.bullets.length ? s.bullets : undefined,
  }));

  return {
    intro: clean(intro.join("\n")),
    sections: outSections,
  };
}

function Section({ section }) {
  return (
    <section className="mb-10">
      {section.heading && (
        <h2 className="font-serif text-xl md:text-2xl text-white mb-4 brand-gradient-text">{section.heading}</h2>
      )}
      {section.text && (
        <p className="text-white/70 leading-relaxed" style={{ whiteSpace: "pre-line" }}>{section.text}</p>
      )}
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
  const defaults = LEGAL_PAGES[slug];
  const [override, setOverride] = useState(null);
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!defaults) return;
    (async () => {
      try {
        const s = await api.getSettings();
        if (cancelled) return;
        const entry = (s && s.legal_content && s.legal_content[slug]) || null;
        const parsed = entry ? parseLegalBody(entry.body) : null;
        setOverride(parsed);
        setUpdatedAt((entry && typeof entry.updated_at === "string" && entry.updated_at.trim()) || "");
      } catch {
        if (!cancelled) {
          setOverride(null);
          setUpdatedAt("");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [slug, defaults]);

  useEffect(() => {
    if (defaults) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [defaults]);

  if (!defaults) return <Navigate to="/" replace />;

  // Fall back to the code-shipped default whenever the admin override
  // is missing, blank, or fails to parse into at least one section.
  const useOverride = override && Array.isArray(override.sections) && override.sections.length > 0;
  const page = useOverride
    ? { title: defaults.title, intro: override.intro || defaults.intro, sections: override.sections }
    : defaults;
  const lastUpdatedLabel = updatedAt || LEGAL_DEFAULT_UPDATED_AT;

  return (
    <div data-testid={`legal-page-${slug}`} className="min-h-screen relative">
      <SEO
        title={`${defaults.title} · Samrat Glass Emporium`}
        description={LEGAL_META_DESCRIPTIONS[slug]}
        path={`/legal/${slug}`}
      />

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
            Last updated: <span data-testid="legal-updated" className="text-white/70">{lastUpdatedLabel}</span>
          </div>
        </div>

        {/* Intro */}
        {page.intro && (
          <p className="text-white/75 leading-relaxed text-base md:text-lg mb-12 font-serif italic" style={{ whiteSpace: "pre-line" }}>{page.intro}</p>
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
