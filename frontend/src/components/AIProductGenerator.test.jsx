import { render, screen } from "@testing-library/react";
import { pairProductFiles, Status } from "./AIProductGenerator";

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

  test("pairs timestamp filenames sequentially in upload order", () => {
    const names = ["2026_03_57_18PM.png", "2026_03_57_22PM.png", "2026_05_13_43PM.png", "2026_05_13_49PM.png", "2026_12_06_01PM.png", "2026_12_06_06PM.png"];
    const rows = pairProductFiles(names.map(image));
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.files.map((file) => file.name))).toEqual([
      names.slice(0, 2), names.slice(2, 4), names.slice(4, 6),
    ]);
  });
});


describe("AI SOP result status", () => {
  test("does not label a draft ready when SOP validation failed", () => {
    render(<Status row={{ state: "ready", validation: ["Product name must end with Chandelier"] }} />);
    expect(screen.getByText("needs correction")).toBeInTheDocument();
    expect(screen.queryByText("ready")).not.toBeInTheDocument();
  });
});
