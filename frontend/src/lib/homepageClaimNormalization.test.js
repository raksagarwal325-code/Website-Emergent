import { normalizeHomepageClaims } from "./homepageClaimNormalization";

describe("normalizeHomepageClaims", () => {
  it("normalizes known legacy homepage claims without mutating saved settings", () => {
    const saved = {
      hero: {
        description: "A curated catalog of crystal chandeliers, pendant lights, wall sconces, table lamps & decorative lighting — hand-blown and hand-assembled by our artisans in Firozabad.",
      },
      collage: {
        title: "1000+ Light Options",
        highlight: "Inside",
        stats: [{ value: "1000+", label: "Designs" }],
      },
      reasons: {
        items: [
          {
            title: "Handcrafted, Traditionally",
            body: "Every piece is hand-blown, hand-cut and hand-assembled using time-honoured techniques.",
          },
        ],
      },
      faq: {
        items: [
          {
            q: "How long does a custom order take?",
            a: "Standard pieces typically ship in 7–10 business days. Bespoke commissions take 3–5 weeks depending on complexity.",
          },
          {
            q: "How are fragile glass pieces packaged?",
            a: "Transit damage is rare, but replacement is guaranteed — share unboxing photos within 24–48 hours.",
          },
        ],
      },
    };

    const result = normalizeHomepageClaims(saved);

    expect(result.hero.description).toContain("handcrafted and hand-assembled");
    expect(result.hero.description).toContain("processes varying by design");
    expect(result.collage.title).toBe("500+ Pieces");
    expect(result.collage.highlight).toBe("Online");
    expect(result.collage.stats[0]).toEqual({ value: "1000+", label: "Designs" });
    expect(result.reasons.items[0].body).toContain("techniques appropriate to each design");
    expect(result.faq.items[0].a).toContain("dispatch in 7–10 business days");
    expect(result.faq.items[0].a).toContain("transit time then varies by destination");
    expect(result.faq.items[1].a).toContain("within 48 hours");

    expect(saved.collage.title).toBe("1000+ Light Options");
    expect(saved.reasons.items[0].body).toContain("Every piece is hand-blown");
  });

  it("leaves unrelated custom copy unchanged", () => {
    const custom = {
      hero: { description: "Custom homepage description" },
      collage: { title: "Studio Collection", highlight: "Now" },
      reasons: { items: [{ title: "Custom", body: "Custom body" }] },
      faq: { items: [{ q: "Custom?", a: "Custom answer" }] },
    };

    expect(normalizeHomepageClaims(custom)).toEqual(custom);
  });
});
