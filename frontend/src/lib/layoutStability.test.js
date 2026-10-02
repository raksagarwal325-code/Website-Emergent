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
    test("Google fonts avoid late metric swaps", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "..", "public", "index.html"),
      "utf8",
    );
    expect(source).toContain("&display=optional");
    expect(source).not.toContain("&display=swap");
  });
});

  test("catalogue mirrors the full first-load grid", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "components", "CatalogueBrowser.jsx"),
      "utf8",
    );
    expect(source).toContain("function CatalogueLoadingSkeleton()");
    expect(source).toContain('data-testid="catalogue-loading-skeleton"');
    expect(source).toContain("Array.from({ length: PAGE_SIZE }");
    expect(source).toContain('className="aspect-[4/5] bg-[#0e0510]"');
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
