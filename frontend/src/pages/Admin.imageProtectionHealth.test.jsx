const fs = require("fs");
const path = require("path");

describe("Admin image protection health", () => {
  const source = fs.readFileSync(path.join(__dirname, "Admin.jsx"), "utf8");

  test("shows in-use protection health metrics", () => {
    expect(source).toContain('data-testid="image-protection-health"');
    expect(source).toContain('"In use"');
    expect(source).toContain('"Fully protected"');
    expect(source).toContain('"Missing SHA"');
    expect(source).toContain('"Missing dHash"');
    expect(source).toContain('"Failed in use"');
    expect(source).toContain('"Unused stored"');
  });

  test("shows failed image diagnostics when available", () => {
    expect(source).toContain('data-testid="image-protection-failures"');
    expect(source).toContain("Failed image diagnosis");
    expect(source).toContain("item.error");
    expect(source).toContain("item.failed_at");
  });
});
