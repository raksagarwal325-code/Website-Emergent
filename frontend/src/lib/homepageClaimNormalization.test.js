import { normalizeHomepageClaims } from "./homepageClaimNormalization";

describe("normalizeHomepageClaims", () => {
  it("normalizes known legacy homepage claims without mutating saved settings", () => {
    const saved = {
      hero: {
        headline_line2: "turn houses into homes.",
        description: "A curated catalog of crystal chandeliers, pendant lights, wall sconces, table lamps & decorative lighting — hand-blown and hand-assembled by our artisans in Firozabad.",
      },
      collage: {
        title: "1000+ Light Options",
        highlight: "Inside",
        stats: [{ value: "1000+", label: "Designs" }],
      },
      about: {
        tagline: "The story of four generations of glass — and the craft that lights every corner of it.",
      },
      craft: {
        items: [
          {
            num: "02",
            kicker: "Molten glass · 1400°C",
            title: "The Furnace",
            body: "Master glass-blowers in Firozabad gather glass from the furnace on iron blowpipes and coax it into form through breath and rotation — the same technique this city has practiced for over four centuries.",
          },
          {
            num: "04",
            kicker: "Brass, wire, patience",
            title: "Assembly",
            body: "Individual glass elements are strung and set into hand-worked brass frames — sometimes a single chandelier requires 400+ pieces threaded together. This step alone can take a week for a single fixture.",
          },
          {
            num: "05",
            kicker: "Signed and inspected",
            title: "Finish",
            body: "Every finished piece is lit, inspected, and packed by hand in our atelier before dispatch. Bespoke commissions are also numbered and signed — a signature you'll only see on the underside of the mount.",
          },
        ],
      },
      gallery: {
        tagline: "Homes, hotels, weddings, showrooms — spaces we've helped illuminate. Each piece here is custom-made in Firozabad.",
      },
      reasons: {
        items: [
          {
            title: "Handcrafted, Traditionally",
            body: "Every piece is hand-blown, hand-cut and hand-assembled using time-honoured techniques.",
          },
          {
            title: "Trusted Across India",
            body: "Thousands of homes, hotels, restaurants and showrooms lit by Samrat.",
          },
          {
            title: "Made in Firozabad",
            body: "Based in the City of Glass — India's spiritual home of glass-making.",
          },
        ],
      },
      faq: {
        items: [
          {
            q: "How long does a custom order take?",
            a: "Standard pieces typically ship in 7–10 business days. Bespoke commissions take 3–5 weeks depending on complexity — hand-cut crystal, brasswork and finishing all happen in-house in Firozabad.",
          },
          {
            q: "How are fragile glass pieces packaged?",
            a: "Transit damage is rare, but replacement is guaranteed — share unboxing photos within 24–48 hours.",
          },
        ],
      },
    };

    const result = normalizeHomepageClaims(saved);

    expect(result.hero.headline_line2).toBe("turns houses into homes.");
    expect(result.hero.description).toContain("handcrafted and hand-assembled");
    expect(result.hero.description).toContain("processes varying by design");
    expect(result.collage.title).toBe("1000+ Light Options");
    expect(result.collage.highlight).toBe("Inside");
    expect(result.collage.stats[0]).toEqual({ value: "1000+", label: "Designs" });
    expect(result.about.tagline).toContain("more than four decades");
    expect(result.craft.items[0].kicker).toBe("Molten glass");
    expect(result.craft.items[0].body).not.toContain("four centuries");
    expect(result.craft.items[1].kicker).toBe("Frame, fittings, assembly");
    expect(result.craft.items[1].body).not.toContain("400+");
    expect(result.craft.items[1].body).not.toContain("take a week");
    expect(result.craft.items[2].kicker).toBe("Checked and packed");
    expect(result.craft.items[2].body).not.toContain("numbered and signed");
    expect(result.gallery.tagline).not.toContain("Each piece here is custom-made");
    expect(result.reasons.items[0].body).toContain("techniques appropriate to each design");
    expect(result.reasons.items[1].body).not.toContain("Thousands");
    expect(result.reasons.items[2].body).toContain("best-known centres for glass-making");
    expect(result.faq.items[0].a).toContain("dispatch in 7–10 business days");
    expect(result.faq.items[0].a).toContain("transit time then varies by destination");
    expect(result.faq.items[0].a).not.toContain("all happen in-house");
    expect(result.faq.items[1].a).toContain("within 48 hours");

    expect(saved.hero.headline_line2).toBe("turn houses into homes.");
    expect(saved.collage.title).toBe("1000+ Light Options");
    expect(saved.about.tagline).toContain("four generations");
    expect(saved.craft.items[0].kicker).toContain("1400°C");
    expect(saved.reasons.items[0].body).toContain("Every piece is hand-blown");
  });

  it("leaves the correct hero grammar unchanged", () => {
    const correct = {
      hero: { headline_line2: "turns houses into homes.", description: "Custom homepage description" },
    };

    expect(normalizeHomepageClaims(correct)).toEqual(correct);
  });

  it("leaves unrelated custom copy unchanged", () => {
    const custom = {
      hero: { headline_line2: "Custom hero line", description: "Custom homepage description" },
      collage: { title: "Studio Collection", highlight: "Now" },
      about: { tagline: "Custom about tagline" },
      craft: { items: [{ title: "Custom process", kicker: "Custom", body: "Custom craft body" }] },
      gallery: { tagline: "Custom gallery tagline" },
      reasons: { items: [{ title: "Custom", body: "Custom body" }] },
      faq: { items: [{ q: "Custom?", a: "Custom answer" }] },
    };

    expect(normalizeHomepageClaims(custom)).toEqual(custom);
  });
});
