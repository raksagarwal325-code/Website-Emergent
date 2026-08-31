import { HOMEPAGE_DEFAULTS } from "./homepageDefaults";

describe("homepage defaults public claims", () => {
  test("About/reasons defaults do not contain legacy absolute claims", () => {
    const bodies = (HOMEPAGE_DEFAULTS.reasons?.items || []).map((item) => item.body);
    const joined = bodies.join("\n");

    expect(joined).not.toContain("Every piece is hand-blown, hand-cut and hand-assembled");
    expect(joined).not.toContain("Thousands of homes, hotels, restaurants and showrooms lit by Samrat");
    expect(joined).not.toContain("spiritual home of glass-making");

    expect(joined).toContain("Handcrafted and hand-assembled in Firozabad");
    expect(joined).toContain("Lighting supplied for homes, hotels, restaurants and showrooms across India");
    expect(joined).toContain("Based in Firozabad, one of India's best-known centres for glass-making");
  });
});
