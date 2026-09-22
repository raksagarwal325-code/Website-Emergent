import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AIProductGenerator, { extractReferenceSkus, inferReferenceCategory, pairProductFiles, Status } from "./AIProductGenerator";
import { api } from "../lib/api";

jest.mock("../lib/api", () => ({ api: { adminProductSop: jest.fn() } }));

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
    expect(row.category).toBe("");
  });

  test("pairs timestamp filenames sequentially in upload order", () => {
    const names = ["2026_03_57_18PM.png", "2026_03_57_22PM.png", "2026_05_13_43PM.png", "2026_05_13_49PM.png", "2026_12_06_01PM.png", "2026_12_06_06PM.png"];
    const rows = pairProductFiles(names.map(image));
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.files.map((file) => file.name))).toEqual([
      names.slice(0, 2), names.slice(2, 4), names.slice(4, 6),
    ]);
  });

  test("keeps selected files after the file input is cleared", async () => {
    api.adminProductSop.mockResolvedValue({});
    render(<AIProductGenerator products={[]} />);
    const input = screen.getByTestId("ai-gen-file-input");
    fireEvent.change(input, { target: { files: [image("021.png"), image("021A.png")] } });
    expect(await screen.findByText("021.png + 021A.png")).toBeInTheDocument();
    expect(input.value).toBe("");
  });
});

describe("universal catalogue references", () => {
  test("expands shorthand references using the shared category prefix", () => {
    expect(extractReferenceSkus("matches FL-13 and 16; also SGE-WL-004")).toEqual([
      "SGE-FL-013", "SGE-FL-016", "SGE-WL-004",
    ]);
  });

  test("infers one category from exact normalized catalogue references", () => {
    const products = [
      { sku: "SGE-FL-013", category: "Floor Lamp" },
      { sku: "SGE-FL-016", category: "Floor Lamp" },
    ];
    expect(inferReferenceCategory("Rajsi family; matches FL-13 and 16", products)).toBe("Floor Lamp");
  });

  test("does not infer a category when any stated reference is missing", () => {
    const products = [{ sku: "SGE-FL-013", category: "Floor Lamp" }];
    expect(inferReferenceCategory("matches FL-13 and 16", products)).toBe("");
  });
});


describe("AI SOP result status", () => {
  test("does not label a draft ready when SOP validation failed", () => {
    render(<Status row={{ state: "ready", validation: ["Product name must end with Chandelier"] }} />);
    expect(screen.getByText("needs correction")).toBeInTheDocument();
    expect(screen.queryByText("ready")).not.toBeInTheDocument();
  });
});

describe("product AI identity", () => {
  test("shows the OpenAI model returned by the protected SOP endpoint", async () => {
    api.adminProductSop.mockResolvedValue({ version: "2026.09", ai: { label: "OpenAI", model: "gpt-5" } });
    render(<AIProductGenerator />);
    await waitFor(() => expect(screen.getByTestId("ai-product-generator")).toHaveTextContent(/SOP 2026\.09 · OpenAI gpt-5/i));
    expect(screen.getByText(/Every upload searches the full catalogue/i)).toBeInTheDocument();
  });

  test("explains automatic catalogue scanning without showing example facts as entered text", async () => {
    api.adminProductSop.mockResolvedValue({ version: "2026-09-22.1", ai: { label: "OpenAI", model: "gpt-5" } });
    render(<AIProductGenerator products={[]} />);
    expect(await screen.findByText(/Every upload searches the full catalogue/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type only confirmed family/i)).toHaveValue("");
    expect(screen.getByText(/The catalogue scan runs even when this is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Auto-detect category" })).toBeInTheDocument();
  });
});
