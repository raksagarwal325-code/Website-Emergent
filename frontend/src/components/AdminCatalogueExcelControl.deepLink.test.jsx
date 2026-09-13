import fs from "fs";
import path from "path";

describe("Admin Website Health exact editor deep links", () => {
  const source = fs.readFileSync(path.join(__dirname, "AdminCatalogueExcelControl.jsx"), "utf8");
  const adminSource = fs.readFileSync(path.join(__dirname, "../pages/Admin.jsx"), "utf8");
  const appSource = fs.readFileSync(path.join(__dirname, "../App.js"), "utf8");

  test("Admin catalogue control resolves project query to the exact project editor", () => {
    expect(source).toContain('params.get("project")');
    expect(source).toContain("buildProjectSlugs(items)");
    expect(source).toContain('data-testid="project-editor-${index}"');
    expect(source).toContain('button[aria-expanded]');
    expect(source).toContain('scrollIntoView({ behavior: "smooth", block: "center" })');
  });

  test("Admin catalogue control resolves product query to the exact product editor", () => {
    expect(source).toContain('params.get("product")');
    expect(source).toContain('data-testid="edit-${requestedProduct}"');
    expect(source).toContain('data-testid="p-save-btn"');
    expect(source).toContain('requestedProduct ? "products"');
  });

  test("Admin tools stay in the dashboard flow instead of covering dashboard content", () => {
    expect(source).toContain('data-testid="admin-catalogue-tools"');
    expect(source).not.toContain('className="fixed left-4 bottom-4');
    expect(adminSource).toContain("<AdminCatalogueExcelControl />");
    expect(appSource).not.toContain("<><Admin /><AdminCatalogueExcelControl /></>");
  });

});
