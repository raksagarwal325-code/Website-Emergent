import { sanitizeSchemaData } from "./SchemaLD";

describe("sanitizeSchemaData", () => {
  test("removes an unverified Product transitTime while preserving India shipping destination", () => {
    const source = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Test light",
      offers: {
        "@type": "Offer",
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingDestination: {
            "@type": "DefinedRegion",
            addressCountry: "IN",
          },
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            transitTime: {
              "@type": "QuantitativeValue",
              minValue: 7,
              maxValue: 10,
              unitCode: "DAY",
            },
          },
        },
      },
    };

    const result = sanitizeSchemaData(source);

    expect(result.offers.shippingDetails.shippingDestination.addressCountry).toBe("IN");
    expect(result.offers.shippingDetails.deliveryTime).toBeUndefined();
    expect(source.offers.shippingDetails.deliveryTime.transitTime.minValue).toBe(7);
  });

  test("leaves non-Product schema unchanged", () => {
    const source = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Samrat Glass Emporium",
    };

    expect(sanitizeSchemaData(source)).toBe(source);
  });
});
