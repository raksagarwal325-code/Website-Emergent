import { imageVariantSrcSet, imageVariantUrl, staticImageVariantSrcSet, staticImageVariantUrl } from "./imageVariants";

describe("imageVariants", () => {
  test("maps internal product files to the WebP variant endpoint", () => {
    const src = "https://samratglass.com/api/files/lumiere-catalog/products/example.png";
    expect(imageVariantUrl(src, 640)).toBe(
      "https://samratglass.com/api/image-variant/640/lumiere-catalog/products/example.png",
    );
    test("maps approved static atelier images to responsive WebP variants", () => {
    expect(staticImageVariantUrl("/atelier-1.png", 640)).toBe(
      "/api/static-image-variant/640/atelier-1.png",
    );
    const set = staticImageVariantSrcSet("/atelier-5.png", [320, 640]);
    expect(set).toContain("/api/static-image-variant/320/atelier-5.png 320w");
    expect(set).toContain("/api/static-image-variant/640/atelier-5.png 640w");
  });

  test("leaves unrelated static assets unchanged", () => {
    expect(staticImageVariantUrl("/logo.jpeg", 640)).toBe("/logo.jpeg");
    expect(staticImageVariantSrcSet("/logo.jpeg", [320, 640])).toBeUndefined();
  });
});

  test("leaves non-product and unsupported widths unchanged", () => {
    const logo = "https://samratglass.com/logo.jpeg";
    expect(imageVariantUrl(logo, 640)).toBe(logo);
    const product = "https://samratglass.com/api/files/lumiere-catalog/products/example.png";
    expect(imageVariantUrl(product, 500)).toBe(product);
  });

  test("builds a responsive srcset from supported widths", () => {
    const src = "https://samratglass.com/api/files/lumiere-catalog/products/example.png";
    const set = imageVariantSrcSet(src, [320, 640]);
    expect(set).toContain("/api/image-variant/320/lumiere-catalog/products/example.png 320w");
    expect(set).toContain("/api/image-variant/640/lumiere-catalog/products/example.png 640w");
  });
});
