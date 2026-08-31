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

const LEGACY_REASON_CRAFT =
  "Every piece is hand-blown, hand-cut and hand-assembled using time-honoured techniques.";

const SAFE_REASON_CRAFT =
  "Handcrafted and hand-assembled in Firozabad using glass-working, cutting, finishing and decorative assembly techniques appropriate to each design.";

const normalizeFaqAnswer = (answer = "") => String(answer)
  .replace(
    "Standard pieces typically ship in 7–10 business days.",
    "Standard pieces typically dispatch in 7–10 business days; transit time then varies by destination."
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
    out.collage = { ...homepage.collage };
    // Preserve the separate 1000+ design-library claim, but do not imply that
    // 1000+ products are currently browsable in the online catalogue.
    if (out.collage.title === "1000+ Light Options" && out.collage.highlight === "Inside") {
      out.collage.title = "500+ Pieces";
      out.collage.highlight = "Online";
    }
  }

  if (homepage.reasons && typeof homepage.reasons === "object") {
    out.reasons = {
      ...homepage.reasons,
      items: Array.isArray(homepage.reasons.items)
        ? homepage.reasons.items.map((item) => {
          if (!item || typeof item !== "object") return item;
          if (item.body !== LEGACY_REASON_CRAFT) return { ...item };
          return { ...item, body: SAFE_REASON_CRAFT };
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
