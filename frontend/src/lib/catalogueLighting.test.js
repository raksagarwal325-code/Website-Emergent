import { describe, expect, it } from "vitest";
import { getCatalogueLightImages } from "./catalogueLighting";

describe("getCatalogueLightImages", () => {
  it("keeps legacy products unchanged when no lighting pair is configured", () => {
    expect(getCatalogueLightImages({ images: ["/primary.jpg", "/detail.jpg"] })).toEqual({
      off: "/primary.jpg",
      on: "/primary.jpg",
    });
  });

  it("uses dedicated off/on catalogue images when supplied", () => {
    expect(getCatalogueLightImages({
      images: ["/gallery.jpg"],
      catalog_image_off: "/white-off.jpg",
      catalog_image_on: "/black-on.jpg",
    })).toEqual({
      off: "/white-off.jpg",
      on: "/black-on.jpg",
    });
  });

  it("falls back to the off image when only an off image is configured", () => {
    expect(getCatalogueLightImages({
      images: ["/gallery.jpg"],
      catalog_image_off: "/white-off.jpg",
    })).toEqual({
      off: "/white-off.jpg",
      on: "/white-off.jpg",
    });
  });
});
