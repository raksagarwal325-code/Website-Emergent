import { pairProductFiles } from "./AIProductGenerator";

describe("AI bulk product image pairing", () => {
  const image = (name) => new File(["image"], name, { type: "image/png" });

  test("pairs numbered black and A-suffixed white images", () => {
    const rows = pairProductFiles([image("018A.png"), image("019.png"), image("018.png"), image("019A.png")]);
    expect(rows).toHaveLength(2);
    expect(rows[0].files.map((f) => f.name)).toEqual(["018.png", "018A.png"]);
    expect(rows[1].files.map((f) => f.name)).toEqual(["019.png", "019A.png"]);
  });

  test("keeps a single usable image as a reviewable product", () => {
    const [row] = pairProductFiles([image("single-product.png")]);
    expect(row.files).toHaveLength(1);
    expect(row.state).toBe("queued");
  });
});
