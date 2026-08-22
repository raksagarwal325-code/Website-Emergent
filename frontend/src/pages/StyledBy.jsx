import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Instagram } from "lucide-react";
import SEO from "../components/SEO";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import {
  InfluencerCard,
  displayHandle,
  extractIgUrl,
  isDisplayable,
} from "../components/InfluencerCard";

const SITE_ORIGIN = "https://samratglass.com";
const PATH = "/styled-by";
const META_TITLE = "As Styled By | Creator-Featured Samrat Glass Lighting";
const META_DESCRIPTION =
  "Explore Samrat Glass lighting styled in real creator spaces, with links to the original Instagram features and selected catalogue products where verified.";
const PAGE_SUBTITLE = "Real homes. Distinctive spaces. Samrat Glass lighting, styled by creators.";
const PAGE_INTRO =
  "Discover our lighting as it appears in thoughtfully styled interiors, with original creator features and selected product links where available.";

function JsonLd({ items }) {
  useEffect(() => {
    const creatorItems = items
      .map((item, index) => {
        const handle = displayHandle(item?.handle);
        const url = extractIgUrl(item?.input);
        if (!handle || !url) return null;
        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "CreativeWork",
            name: `Styled by @${handle}`,
            url,
            creator: {
              "@type": "Person",
              name: `@${handle}`,
              sameAs: `https://www.instagram.com/${handle}/`,
            },
          },
        };
      })
      .filter(Boolean);

    const schemas = [
      {
        id: "styled-by-collection-page",
        data: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": `${SITE_ORIGIN}${PATH}#webpage`,
          url: `${SITE_ORIGIN}${PATH}`,
          name: "As Styled By — Samrat Glass Emporium",
          description: META_DESCRIPTION,
          isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
          about: { "@id": `${SITE_ORIGIN}/#organization` },
          inLanguage: "en-IN",
          ...(creatorItems.length
            ? {
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: creatorItems.length,
                  itemListElement: creatorItems,
                },
              }
            : {}),
        },
      },
      {
        id: "styled-by-breadcrumb",
        data: {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
            { "@type": "ListItem", position: 2, name: "As Styled By", item: `${SITE_ORIGIN}${PATH}` },
          ],
        },
      },
    ];

    schemas.forEach(({ id, data }) => {
      let node = document.head.querySelector(`script[data-schema="${id}"]`);
      if (!node) {
        node = document.createElement("script");
        node.type = "application/ld+json";
        node.dataset.schema = id;
        document.head.appendChild(node);
      }
      node.textContent = JSON.stringify(data);
    });

    return () => schemas.forEach(({ id }) => document.head.querySelector(`script[data-schema="${id}"]`)?.remove());
  }, [items]);

  return null;
}

export default function StyledBy() {
  const { hp } = useSettings();
  const P = hp?.influencer_promotions || {};

  const validItems = useMemo(
    () => (P.items || []).filter(isDisplayable),
    [P.items],
  );

  const [products, setProducts] = useState([]);
  const needsProducts = validItems.some((it) => (it?.product_id || "").trim());
  useEffect(() => {
    if (!needsProducts) return undefined;
    let alive = true;
    api.listAllProducts()
      .then((rows) => { if (alive) setProducts(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, [needsProducts]);
  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );

  const titlePre = (P.title_pre || "As").trim();
  const titleHi = (P.title_highlight || "Styled By").trim();

  return (
    <div className="min-h-[70vh] bg-black text-white">
      <SEO title={META_TITLE} description={META_DESCRIPTION} path={PATH} />
      <JsonLd items={validItems} />

      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <Link
          to="/"
          data-testid="styled-by-back-link"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/50 hover:text-[#D4AF37] transition-colors mb-8"
        >
          <ArrowLeft size={13} /> Back to home
        </Link>

        <motion.div
          className="text-center mb-10 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="eyebrow mb-3">{P.eyebrow || "Featured Creators"}</div>
          <h1
            data-testid="styled-by-title"
            className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.05]"
          >
            {titlePre} <span className="italic brand-gradient-text">{titleHi}</span>
          </h1>
          <p className="mt-4 md:mt-5 text-white/60 max-w-2xl mx-auto leading-relaxed text-sm md:text-base">
            {PAGE_SUBTITLE}
          </p>
          <p className="mt-4 text-white/55 max-w-3xl mx-auto leading-relaxed text-sm md:text-base">
            {PAGE_INTRO}
          </p>
          <div className="mt-6 text-[11px] uppercase tracking-[0.32em] text-[#BF9972]/70">
            {validItems.length} {validItems.length === 1 ? "creator" : "creators"}
          </div>
        </motion.div>

        <div
          data-testid="styled-by-proof-context"
          className="mb-14 md:mb-16 border-y border-white/10 py-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[10px] uppercase tracking-[0.24em] text-white/55"
        >
          <span className="text-[#BF9972]">Discover more</span>
          <Link to="/craft#workshop" className="hover:text-[#D4AF37] transition-colors">Inside our workshop</Link>
          <Link to="/gallery" className="hover:text-[#D4AF37] transition-colors">Real installations</Link>
          <Link to="/chandelier-manufacturer-india" className="hover:text-[#D4AF37] transition-colors">Manufacturer profile</Link>
        </div>

        {validItems.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border border-[#D4AF37]/30 text-[#D4AF37]/60 mb-6">
              <Instagram size={32} strokeWidth={1.2} />
            </div>
            <p className="text-white/50">
              No styled looks yet. Add Instagram reels from Admin → Homepage → Influencer Promotions.
            </p>
          </div>
        ) : (
          <div
            data-testid="styled-by-grid"
            className="flex flex-wrap justify-center gap-6 md:gap-8"
          >
            {validItems.map((it, i) => (
              <InfluencerCard
                key={`${it.input}-${i}`}
                item={it}
                product={it?.product_id ? productById[it.product_id] || null : null}
                index={i}
              />
            ))}
          </div>
        )}

        {P.view_more_link && (
          <div className="mt-16 md:mt-20 flex justify-center">
            <a
              href={P.view_more_link}
              target="_blank"
              rel="noreferrer"
              data-testid="styled-by-view-more-btn"
              className="inline-flex items-center gap-2 px-8 py-4 uppercase text-[11px] tracking-[0.32em] transition-all duration-300 hover:bg-[#D4AF37]/10"
              style={{
                background: "transparent",
                color: "#D4AF37",
                border: "1px solid rgba(212,175,55,0.55)",
              }}
            >
              <Instagram size={14} strokeWidth={1.7} />
              <span>{P.view_more_text || "View More on Instagram"}</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
