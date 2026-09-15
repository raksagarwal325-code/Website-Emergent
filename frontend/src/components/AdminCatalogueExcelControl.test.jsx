import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockToast = { success: jest.fn(), error: jest.fn() };

jest.mock("sonner", () => ({ toast: mockToast }));
jest.mock("../lib/api", () => ({
  API: "https://example.com/api",
  api: { adminGetSettings: jest.fn() },
}));

const AdminCatalogueExcelControl = require("./AdminCatalogueExcelControl").default;

const jsonResponse = (payload, ok = true, status = 200) => ({
  ok,
  status,
  headers: { get: jest.fn(() => null) },
  json: jest.fn().mockResolvedValue(payload),
});

beforeEach(() => {
  mockToast.success.mockClear();
  mockToast.error.mockClear();
  global.fetch = jest.fn();
  window.history.replaceState({}, "", "/admin");
});

test("previews SKU-matched specification changes before applying them", async () => {
  global.fetch
    .mockResolvedValueOnce(jsonResponse({
      workbook_rows: 143,
      matched_count: 143,
      changed_product_count: 1,
      changed_field_count: 2,
      unchanged_count: 142,
      errors: [],
      can_apply: true,
      preview_token: "safe-preview-token",
      items: [{
        id: "p-1",
        sku: "SGE-HL-055",
        name: "Kandil Bell-Jar Hanging Light",
        row: 12,
        changes: [
          { field: "Spec: Glass Cut / Design", old: "Classic", new: "Dragon Crest" },
          { field: "Spec: Glass Colour", old: "Clear", new: "Emerald Green" },
        ],
      }],
    }))
    .mockResolvedValueOnce(jsonResponse({ updated_count: 1, changed_field_count: 1 }));

  render(<MemoryRouter><AdminCatalogueExcelControl /></MemoryRouter>);
  const file = new File(["xlsx"], "corrected-catalogue.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  fireEvent.change(screen.getByTestId("admin-catalogue-import-file"), { target: { files: [file] } });
  fireEvent.change(screen.getByTestId("admin-catalogue-import-reason"), {
    target: { value: "Verified Kandil specifications" },
  });
  fireEvent.click(screen.getByTestId("admin-preview-catalogue-import"));

  expect(await screen.findByTestId("admin-catalogue-import-preview")).toHaveTextContent(
    "1 products · 2 specification changes"
  );
  expect(screen.getByText("Dragon Crest")).toBeInTheDocument();
  expect(screen.getByText("Classic")).toBeInTheDocument();
  expect(screen.getByTestId("admin-catalogue-import-selected-count")).toHaveTextContent("2 of 2 changes selected");
  fireEvent.click(screen.getByLabelText("Select Spec: Glass Colour for SGE-HL-055"));
  expect(screen.getByTestId("admin-catalogue-import-selected-count")).toHaveTextContent("1 of 2 changes selected");
  expect(screen.getByTestId("admin-apply-catalogue-import")).toBeEnabled();

  fireEvent.click(screen.getByTestId("admin-apply-catalogue-import"));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  const [applyUrl, applyOptions] = global.fetch.mock.calls[1];
  expect(applyUrl).toBe("https://example.com/api/admin/catalogue/import/apply");
  expect(applyOptions.body.get("preview_token")).toBe("safe-preview-token");
  expect(applyOptions.body.get("reason")).toBe("Verified Kandil specifications");
  expect(JSON.parse(applyOptions.body.get("selected_changes"))).toEqual([{
    id: "p-1",
    fields: ["Spec: Glass Cut / Design"],
  }]);
  expect(applyOptions.body.get("file").name).toBe("corrected-catalogue.xlsx");
  await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("1 products updated · 1 specification changes"));
});

test("can unselect a whole product and restore all selections", async () => {
  global.fetch.mockResolvedValueOnce(jsonResponse({
    workbook_rows: 1,
    matched_count: 1,
    changed_product_count: 1,
    changed_field_count: 2,
    unchanged_count: 0,
    errors: [],
    can_apply: true,
    preview_token: "selectable",
    items: [{
      id: "p-1",
      sku: "SGE-HL-055",
      name: "Kandil Bell-Jar Hanging Light",
      row: 12,
      changes: [
        { field: "Spec: Glass Colour", old: "Clear", new: "Ruby Red" },
        { field: "Spec: Lights", old: "1", new: "3" },
      ],
    }],
  }));

  render(<MemoryRouter><AdminCatalogueExcelControl /></MemoryRouter>);
  fireEvent.change(screen.getByTestId("admin-catalogue-import-file"), {
    target: { files: [new File(["xlsx"], "catalogue.xlsx")] },
  });
  fireEvent.change(screen.getByTestId("admin-catalogue-import-reason"), { target: { value: "Review" } });
  fireEvent.click(screen.getByTestId("admin-preview-catalogue-import"));

  await screen.findByTestId("admin-catalogue-import-preview");
  fireEvent.click(screen.getByLabelText("Select all changes for SGE-HL-055"));
  expect(screen.getByTestId("admin-catalogue-import-selected-count")).toHaveTextContent("0 of 2 changes selected");
  expect(screen.getByTestId("admin-apply-catalogue-import")).toBeDisabled();
  fireEvent.click(screen.getByTestId("admin-toggle-all-catalogue-import"));
  expect(screen.getByTestId("admin-catalogue-import-selected-count")).toHaveTextContent("2 of 2 changes selected");
  expect(screen.getByTestId("admin-apply-catalogue-import")).toBeEnabled();
});

test("shows workbook identity errors and blocks apply", async () => {
  global.fetch.mockResolvedValueOnce(jsonResponse({
    workbook_rows: 2,
    matched_count: 1,
    changed_product_count: 1,
    changed_field_count: 1,
    unchanged_count: 0,
    errors: [{ row: 3, sku: "SGE-HL-999", message: "SKU does not exist in Admin." }],
    can_apply: false,
    preview_token: "blocked",
    items: [],
  }));

  render(<MemoryRouter><AdminCatalogueExcelControl /></MemoryRouter>);
  fireEvent.change(screen.getByTestId("admin-catalogue-import-file"), {
    target: { files: [new File(["xlsx"], "catalogue.xlsx")] },
  });
  fireEvent.change(screen.getByTestId("admin-catalogue-import-reason"), { target: { value: "Review" } });
  fireEvent.click(screen.getByTestId("admin-preview-catalogue-import"));

  expect(await screen.findByRole("alert")).toHaveTextContent("Row 3 · SGE-HL-999: SKU does not exist in Admin.");
  expect(screen.getByTestId("admin-apply-catalogue-import")).toBeDisabled();
});
