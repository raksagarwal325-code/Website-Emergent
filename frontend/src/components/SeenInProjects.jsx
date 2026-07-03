import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { useSettings } from "../context/SettingsContext";
import { buildProjectSlugs } from "../lib/slug";

/**
 * "Seen in these projects" — surfaces gallery projects that reference the
 * current product in their `products` array. Renders nothing if no match.
 */
export default function SeenInProjects({ productId }) {
  const { hp } = useSettings();
  const items = hp?.gallery?.items || [];
  const slugs = useMemo(() => buildProjectSlugs(items), [items]);

  const matches = useMemo(() => {
    if (!productId) return [];
    return items
      .map((project, index) => ({ project, index, slug: slugs[index] }))
      .filter(({ project }) => (project.products || []).includes(productId));
  }, [items, slugs, productId]);

  if (!matches.length) return null;

  return (
    <section
      data-testid="seen-in-projects"
      className="mt-20 md:mt-24 border-t border-white/10 pt-14 md:pt-16"
    >
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-10">
        <div>
          <div className="eyebrow mb-3 text-[#D4AF37]">In the wild</div>
          <h2 className="font-serif text-3xl md:text-4xl">Seen in these projects</h2>
          <p className="text-white/50 text-sm mt-2 max-w-xl">
            Real installations where this piece is lighting up a home, hotel or showroom.
          </p>
        </div>
        <Link
          to="/gallery"
          data-testid="seen-in-projects-view-all"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-[#D4AF37] link-underline"
        >
          Full gallery <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {matches.map(({ project, slug, index }) => {
          const cover = (project.images || []).filter(Boolean)[0];
          return (
            <Link
              key={slug || index}
              to={`/gallery/${slug}`}
              data-testid={`seen-in-project-${index}`}
              className="group relative block border border-white/10 hover:border-[#D4AF37]/60 transition-colors overflow-hidden"
            >
              <div className="aspect-[4/3] bg-black/40 overflow-hidden">
                {cover ? (
                  <img
                    src={api.resolveImage(cover)}
                    alt={project.title || "Project"}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 font-serif italic text-sm">
                    Image pending
                  </div>
                )}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(180deg, transparent 45%, rgba(22,7,15,0.85) 100%)" }}
                />
              </div>
              <div className="absolute left-0 right-0 bottom-0 p-5">
                <h3 className="font-serif text-lg md:text-xl leading-snug text-white group-hover:text-[#D4AF37] transition-colors">
                  {project.title || "Untitled project"}
                </h3>
                {project.location && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.24em] text-[#BF9972]">
                    <MapPin size={11} strokeWidth={1.6} />
                    {project.location}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
