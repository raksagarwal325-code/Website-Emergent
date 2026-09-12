import fs from "fs";
import path from "path";

describe("Website Health growth deep links", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "WebsiteHealthGrowthPanels.jsx"), "utf8");

  test("collection findings link to the collection editor and public collection", () => {
    expect(source).toContain("/admin/collections?collection=");
    expect(source).toContain("/collection/");
  });

  test("orphan collection findings identify affected products", () => {
    expect(source).toContain("Orphan collection membership tag");
    expect(source).toContain("Affected product");
    expect(source).toContain("Edit product");
  });

  test("growth dashboard has a persistent section jump control", () => {
    expect(source).toContain("Jump to section");
    expect(source).toContain("health-collections");
    expect(source).toContain("health-projects");
    expect(source).toContain("health-routes");
    expect(source).toContain("health-demand");
  });

  test("project rows show exact linked catalogue product details", () => {
    expect(source).toContain("linked_product_details");
    expect(source).toContain("No catalogue product linked");
    expect(source).toContain("Edit project");
    expect(source).toContain("View product");
  });

  test("long structural findings are collapsible", () => {
    expect(source).toContain("<details");
    expect(source).toContain("Show findings (");
    expect(source).toContain("FindingsDisclosure");
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
