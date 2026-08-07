/**
 * Regression: Admin → Category Images list must stay in sync with the
 * curated category registry (categories.data.json).
 *
 * When a curator adds a category to the JSON registry we also need to
 * add it here so admins can pin a hero image for it. This test fails
 * fast if the two lists drift.
 */
import fs from "fs";
import path from "path";
import { PUBLIC_CATEGORIES } from "../../lib/categories";

// The admin list is defined at module top of CategoryImagesAdmin.jsx.
// Rather than importing the component (which drags in the whole admin
// bundle for a data-only test), parse the file and pull out the list.
function loadAdminCategoryList() {
  const src = fs.readFileSync(
    path.resolve(__dirname, "CategoryImagesAdmin.jsx"),
    "utf8",
  );
  // Match the CATEGORIES array literal.
  const m = src.match(/const CATEGORIES\s*=\s*\[([\s\S]*?)\];/);
  if (!m) throw new Error("Could not find CATEGORIES literal");
  const body = m[1];
  const rows = [];
  const rx = /db_name:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g;
  let hit;
  while ((hit = rx.exec(body)) !== null) {
    rows.push({ db_name: hit[1], label: hit[2] });
  }
  return rows;
}

describe("Admin → Category Images list stays synced with curated registry", () => {
  const adminList = loadAdminCategoryList();

  test("contains all 10 curated categories today", () => {
    const adminNames = adminList.map((c) => c.db_name).sort();
    const curatedNames = PUBLIC_CATEGORIES.map((c) => c.db_name).sort();
    expect(adminNames).toEqual(curatedNames);
    expect(adminList).toHaveLength(10);
  });

  test("Floor Chandeliers is manageable in Admin", () => {
    const row = adminList.find((c) => c.db_name === "Floor Chandelier");
    expect(row).toBeDefined();
    expect(row.label).toBe("Floor Chandeliers");
  });

  test("Table Chandeliers is manageable in Admin", () => {
    const row = adminList.find((c) => c.db_name === "Table Chandelier");
    expect(row).toBeDefined();
    expect(row.label).toBe("Table Chandeliers");
  });

  test("labels match curated registry labels", () => {
    for (const admin of adminList) {
      const curated = PUBLIC_CATEGORIES.find(
        (c) => c.db_name === admin.db_name,
      );
      expect(curated).toBeDefined();
      expect(admin.label).toBe(curated.label);
    }
  });
});
