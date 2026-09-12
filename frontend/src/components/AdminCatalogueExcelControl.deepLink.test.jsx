import fs from "fs";
import path from "path";

describe("Admin Website Health exact editor deep links", () => {
  test("Admin catalogue control resolves project query to the exact project editor", () => {
    const source = fs.readFileSync(path.join(__dirname, "AdminCatalogueExcelControl.jsx"), "utf8");
    expect(source).toContain('params.get("project")');
    expect(source).toContain("buildProjectSlugs(items)");
    expect(source).toContain('data-testid="project-editor-${index}"');
    expect(source).toContain('button[aria-expanded]');
    expect(source).toContain('scrollIntoView({ behavior: "smooth", block: "center" })');
  });
});
