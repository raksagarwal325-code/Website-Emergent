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

  test("product cards keep a fixed media aspect ratio and use responsive variants", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "components", "ProductCard.jsx"),
      "utf8",
    );
    expect(source).toContain('className="aspect-[4/5] overflow-hidden');
    expect(source).not.toContain("setMediaAspect");
    expect(source).not.toContain("aspectRatio: mediaAspect");
    expect(source).toContain('imageVariantUrl(img, 640)');
    expect(source).toContain('imageVariantSrcSet(img, [320, 640, 960])');
    expect(source).toContain('sizes="(max-width: 1279px) 50vw, (max-width: 1535px) 33vw, 25vw"');
    expect(source).toContain('preloader.src = imageVariantUrl(alternateUrl, 640)');
  });

  test("deferred homepage sections retain their reserved minimum height after mount", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "pages", "Home.jsx"),
      "utf8",
    );
    expect(source).toContain('<div ref={ref} style={{ minHeight }}>');
    expect(source).not.toContain('style={!ready ? { minHeight } : undefined}');
  });

  test("Google fonts avoid late metric swaps", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "..", "public", "index.html"),
      "utf8",
    );
    expect(source).toContain("&display=optional");
    expect(source).not.toContain("&display=swap");
  });
  test("gallery waits for public settings before rendering the archive", () => {
    const gallery = fs.readFileSync(
      path.join(__dirname, "..", "pages", "Gallery.jsx"),
      "utf8",
    );
    const settings = fs.readFileSync(
      path.join(__dirname, "..", "context", "SettingsContext.jsx"),
      "utf8",
    );
    expect(gallery).toContain("settingsReady");
    expect(gallery).toContain('data-testid="gallery-loading-skeleton"');
    expect(gallery).toContain("min-h-screen");
    expect(settings).toContain("const [settingsReady, setSettingsReady] = useState(false)");
    expect(settings).toContain("setSettingsReady(true)");
  });

});
