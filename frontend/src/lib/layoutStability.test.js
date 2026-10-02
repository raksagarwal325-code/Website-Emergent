const fs = require("fs");
const path = require("path");

describe("layout stability guards", () => {
  test("gallery cards keep a fixed media aspect ratio", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "pages", "Gallery.jsx"),
      "utf8",
    );
    expect(source).toContain('className="aspect-[4/3] overflow-hidden');
    expect(source).not.toContain("setMediaAspect");
    expect(source).not.toContain("handleImageLoad");
  });

  test("catalogue reserves first-load grid space", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "components", "CatalogueBrowser.jsx"),
      "utf8",
    );
    expect(source).toContain('loading && products.length === 0 ? "min-h-[900px] sm:min-h-[1200px]"');
    expect(source).toContain('aria-busy={loading ? "true" : undefined}');
  });

  test("product cards keep a fixed media aspect ratio", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "components", "ProductCard.jsx"),
      "utf8",
    );
    expect(source).toContain('className="aspect-[4/5] overflow-hidden');
    expect(source).not.toContain("setMediaAspect");
    expect(source).not.toContain("aspectRatio: mediaAspect");
  });
});
