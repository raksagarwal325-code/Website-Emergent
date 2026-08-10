/**
 * WhatsApp deep-link helper — public-CTA consistency tests.
 *
 * The site must NEVER prefill "Rakshit ji" or any other personal-name
 * greeting in a public CTA. Every public WhatsApp URL should start with
 * "Hi Samrat Glass Emporium," and end with the appropriate contextual
 * sentence for the entry point.
 */
import {
  WA_MESSAGES,
  buildWaLink,
  productMessage,
  cartMessage,
  galleryProductMessage,
  waGeneralLink,
  waCustomLightingLink,
  waArchitectsLink,
  waGalleryLink,
  waNotFoundLink,
  waProductLink,
  waGalleryProductLink,
  waCartLink,
} from "./whatsapp";

const NUMBER = "+91-89203-92937";

describe("WA_MESSAGES presets", () => {
  test("every preset opens with 'Hi Samrat Glass Emporium,'", () => {
    for (const [key, msg] of Object.entries(WA_MESSAGES)) {
      expect(msg.startsWith("Hi Samrat Glass Emporium,")).toBe(true);
    }
  });

  test("no preset contains 'Rakshit'", () => {
    for (const msg of Object.values(WA_MESSAGES)) {
      expect(msg.toLowerCase()).not.toMatch(/rakshit/);
    }
  });

  test("presets match the spec verbatim", () => {
    expect(WA_MESSAGES.general).toBe(
      "Hi Samrat Glass Emporium, I would like to know more about your lighting collection.",
    );
    expect(WA_MESSAGES.customLighting).toBe(
      "Hi Samrat Glass Emporium, I would like to discuss a custom lighting / bulk order requirement.",
    );
    expect(WA_MESSAGES.architects).toBe(
      "Hi Samrat Glass Emporium, I would like to discuss a lighting requirement for an architecture/interior project.",
    );
    expect(WA_MESSAGES.gallery).toBe(
      "Hi Samrat Glass Emporium, I would like to know more about this project/style and the lighting used in it.",
    );
  });
});

describe("productMessage / waProductLink", () => {
  test("includes brand prefix, product name, SKU and URL", () => {
    const msg = productMessage(
      { name: "Antique Wine Chandelier", sku: "SGE-CH-101" },
      "https://samratglass.com/product/xyz",
    );
    expect(msg.startsWith("Hi Samrat Glass Emporium,")).toBe(true);
    expect(msg).toContain("Antique Wine Chandelier");
    expect(msg).toContain("SGE-CH-101");
    expect(msg).toContain("https://samratglass.com/product/xyz");
  });

  test("omits SKU parens when SKU absent", () => {
    const msg = productMessage({ name: "Test Piece" });
    expect(msg).toContain("Test Piece");
    expect(msg).not.toMatch(/\(\)/);
  });

  test("waProductLink returns a wa.me URL with encoded message", () => {
    const url = waProductLink(NUMBER, { name: "X", sku: "S1" }, "https://x/y");
    expect(url.startsWith("https://wa.me/918920392937?text=")).toBe(true);
    const decoded = decodeURIComponent(url.split("?text=")[1]);
    expect(decoded).toContain("Hi Samrat Glass Emporium,");
    expect(decoded).toContain("X");
    expect(decoded).toContain("S1");
  });
});

describe("galleryProductMessage / waGalleryProductLink", () => {
  test("includes project title as context", () => {
    const msg = galleryProductMessage(
      { name: "Lantern", sku: "SGE-L-9" },
      { title: "Wine Cellar Firozabad" },
    );
    expect(msg).toContain("Lantern");
    expect(msg).toContain("SGE-L-9");
    expect(msg).toContain("Wine Cellar Firozabad");
    expect(msg.toLowerCase()).not.toContain("rakshit");
  });

  test("still works without a project title", () => {
    const msg = galleryProductMessage({ name: "Solo Piece" });
    expect(msg).toContain("Solo Piece");
    expect(msg.startsWith("Hi Samrat Glass Emporium,")).toBe(true);
  });
});

