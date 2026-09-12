import fs from "fs";
import path from "path";

describe("Website Health growth deep links", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "WebsiteHealthGrowthPanels.jsx"), "utf8");

  test("collection findings link to the collection editor and public collection", () => {
    expect(source).toContain("/admin/collections?collection=");
    expect(source).toContain("/collection/");
  });

  test("project findings link to the project editor and public project", () => {
    expect(source).toContain("project-gallery");
    expect(source).toContain("/gallery/");
  });

  test("demand products expose public and admin actions", () => {
    expect(source).toContain("/product/");
    expect(source).toContain("tab=products&product=");
  });

  test("Search Console warning has a direct external action", () => {
    expect(source).toContain("https://search.google.com/search-console");
    expect(source).toContain("Open Search Console");
  });
});
