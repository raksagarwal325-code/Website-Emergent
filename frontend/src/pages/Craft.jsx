import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Ruler, Layers3, Palette, GalleryHorizontalEnd } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import SEO from "../components/SEO";
import { CraftBackgroundVideo } from "../components/CraftVideoBlock";
import ManufacturingProof from "../components/ManufacturingProof";

const CUSTOMISATION_EXAMPLES = [
  [Ruler, "Scale & proportion", "Selected designs can be evaluated for changes in scale or proportion when the product structure allows it."],
  [Layers3, "Light & tier configuration", "Some catalogue designs can be reconfigured for a different number of lights or tiers after the requirement is reviewed."],
  [Palette, "Finish & glass choices", "Selected fixtures may support alternative finishes or glass colours, subject to the individual design."],
  [GalleryHorizontalEnd, "Project-specific adaptation", "Real installation requirements are evaluated against the catalogue design before a custom change is confirmed."],
];

export default function Craft() {
  const { hp, settings } = useSettings();
  const cv = hp.craft_video || {};
  const proof = settings?.homepage_content?.craft_proof || {};

  return (
    <div data-testid="page-craft">
      <SEO
        title="The Craft | Inside Our Firozabad Workshop | Samrat Glass"
        description="See real workshop footage from Samrat Glass Emporium in Firozabad, documenting decorative glass preparation, shaping, finishing, cleaning, assembly and inspection."
        path="/craft"
      />

      <section className="relative overflow-hidden grain">
        <CraftBackgroundVideo
          enabled={cv.bg_autoplay !== false}
          video_url={cv.video_url}
          thumbnail_url={cv.thumbnail_url}
        />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(22,7,15,0.6) 0%, rgba(22,7,15,0.9) 60%, #16070f 100%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 20% 40%, rgba(163,99,80,0.35), transparent 45%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 80% 60%, rgba(212,175,55,0.15), transparent 55%)" }} />
        </div>
        {cv.bg_autoplay !== false && cv.video_url && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(22,7,15,0.7), rgba(11,4,9,0.95))" }} />
        )}
        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="eyebrow mb-6">Firozabad · Since 1981</div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
              The Craft <span className="brand-gradient-text italic">behind the lighting.</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-white/70 text-base md:text-lg leading-relaxed">
              Real workshop footage and factual process notes from Samrat Glass Emporium in Firozabad — showing the people, tools and handwork behind decorative glass lighting.
            </p>
            <a href="#workshop" className="mt-8 inline-flex items-center gap-2 text-[#D4AF37] text-xs uppercase tracking-[0.24em] hover:text-[#B5952F]">
              See the workshop proof <ArrowUpRight size={14} />
            </a>
          </motion.div>
        </div>
      </section>

      <ManufacturingProof craftVideo={cv} proof={proof} />

      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-14 mb-10">
          <div>
            <div className="eyebrow mb-4">Selected customisation</div>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight">Catalogue designs can sometimes be adapted for a real space.</h2>
          </div>
          <div className="space-y-4 text-white/65 leading-relaxed">
            <p>Customisation is evaluated product by product. A change is only confirmed when it is technically suitable for the selected design and the client requirement.</p>
            <p className="text-sm text-white/48">Our project gallery records genuine examples of catalogue pieces and documented custom configurations installed in client spaces.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CUSTOMISATION_EXAMPLES.map(([Icon, title, body]) => (
            <div key={title} className="border border-white/10 p-6 bg-[#0d0510]">
              <Icon size={18} className="text-[#D4AF37] mb-4" strokeWidth={1.4} />
              <h3 className="font-serif text-lg mb-2">{title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/gallery" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.22em] hover:bg-[#B5952F]">
            View real installations <ArrowUpRight size={13} />
          </Link>
          <Link to="/custom-lighting-bulk-orders" className="inline-flex items-center gap-2 border border-white/20 px-6 py-3 uppercase text-xs tracking-[0.22em] hover:border-[#D4AF37]">
            Discuss custom lighting
          </Link>
        </div>
      </section>

      <section className="relative py-20 md:py-28 border-t border-[#BF9972]/15 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(163,99,80,0.3), transparent 55%)" }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="eyebrow mb-4">From Firozabad to finished spaces</div>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight">See the product, the workshop and the installation together.</h2>
            <p className="mt-5 text-white/65 leading-relaxed">Explore the catalogue for the exact lighting pieces, then visit the project gallery for genuine client installations and documented custom configurations.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/catalog" className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">
                Explore catalogue <ArrowUpRight size={14} />
              </Link>
              <Link to="/gallery" className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.28em]">
                View installations
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
