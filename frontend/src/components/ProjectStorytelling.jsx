import React from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { galleryImageAlt } from "../lib/imageSeo";

const SnapshotItem = ({ label, value }) => value ? (
  <div className="border-t border-white/8 pt-3">
    <div className="text-[9px] uppercase tracking-[0.24em] text-[#BF9972] mb-1">{label}</div>
    <div className="text-sm text-white/80 leading-relaxed">{value}</div>
  </div>
) : null;

export default function ProjectStorytelling({
  project,
  images = [],
  productPresentation,
  linkedProducts = [],
  optionalSnapshot = [],
  onImageOpen,
}) {
  const hasExtendedSnapshot = optionalSnapshot.some(([, value]) => Boolean(value));

  return (
    <section id="project-story" className="border-t border-[#BF9972]/15 scroll-mt-28" data-testid="project-storytelling">
      <div className="max-w-7xl mx-auto px-6 py-14 md:py-18 lg:grid lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-3">
            <div className="eyebrow mb-4">Project story</div>
            {project.note ? (
              <p className="text-white/80 leading-relaxed text-lg md:text-xl whitespace-pre-line">{project.note}</p>
            ) : (
              <p className="text-white/50 leading-relaxed">Project details will be added soon.</p>
            )}

            {(project.fixture_details || project.customisation) && (
              <div id="project-details" className="scroll-mt-28">
                {project.fixture_details && (
                  <div className="mt-9">
                    <div className="eyebrow mb-3">Fixture details</div>
                    <p className="text-white/70 leading-relaxed">{project.fixture_details}</p>
                  </div>
                )}
                {project.customisation && (
                  <div className="mt-9">
                    <div className="eyebrow mb-3">Customisation</div>
                    <p className="text-white/70 leading-relaxed">{project.customisation}</p>
                  </div>
                )}
              </div>
            )}

            <aside id="project-at-a-glance" className="mt-10 scroll-mt-28">
              <div className="border border-[#BF9972]/20 bg-black/20 p-6 md:p-7">
                <div className="eyebrow mb-5">Project at a glance</div>
                <div className="space-y-4">
                  <SnapshotItem label="Location" value={project.location} />
                  {linkedProducts.length > 0 && (
                    <SnapshotItem label={productPresentation.snapshotLabel} value={productPresentation.snapshotValue} />
                  )}
                  {hasExtendedSnapshot && optionalSnapshot.map(([label, value]) => (
                    <SnapshotItem key={label} label={label} value={value} />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div id="installed-views" className="mt-10 lg:mt-0 lg:col-span-7 scroll-mt-28">
          <div className="eyebrow mb-3">Real photos from the site</div>
          <h2 className="font-serif text-3xl md:text-5xl leading-tight">Installed in the client space.</h2>
          <p className="mt-3 text-white/60 max-w-2xl">These are project photographs from the actual installation, not stock-room renders.</p>

          {images.length > 0 ? (
            <div className="mt-8 space-y-5 md:space-y-7">
              {images.map((img, i) => (
                <motion.button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => onImageOpen?.(i)}
                  data-testid={`project-story-image-${i}`}
                  initial={{ opacity: 0, y: 22, scale: 0.985 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.18 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="block w-full overflow-hidden bg-black group"
                >
                  <div className="min-h-[260px] md:min-h-[420px] lg:min-h-[72vh] flex items-center justify-center overflow-hidden">
                    <img
                      src={api.resolveImage(img)}
                      alt={galleryImageAlt({ title: project.title, location: project.location, view: i + 1 })}
                      loading={i === 0 ? "eager" : "lazy"}
                      className="w-full h-full max-h-[82vh] object-contain transition-transform duration-700 ease-out group-hover:scale-[1.015]"
                    />
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="mt-8 border border-white/8 bg-black/20 p-8 text-white/45 text-sm">Installation imagery will be added when available.</div>
          )}
        </div>
      </div>
    </section>
  );
}
