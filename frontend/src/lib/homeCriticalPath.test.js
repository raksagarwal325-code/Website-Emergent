const fs = require("fs");
const path = require("path");

describe("homepage critical path guards", () => {
  test("starts public settings during HTML parsing on the homepage only", () => {
    const html = fs.readFileSync(
      path.join(__dirname, "..", "..", "public", "index.html"),
      "utf8",
    );
    expect(html).toContain("window.location.pathname !== '/'");
    expect(html).toContain("window.__SGE_PUBLIC_SETTINGS_PROMISE__");
    expect(html).toContain("fetch('/api/settings'");
    expect(html).toContain("data-sge-hero-preload");
    expect(html).toContain("window.matchMedia('(min-width: 768px)').matches");
  });

  test("SettingsProvider reuses the HTML bootstrap with an API fallback", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "context", "SettingsContext.jsx"),
      "utf8",
    );
    expect(source).toContain("window.__SGE_PUBLIC_SETTINGS_PROMISE__");
    expect(source).toContain('if (!s) s = await api.getSettings()');
  });

  test("mobile intro keeps the full light-sweep sequence but removes the old idle tail", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "components", "WelcomeIntro.jsx"),
      "utf8",
    );
    expect(source).toContain("const INTRO_DURATION_DESKTOP_MS = 4800;");
    expect(source).toContain("const INTRO_DURATION_MOBILE_MS = 3600;");
    expect(source).toContain("duration: 1.7, delay: ready ? 1.7 : 0");
  });
});
