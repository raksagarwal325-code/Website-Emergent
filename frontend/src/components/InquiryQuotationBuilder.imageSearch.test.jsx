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

  test("image search calls the protected quotation matcher and renders ranked matches", () => {
    expect(apiSource).toContain("matchQuotationProductByImage");
    expect(apiSource).toContain("/admin/quotations/product-match-by-image");
    expect(source).toContain("findImageMatches");
    expect(source).toContain('data-testid="quotation-image-search-results"');
    expect(source).toContain("Very likely product match");
    expect(source).toContain("visual_similarity");
  });

  test("matched catalogue product is only added after explicit confirmation", () => {
    expect(source).toContain("addImageMatch(match)");
    expect(source).toContain('onClick={() => addImageMatch(match)}');
    expect(source).not.toContain("imageMatches[0]");
  });
  test("image search is one request with no catalogue-index loop", () => {
    expect(source).toContain("await api.matchQuotationProductByImage(imageSearchFile, 5)");
    expect(source).not.toContain("for (let batch = 0; batch < 80; batch += 1)");
    expect(source).not.toContain('data-testid="quotation-image-index-progress"');
    expect(source).not.toContain("Preparing reusable visual catalogue index");
  });
});
