const fs = require("fs");
const path = require("path");

describe("Quotation search by image", () => {
  const source = fs.readFileSync(path.join(__dirname, "InquiryQuotationBuilder.jsx"), "utf8");
  const apiSource = fs.readFileSync(path.join(__dirname, "../lib/api.js"), "utf8");

  test("quotation builder offers image search alongside name / SKU search", () => {
    expect(source).toContain('data-testid="quotation-search-tab-image"');
    expect(source).toContain("Search by image");
    expect(source).toContain('data-testid="quotation-image-search"');
    expect(source).toContain('aria-label="Client image for catalogue search"');
  });

  test("quotation maker reuses the public exact-first catalogue search", () => {
    expect(apiSource).toContain("searchByImage");
    expect(apiSource).toContain('/search/image');
    expect(source).toContain("await api.searchByImage(selectedFile, controller.signal)");
    expect(source).toContain("await api.getImageSearchJob(result.job_id, controller.signal)");
    expect(source).toContain("Exact matches first · then closest and similar designs");
    expect(source).toContain("IMAGE_MATCH_LABELS[match.match_type]");
  });

  test("background results are polled without blocking quotation editing", () => {
    expect(source).toContain('result.search_status === "processing"');
    expect(source).toContain("waitForImageSearchPoll");
    expect(source).toContain("poll < 60");
    expect(source).toContain("requestId !== imageSearchSequence.current");
    expect(source).toContain("imageSearchController.current?.abort()");
  });

  test("the older quotation-only matcher and diagnostics are no longer used", () => {
    expect(source).not.toContain("matchQuotationProductByImage");
    expect(source).not.toContain("startQuotationImageDetailJob");
    expect(source).not.toContain("diagnoseImageSearch");
    expect(source).not.toContain('data-testid="quotation-image-search-diagnose"');
  });

  test("matched catalogue product is only added after explicit confirmation", () => {
    expect(source).toContain("addImageMatch(match)");
    expect(source).toContain('onClick={() => addImageMatch(match)}');
    expect(source).toContain("const product = match.product");
    expect(source).not.toContain("imageMatches[0]");
  });

  test("result limit and accepted file types match customer image search", () => {
    expect(source).toContain(".slice(0, 12)");
    expect(source).toContain("file.size > 10 * 1024 * 1024");
    expect(source).toContain('/^image\\/(jpeg|png|webp)$/');
  });
});
