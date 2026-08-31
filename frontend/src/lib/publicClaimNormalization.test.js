import {
  normalizePublicSettings,
  normalizePublicLegalPage,
  PUBLIC_DELIVERY_INFO,
} from "./publicClaimNormalization";

describe("public claim normalization", () => {
  test("normalizes the legacy delivery-info setting without mutating source", () => {
    const source = {
      delivery_info: "Pan-India shipping · 7–10 business days",
      payment_methods: "UPI · Net Banking",
    };
    const result = normalizePublicSettings(source);

    expect(result).not.toBe(source);
    expect(result.delivery_info).toBe(PUBLIC_DELIVERY_INFO);
    expect(source.delivery_info).toBe("Pan-India shipping · 7–10 business days");
    expect(result.payment_methods).toBe("UPI · Net Banking");
  });

  test("leaves intentional custom delivery info unchanged", () => {
    const source = { delivery_info: "Delivery timing confirmed with quotation" };
    expect(normalizePublicSettings(source)).toBe(source);
  });

  test("normalizes the legacy Shipping Policy delivery timeline", () => {
    const source = {
      title: "Shipping & Delivery Policy",
      sections: [
        {
          heading: "Delivery Timeline",
          text: "Standard delivery usually takes 7–10 business days after order confirmation and payment, depending on product availability, customization, packing time, and delivery location.",
        },
        { heading: "Packaging", text: "Packed with care." },
      ],
    };

    const result = normalizePublicLegalPage("shipping", source);
    expect(result.sections[0].text).toContain("dispatch in 7–10 business days");
    expect(result.sections[0].text).toContain("transit time then varies by destination");
    expect(result.sections[1].text).toBe("Packed with care.");
    expect(source.sections[0].text).toContain("delivery usually takes 7–10 business days");
  });

  test("does not change other legal pages", () => {
    const source = { title: "Privacy Policy", sections: [] };
    expect(normalizePublicLegalPage("privacy", source)).toBe(source);
  });
});
