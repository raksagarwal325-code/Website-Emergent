import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockApi = {
  previewBulkProductUpdate: jest.fn(),
  applyBulkProductUpdate: jest.fn(),
};

jest.mock("../lib/api", () => ({ api: mockApi }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const BulkCatalogueManager = require("./BulkCatalogueManager").default;

const preview = {
  selected_count: 1,
  change_count: 1,
  unchanged_count: 0,
  preview_token: "a".repeat(64),
  items: [{
    id: "p1",
    name: "Rajsi Chandelier",
    sku: "SGE-CH-001",
    changes: [{ field: "status", old: "published", new: "draft" }],
  }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.previewBulkProductUpdate.mockResolvedValue(preview);
  mockApi.applyBulkProductUpdate.mockResolvedValue({ ok: true, updated_count: 1, ids: ["p1"] });
  window.confirm = jest.fn(() => true);
});

test("requires a preview and shows exact old and new values", async () => {
  render(
    <BulkCatalogueManager
      selectedIds={new Set(["p1"])}
      visibleProducts={[{ id: "p1", name: "Rajsi Chandelier" }]}
      categories={["Chandelier"]}
      onSelectVisible={jest.fn()}
      onClear={jest.fn()}
      onApplied={jest.fn()}
    />,
  );
  fireEvent.change(screen.getByTestId("bulk-status"), { target: { value: "draft" } });
  fireEvent.click(screen.getByTestId("bulk-preview"));
  await waitFor(() => expect(mockApi.previewBulkProductUpdate).toHaveBeenCalledWith(["p1"], { status: "draft" }));
  expect(screen.getByText("Rajsi Chandelier")).toBeInTheDocument();
  expect(screen.getByText("published")).toBeInTheDocument();
  expect(screen.getByText("draft")).toBeInTheDocument();
});

test("applies the exact preview token and refreshes", async () => {
  const onClear = jest.fn();
  const onApplied = jest.fn().mockResolvedValue(undefined);
  render(
    <BulkCatalogueManager
      selectedIds={new Set(["p1"])}
      visibleProducts={[{ id: "p1", name: "Rajsi Chandelier" }]}
      categories={["Chandelier"]}
      onSelectVisible={jest.fn()}
      onClear={onClear}
      onApplied={onApplied}
    />,
  );
  fireEvent.change(screen.getByTestId("bulk-status"), { target: { value: "draft" } });
  fireEvent.change(screen.getByTestId("bulk-reason"), { target: { value: "Catalogue review" } });
  fireEvent.click(screen.getByTestId("bulk-preview"));
  await screen.findByTestId("bulk-preview-panel");
  fireEvent.click(screen.getByTestId("bulk-apply"));
  await waitFor(() => expect(mockApi.applyBulkProductUpdate).toHaveBeenCalledWith(
    ["p1"], { status: "draft" }, preview.preview_token, "Catalogue review",
  ));
  expect(onClear).toHaveBeenCalled();
  expect(onApplied).toHaveBeenCalled();
});
