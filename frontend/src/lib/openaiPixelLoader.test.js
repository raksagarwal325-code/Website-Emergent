const fs = require("fs");
const path = require("path");

describe("OpenAI Ads loader", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "..", "public", "index.html"),
    "utf8",
  );

  test("keeps the oaiq queue and init available immediately", () => {
    expect(html).toContain("if (!window.oaiq)");
    expect(html).toContain("window.oaiq = q");
    expect(html).toContain("window.oaiq('init'");
  });

  test("defers the external SDK until interaction or after load", () => {
    expect(html).toContain("window.setTimeout(loadOaiPixel, 8000)");
    expect(html).toContain("window.addEventListener('load', scheduleOaiPixel");
    expect(html).toContain("window.addEventListener(eventName, loadOaiPixel");
    expect(html).toContain("https://bzrcdn.openai.com/sdk/oaiq.min.js");
  });

  test("still excludes DNT and admin routes", () => {
    expect(html).toContain("if (dnt || path.indexOf('/admin') === 0");
  });
});