describe("cartMessage / waCartLink", () => {
  test("lists each cart item with name, SKU and quantity", () => {
    const msg = cartMessage([
      { name: "Piece A", sku: "SGE-A", quantity: 2 },
      { name: "Piece B", quantity: 1 },
    ]);
    expect(msg).toContain("Hi Samrat Glass Emporium,");
    expect(msg).toContain("- Piece A (SKU: SGE-A) (x2)");
    expect(msg).toContain("- Piece B (x1)");
  });
});

describe("buildWaLink phone normalisation", () => {
  test("strips non-digits from the number", () => {
    expect(buildWaLink("+91-892-039-2937", "hi").split("?")[0]).toBe(
      "https://wa.me/918920392937",
    );
  });

  test("returns empty string when no number is configured", () => {
    expect(buildWaLink("", "hi")).toBe("");
    expect(buildWaLink(null, "hi")).toBe("");
    expect(buildWaLink(undefined, "hi")).toBe("");
  });

  test("wraps message via encodeURIComponent (newlines/spaces safe)", () => {
    const url = buildWaLink("+91123", "line one\nline two");
    expect(url).toContain("line%20one%0Aline%20two");
  });
});

describe("convenience wrappers all use the reconciled messages", () => {
  test("waGeneralLink builds general message", () => {
    const url = waGeneralLink(NUMBER);
    const decoded = decodeURIComponent(url.split("?text=")[1]);
    expect(decoded).toBe(WA_MESSAGES.general);
  });

  test("waCustomLightingLink builds customLighting message", () => {
    const url = waCustomLightingLink(NUMBER);
    const decoded = decodeURIComponent(url.split("?text=")[1]);
    expect(decoded).toBe(WA_MESSAGES.customLighting);
  });

  test("waArchitectsLink builds architects message", () => {
    const url = waArchitectsLink(NUMBER);
    const decoded = decodeURIComponent(url.split("?text=")[1]);
    expect(decoded).toBe(WA_MESSAGES.architects);
  });

  test("waGalleryLink builds gallery message", () => {
    const url = waGalleryLink(NUMBER);
    const decoded = decodeURIComponent(url.split("?text=")[1]);
    expect(decoded).toBe(WA_MESSAGES.gallery);
  });

  test("waNotFoundLink builds notFound message (brand-led)", () => {
    const url = waNotFoundLink(NUMBER);
    const decoded = decodeURIComponent(url.split("?text=")[1]);
    expect(decoded.startsWith("Hi Samrat Glass Emporium,")).toBe(true);
  });

  test("waCartLink returns '' when number missing", () => {
    expect(waCartLink("", [])).toBe("");
  });

  test("waProductLink returns '' when number missing", () => {
    expect(waProductLink("", { name: "x" })).toBe("");
  });
});

// -------------------------------------------------------------------------
// Repo-wide invariant: no source file (other than the helper itself) may
// contain the string "Rakshit" in a public-facing WhatsApp CTA. This
// static check catches future regressions instantly.
// -------------------------------------------------------------------------
describe("Public source tree — no 'Rakshit' personal-name greetings", () => {
  const fs = require("fs");
  const path = require("path");

  const walk = (dir, out = []) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full, out);
      else if (/\.(jsx?|tsx?)$/.test(name)) out.push(full);
    }
    return out;
  };

  test("no public JS/JSX file contains 'Rakshit' in a WhatsApp prefill", () => {
    const root = path.resolve(__dirname, "..");
    const files = walk(root);
    const violations = [];
    for (const f of files) {
      // Skip test files, the helper (documents the anti-pattern), and
      // legitimate admin-only test fixtures.
      if (f.includes("__tests__") || f.endsWith(".test.js") || f.endsWith(".test.jsx"))
        continue;
      if (f.endsWith(path.join("lib", "whatsapp.js"))) continue;
      const contents = fs.readFileSync(f, "utf8");
      if (/rakshit/i.test(contents)) {
        // Allow references inside comments only if they contain "no personal-name".
        const hasBadPrefill = contents
          .split("\n")
          .some((line) =>
            /rakshit/i.test(line) &&
            !/no personal-name/i.test(line) &&
            !/anti-pattern/i.test(line),
          );
        if (hasBadPrefill) violations.push(f);
      }
    }
    expect(violations).toEqual([]);
  });
});
