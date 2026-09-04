import {
  CATALOGUE_LIGHT_MODE_STORAGE_KEY,
  getCatalogueLightImages,
  readCatalogueLightMode,
} from "./catalogueLighting";

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

describe("readCatalogueLightMode", () => {
  beforeEach(() => {
    window.localStorage.removeItem(CATALOGUE_LIGHT_MODE_STORAGE_KEY);
  });

  it("defaults new visitors to lights on", () => {
    expect(readCatalogueLightMode()).toBe("on");
  });

  it("preserves a visitor's explicit lights off choice", () => {
    window.localStorage.setItem(CATALOGUE_LIGHT_MODE_STORAGE_KEY, "off");
    expect(readCatalogueLightMode()).toBe("off");
  });
});
