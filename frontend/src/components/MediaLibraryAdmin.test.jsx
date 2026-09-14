import fs from "fs";
import { usageSummary } from "./MediaLibraryAdmin";
import path from "path";

describe("Admin Media Library", () => {
  const source = fs.readFileSync(path.join(__dirname, "MediaLibraryAdmin.jsx"), "utf8");
  const adminSource = fs.readFileSync(path.join(__dirname, "../pages/Admin.jsx"), "utf8");

  test("is available as a normal admin tab", () => {
    expect(adminSource).toContain('key: "media-library"');
    expect(adminSource).toContain("<MediaLibraryAdmin />");
  });

  test("exposes all fixed media usage types from the server", () => {
    expect(source).toContain("report.usage_types.map");
    expect(source).toContain("Upload as");
    expect(source).toContain("Scan metadata");
  });

  test("shows the requested operational findings and usage links", () => {
    expect(source).toContain("Broken references");
    expect(source).toContain("Potential duplicate groups");
    expect(source).toContain("Low-res images in use");
    expect(source).toContain("Products with verified missing lit/unlit pair");
    expect(source).toContain("usageSummary(asset.used_by)");
    expect(source).toContain("Edit product");
  });

  test("returns a list for unused assets so rendering never calls map on text", () => {
    expect(usageSummary([])).toEqual(["Not currently used"]);
    expect(usageSummary([{ type: "category", name: "Chandeliers" }])).toEqual([
      "Chandeliers · category",
    ]);
  });

  test("scans legacy files in short resumable batches", () => {
    expect(source).toContain("adminScanMediaLibrary(10)");
    expect(source).toContain("while (remaining > 0 && batches < 200)");
    expect(source).not.toContain("adminScanMediaLibrary(500)");
  });

  test("previews and explicitly confirms SOP recommendations", () => {
    expect(source).toContain("SOP recommendations");
    expect(source).toContain("Preview recommendations");
    expect(source).toContain("Confirm {selectedRecommendations.length} selected");
    expect(source).toContain('"video_reel"');
    expect(source).toContain('"installation"');
    expect(source).toContain("Not selected by default: visually verify bulb state first.");
    expect(source).toContain("adminApplyMediaRecommendations");
    expect(source).toContain("background analysis cannot independently verify bulb state");
  });

  test("uses the stable server asset id after upload", () => {
    expect(source).toContain("result.asset_id");
    expect(source).not.toContain("crypto.subtle");
  });
});
