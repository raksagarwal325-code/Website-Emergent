const fs = require("fs");
const path = require("path");

describe("Admin image protection navigation", () => {
  const source = fs.readFileSync(path.join(__dirname, "Admin.jsx"), "utf8");

  test("image protection is a dedicated top-level admin tab", () => {
    expect(source).toContain('key: "image-protection"');
    expect(source).toContain('label: "Image Protection"');
    expect(source).toContain('tab === "image-protection"');
    expect(source).toContain('data-testid="admin-image-protection-tab"');
  });

  test("image protection is no longer nested inside Settings", () => {
    const settingsStart = source.indexOf('tab === "settings"');
    const settingsEnd = source.indexOf("function ProductsAdmin", settingsStart);
    const settingsBlock = source.slice(settingsStart, settingsEnd);
    expect(settingsBlock).not.toContain("<WatermarkAdmin");
  });

  test("dedicated tab renders the existing protection workspace", () => {
    const protectionStart = source.indexOf('tab === "image-protection"');
    const protectionEnd = source.indexOf('tab === "products"', protectionStart);
    const protectionBlock = source.slice(protectionStart, protectionEnd);
    expect(protectionBlock).toContain("<WatermarkAdmin");
  });
});
