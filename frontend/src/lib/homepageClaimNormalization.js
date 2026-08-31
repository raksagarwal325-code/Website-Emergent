// Runtime normalization for legacy homepage copy saved in Admin.
//
// The homepage editor can persist older wording indefinitely, so changing
// HOMEPAGE_DEFAULTS alone does not fix already-saved content. Keep these
// migrations narrow and evidence-based: normalize only known legacy claims,
// without mutating the source settings object.

const LEGACY_HERO_CRAFT =
  "A curated catalog of crystal chandeliers, pendant lights, wall sconces, table lamps & decorative lighting — hand-blown and hand-assembled by our artisans in Firozabad.";

const SAFE_HERO_CRAFT =
  "A curated catalog of crystal chandeliers, pendant lights, wall sconces, table lamps & decorative lighting — handcrafted and hand-assembled by our artisans in Firozabad, with processes varying by design.";

const LEGACY_ABOUT_TAGLINE =
  "The story of four generations of glass — and the craft that lights every corner of it.";

const SAFE_ABOUT_TAGLINE =
  "The story of more than four decades of decorative lighting — and the Firozabad craft behind it.";

const LEGACY_GALLERY_TAGLINE =
  "Homes, hotels, weddings, showrooms — spaces we've helped illuminate. Each piece here is custom-made in Firozabad.";

const SAFE_GALLERY_TAGLINE =
  "Homes, hotels, weddings and showrooms — a selection of spaces illuminated with Samrat Glass Emporium lighting.";

const LEGACY_REASON_CRAFT =
  "Every piece is hand-blown, hand-cut and hand-assembled using time-honoured techniques.";

const SAFE_REASON_CRAFT =
  "Handcrafted and hand-assembled in Firozabad using glass-working, cutting, finishing and decorative assembly techniques appropriate to each design.";

const LEGACY_REASON_TRUST =
  "Thousands of homes, hotels, restaurants and showrooms lit by Samrat.";

const SAFE_REASON_TRUST =
  "Lighting supplied for homes, hotels, restaurants and showrooms across India.";

const LEGACY_REASON_FIROZABAD =
  "Based in the City of Glass — India's spiritual home of glass-making.";

const SAFE_REASON_FIROZABAD =
  "Based in Firozabad, one of India's best-known centres for glass-making.";

const CRAFT_ITEM_REPLACEMENTS = new Map([
  [
    "Each piece begins as a pencil sketch on the workshop table — proportions calibrated to a room, a chandelier drop measured against a ceiling. Nothing is designed to be mass-produced; every silhouette is drawn to be lived under.",
    "Designs are developed around proportion, scale and the intended setting, with custom dimensions and configurations available for project requirements.",
  ],
  [
    "Master glass-blowers in Firozabad gather glass from the furnace on iron blowpipes and coax it into form through breath and rotation — the same technique this city has practiced for over four centuries.",
    "Where a design calls for blown glass, experienced Firozabad glassworkers shape the glass through established furnace-working techniques before it moves on to finishing and assembly.",
  ],
  [
    "Once cooled, crystal panels are hand-cut on stone wheels to shape the signature diamond facets that catch light. It is slow, exacting work — the angle of each cut determines how the finished piece will glow.",
    "For designs that use cut glass or crystal elements, facets and decorative details are shaped and finished to create the intended light pattern and surface character.",
  ],
  [
    "Individual glass elements are strung and set into hand-worked brass frames — sometimes a single chandelier requires 400+ pieces threaded together. This step alone can take a week for a single fixture.",
    "Individual glass elements are assembled with the metal frame, fittings and electrical components, with the process varying according to the scale and complexity of each design.",
  ],
  [
    "Every finished piece is lit, inspected, and packed by hand in our atelier before dispatch. Bespoke commissions are also numbered and signed — a signature you'll only see on the underside of the mount.",
    "Finished fixtures are checked, prepared and packed before dispatch. Bespoke orders are reviewed against the approved size, finish and configuration before packing.",
  ],
]);

const normalizeFaqAnswer = (answer = "") => String(answer)
  .replace(
    "Standard pieces typically ship in 7–10 business days.",
    "Standard pieces typically dispatch in 7–10 business days; transit time then varies by destination."
  )
  .replace(
    "Bespoke commissions take 3–5 weeks depending on complexity — hand-cut crystal, brasswork and finishing all happen in-house in Firozabad.",
    "Bespoke commissions typically take 3–5 weeks depending on the design, size, finish and configuration."
  )
  .replace(
    "share unboxing photos within 24–48 hours.",
    "share unboxing photos within 48 hours."
  );

export function normalizeHomepageClaims(homepage) {
  if (!homepage || typeof homepage !== "object") return homepage;

  const out = { ...homepage };

  if (homepage.hero && typeof homepage.hero === "object") {
    out.hero = { ...homepage.hero };
    if (out.hero.description === LEGACY_HERO_CRAFT) {
      out.hero.description = SAFE_HERO_CRAFT;
    }
  }

  if (homepage.collage && typeof homepage.collage === "object") {
    // Keep the owner's established 1000+ light-options/design-library claim.
    // Do not tie this marketing/library statement to the momentary count of
    // currently published online SKUs.
    out.collage = { ...homepage.collage };
  }

  if (homepage.about && typeof homepage.about === "object") {
    out.about = { ...homepage.about };
    if (out.about.tagline === LEGACY_ABOUT_TAGLINE) {
      out.about.tagline = SAFE_ABOUT_TAGLINE;
    }
  }

  if (homepage.craft && typeof homepage.craft === "object") {
    out.craft = {
      ...homepage.craft,
      items: Array.isArray(homepage.craft.items)
        ? homepage.craft.items.map((item) => {
          if (!item || typeof item !== "object") return item;
          const next = { ...item };
          if (next.kicker === "Molten glass · 1400°C") next.kicker = "Molten glass";
          if (next.kicker === "Brass, wire, patience") next.kicker = "Frame, fittings, assembly";
          if (next.kicker === "Signed and inspected") next.kicker = "Checked and packed";
          if (CRAFT_ITEM_REPLACEMENTS.has(next.body)) {
            next.body = CRAFT_ITEM_REPLACEMENTS.get(next.body);
          }
          return next;
        })
        : homepage.craft.items,
    };
  }

  if (homepage.gallery && typeof homepage.gallery === "object") {
    out.gallery = { ...homepage.gallery };
    if (out.gallery.tagline === LEGACY_GALLERY_TAGLINE) {
      out.gallery.tagline = SAFE_GALLERY_TAGLINE;
    }
  }

  if (homepage.reasons && typeof homepage.reasons === "object") {
    out.reasons = {
      ...homepage.reasons,
      items: Array.isArray(homepage.reasons.items)
        ? homepage.reasons.items.map((item) => {
          if (!item || typeof item !== "object") return item;
          if (item.body === LEGACY_REASON_CRAFT) return { ...item, body: SAFE_REASON_CRAFT };
          if (item.body === LEGACY_REASON_TRUST) return { ...item, body: SAFE_REASON_TRUST };
          if (item.body === LEGACY_REASON_FIROZABAD) return { ...item, body: SAFE_REASON_FIROZABAD };
          return { ...item };
        })
        : homepage.reasons.items,
    };
  }

  if (homepage.faq && typeof homepage.faq === "object") {
    out.faq = {
      ...homepage.faq,
      items: Array.isArray(homepage.faq.items)
        ? homepage.faq.items.map((item) => (
          item && typeof item === "object"
            ? { ...item, a: normalizeFaqAnswer(item.a) }
            : item
        ))
        : homepage.faq.items,
    };
  }

  return out;
}
