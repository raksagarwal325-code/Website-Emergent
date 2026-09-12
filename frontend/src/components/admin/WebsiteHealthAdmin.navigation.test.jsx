import fs from "fs";
import path from "path";

describe("Website Health tab architecture", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "WebsiteHealthAdminV2.jsx"), "utf8");
  const wrapper = fs.readFileSync(path.resolve(__dirname, "WebsiteHealthAdmin.jsx"), "utf8");

  test("live operations and catalogue growth are dedicated tabs", () => {
    expect(source).toContain('"operations", "Live Site Operations"');
    expect(source).toContain('"growth", "Catalogue Growth Controls"');
    expect(source).toContain("<WebsiteHealthOpsPanels />");
    expect(source).toContain("<WebsiteHealthGrowthPanels />");
    expect(wrapper).not.toContain("<WebsiteHealthOpsPanels />");
    expect(wrapper).not.toContain("<WebsiteHealthGrowthPanels />");
  });

  test("Needs Attention contains only the actionable published catalogue section", () => {
    expect(source).toContain("Only published products with actionable catalogue findings are shown here.");
    expect(source).toContain('"overview", "Catalogue Overview"');
  });

  test("category overview uses plain-language audit labels", () => {
    expect(source).toContain("Category Audit Summary");
    expect(source).toContain("SOP available");
    expect(source).toContain("Structure correct");
    expect(source).toContain("Unverified values accepted");
    expect(source).toContain("Facts still to verify");
    expect(source).toContain('row.sopCovered > 0 ? `${row.structuralPass} of ${row.sopCovered}` : "—"');
    expect(source).toContain("Structure correct does not mean product details or images have been verified.");
    expect(source).not.toContain("Category snapshot");
  });

  test("SOP compliance and findings expose direct product edit actions", () => {
    expect(source).toContain("Edit product");
    expect(source).toContain("tab=products&product=");
    expect(source).toContain('"completeness", "SOP Compliance"');
    expect(source).toContain("Structural SOP gaps");
    expect(source).not.toContain("Published completeness");
  });

  test("Release / Sync is renamed and explained as read-only Deployment Info", () => {
    expect(source).toContain('"deployment", "Deployment Info"');
    expect(source).toContain("What Deployment Info means");
    expect(source).not.toContain('"release", "Release / Sync"');
  });
});
