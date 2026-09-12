const fs = require("fs");
const path = require("path");

describe("homepage canonical contract", () => {
  const root = path.resolve(__dirname, "..");
  const seoSource = fs.readFileSync(path.join(root, "components", "SEO.jsx"), "utf8");
  const homeSource = fs.readFileSync(path.join(root, "pages", "Home.jsx"), "utf8");

  test("SEO component writes canonicals against the production origin", () => {
    expect(seoSource).toContain('const PRODUCTION_ORIGIN = "https://samratglass.com"');
    expect(seoSource).toContain("setCanonical(url)");
  });

  test("Home declares the root canonical path", () => {
    expect(homeSource).toMatch(/<SEO[\s\S]*?path="\/"/);
  });
});
