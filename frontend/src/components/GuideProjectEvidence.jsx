import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { buildProjectSlugs } from "../lib/slug";

const GUIDE_CATEGORY_MAP = {
  "choose-chandelier-size-room": ["chandelier"],
  "chandelier-double-height-living-room": ["chandelier", "floor chandelier"],
  "how-high-should-chandelier-hang": ["chandelier", "hanging light"],
  "glass-vs-crystal-chandelier": ["chandelier"],
  "choose-lighting-living-room": ["chandelier", "wall light", "table lamp", "floor lamp", "hanging light"],
  "wall-light-installation-height": ["wall light"],
  "can-chandelier-be-custom-made": ["chandelier"],
  "how-chandeliers-made-firozabad": [],
  "lighting-for-architects-interior-projects": [],
  "pack-transport-glass-chandeliers": ["chandelier", "hanging light"],
};

const norm = (value) => String(value || "").trim().toLowerCase();

export default function GuideProjectEvidence({ guideSlug }) {
  const { hp } = useSettings();
  const [products, setProducts] = useState([]);
  const projects = hp.gallery?.items || [];

  useEffect(() => {
    let active = true;
    api.listAllProducts()
      .then((items) => { if (active) setProducts(Array.isArray(items) ? items : []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const matches = useMemo(() => {
    if (!projects.length || !products.length) return [];

    const productById = new Map(products.map((product) => [product.id, product]));
    const projectSlugs = buildProjectSlugs(projects);
    const wanted = GUIDE_CATEGORY_MAP[guideSlug] || [];
    const customisationFirst = guideSlug === "can-chandelier-be-custom-made";

    return projects
      .map((project, index) => {
        const linkedProducts = (project.products || [])
          .map((id) => productById.get(id))
          .filter(Boolean);
        if (!linkedProducts.length) return null;

        const categoryMatch = wanted.length === 0 || linkedProducts.some((product) => {
          const category = norm(product.category);
          return wanted.some((wantedCategory) => category.includes(wantedCategory));
        });
        if (!categoryMatch) return null;

        return {
          project,
          slug: projectSlugs[index],
          linkedProducts,
          priority: customisationFirst && project.customisation ? 1 : 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }, [guideSlug, products, projects]);

  if (!matches.length) return null;

  return (
    <section className="mt-16 border-t border-white/10 pt-10" data-testid="guide-project-evidence">
      <div className="eyebrow mb-3">Real installation evidence</div>
      <h2 className="font-serif text-3xl sm:text-4xl leading-tight">See the advice applied in real Samrat Glass projects.</h2>
      <p className="mt-4 text-white/60 leading-relaxed max-w-3xl">
        These are client-installation pages already connected to exact catalogue pieces. Use them to compare scale, placement and decorative effect in real interiors rather than relying only on studio product photographs.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {matches.map(({ project, slug, linkedProducts }) => (
          <Link
            key={slug}
            to={`/gallery/${slug}`}
            className="border border-white/12 hover:border-[#D4AF37]/60 p-5 transition-colors group"
          >
            {project.location && (
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-[#BF9972] mb-3">
                <MapPin size={11} /> {project.location}
              </div>
            )}
            <h3 className="font-serif text-xl leading-snug text-white group-hover:text-[#D4AF37] transition-colors">{project.title}</h3>
            <p className="mt-3 text-sm text-white/50 leading-relaxed">
              {linkedProducts.slice(0, 2).map((product) => `${product.name}${product.sku ? ` (${product.sku})` : ""}`).join(" · ")}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]">
              View real installation <ArrowUpRight size={11} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
