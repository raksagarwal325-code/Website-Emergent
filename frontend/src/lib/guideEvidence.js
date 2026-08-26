export const GUIDE_EVIDENCE_TOPICS = [
  { slug: "choose-chandelier-size-room", label: "Chandelier size for a room" },
  { slug: "chandelier-double-height-living-room", label: "Double-height living room chandeliers" },
  { slug: "how-high-should-chandelier-hang", label: "Chandelier hanging height" },
  { slug: "glass-vs-crystal-chandelier", label: "Glass vs crystal chandeliers" },
  { slug: "choose-lighting-living-room", label: "Choosing living-room lighting" },
  { slug: "wall-light-installation-height", label: "Wall-light installation height" },
  { slug: "can-chandelier-be-custom-made", label: "Custom-made chandeliers" },
  { slug: "how-chandeliers-made-firozabad", label: "How chandeliers are made in Firozabad" },
  { slug: "lighting-for-architects-interior-projects", label: "Lighting for architects & interior projects" },
  { slug: "pack-transport-glass-chandeliers", label: "Packing & transporting glass chandeliers" },
];

export const GUIDE_CATEGORY_MAP = {
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

export const guideEvidencePriority = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
