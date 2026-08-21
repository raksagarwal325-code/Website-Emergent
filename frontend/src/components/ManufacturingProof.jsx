import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Factory } from "lucide-react";
import CraftVideoBlock from "./CraftVideoBlock";

const VERIFIED_STEPS = [
  ["01", "Component preparation", "Decorative glass components are handled and prepared by hand before later finishing and assembly stages."],
  ["02", "Shaping & finishing", "Selected glass components are shaped and refined using workshop grinding and finishing equipment."],
  ["03", "Surface & edge work", "Edges, surfaces and decorative details are manually refined piece by piece."],
  ["04", "Cleaning & preparation", "Finished glass components are cleaned and prepared before fitting or final assembly."],
  ["05", "Fitting & assembly", "Artisans fit decorative glass components into the lighting structure by hand."],
  ["06", "Inspection & packing", "Completed components and fixtures are handled, checked and prepared for the next stage or dispatch."],
];

function ProofClip({ item, index }) {
  const video = item?.video_url || "";
  const poster = item?.thumbnail_url || "";
  const caption = item?.caption || "";
  if (!video && !poster) return null;

  return (
    <figure className="border border-white/10 bg-[#0d0510] overflow-hidden">
      <div className="aspect-[4/5] bg-black">
        {video ? (
          <video
            src={video}
            poster={poster || undefined}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
            aria-label={caption || `Firozabad workshop process clip ${index + 1}`}
          />
        ) : (
          <img src={poster} alt={caption || `Firozabad workshop process ${index + 1}`} loading="lazy" className="w-full h-full object-contain" />
        )}
      </div>
      {caption && <figcaption className="p-4 text-sm text-white/60 leading-relaxed">{caption}</figcaption>}
    </figure>
  );
}

export default function ManufacturingProof({ craftVideo = {}, proof = {} }) {
  const clips = Array.isArray(proof.clips) ? proof.clips.filter((item) => item?.video_url || item?.thumbnail_url) : [];
  const hasPrimaryVideo = craftVideo.video_url || craftVideo.instagram_url || craftVideo.thumbnail_url;

  return (
    <section id="workshop" data-testid="manufacturing-proof" className="border-y border-[#BF9972]/15 bg-[#0b0409]">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-14 items-start">
          <div>
            <div className="eyebrow mb-4 text-[#D4AF37]">Manufacturing proof</div>
            <h2 className="font-serif text-3xl md:text-5xl leading-tight">Inside our Firozabad workshop.</h2>
          </div>
          <div className="space-y-4 text-white/68 leading-relaxed">
            <p>
              This section documents real workshop activity from Samrat Glass Emporium in Firozabad. The footage shows people, tools and handwork used while preparing, shaping, finishing, cleaning and assembling decorative glass lighting components.
            </p>
            <p className="text-sm text-white/48">
              The exact sequence varies by product. We only describe processes that are visible in our own workshop material and do not claim that every fixture passes through identical stages.
            </p>
          </div>
        </div>

        {clips.length > 0 ? (
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {clips.slice(0, 8).map((item, index) => <ProofClip key={`${item.video_url || item.thumbnail_url}-${index}`} item={item} index={index} />)}
          </div>
        ) : hasPrimaryVideo ? (
          <div className="mt-12 max-w-md mx-auto">
            <CraftVideoBlock
              video_url={craftVideo.video_url}
              instagram_url={craftVideo.instagram_url}
              thumbnail_url={craftVideo.thumbnail_url}
              caption={craftVideo.caption || "A real workshop process glimpse from Samrat Glass Emporium in Firozabad."}
              cta_text={craftVideo.cta_text}
              cta_link={craftVideo.cta_link}
              variant="framed"
              aspect="9 / 16"
              data-testid="manufacturing-proof-primary-video"
            />
          </div>
        ) : null}

        <div className="mt-16">
          <div className="eyebrow mb-4">What the workshop material demonstrates</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VERIFIED_STEPS.map(([num, title, body]) => (
              <div key={num} className="border border-white/10 p-6 bg-[#10060c]">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="text-[#D4AF37] text-xs tracking-[0.24em]">{num}</span>
                  <CheckCircle2 size={16} className="text-[#D4AF37]/70" strokeWidth={1.4} />
                </div>
                <h3 className="font-serif text-xl mb-2">{title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 border border-[#D4AF37]/25 p-7 md:p-9 flex flex-col md:flex-row md:items-center md:justify-between gap-6" style={{ background: "linear-gradient(90deg, rgba(163,99,80,0.12), transparent)" }}>
          <div>
            <div className="inline-flex items-center gap-2 text-[#D4AF37] text-xs uppercase tracking-[0.22em] mb-3"><Factory size={15} /> From workshop to real installations</div>
            <p className="text-white/65 max-w-2xl leading-relaxed">See genuine client projects where catalogue lighting and documented custom configurations have been installed in real spaces.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/gallery" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.2em] hover:bg-[#B5952F]">View installations <ArrowRight size={13} /></Link>
            <Link to="/chandelier-manufacturer-india" className="inline-flex items-center gap-2 border border-white/20 px-6 py-3 uppercase text-xs tracking-[0.2em] hover:border-[#D4AF37]">Manufacturer profile</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
