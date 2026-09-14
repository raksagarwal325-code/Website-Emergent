import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductVersionHistory from "./ProductVersionHistory";

const mockApi = {
  listProductVersions: jest.fn(),
  restoreProductVersion: jest.fn(),
};

jest.mock("../lib/api", () => ({ api: mockApi }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const product = { id: "p1", name: "Rajsi Chandelier" };
const versions = [
  {
    id: "v2", version: 2, reason: "Corrected light count", edited_by: "admin@example.com",
    created_at: "2026-09-14T05:00:00Z", changes: [{ field: "specs.Lights", old: "8", new: "12" }],
  },
  {
    id: "v1", version: 1, reason: "Automatic restore point", edited_by: "admin@example.com",
    created_at: "2026-09-14T04:00:00Z", changes: [],
  },
];

beforeEach(() => {
  mockApi.listProductVersions.mockResolvedValue(versions);
  mockApi.restoreProductVersion.mockResolvedValue({ ...product, specs: { Lights: "8" } });
  window.confirm = jest.fn(() => true);
});

test("shows editor, reason and old/new field values", async () => {
  render(<ProductVersionHistory product={product} />);
  await waitFor(() => expect(mockApi.listProductVersions).toHaveBeenCalledWith("p1"));
  fireEvent.click(screen.getByTestId("version-history-toggle"));
  expect(screen.getByText("Corrected light count")).toBeInTheDocument();
  expect(screen.getAllByText("admin@example.com")).toHaveLength(2);
  expect(screen.getByText("8")).toBeInTheDocument();
  expect(screen.getByText("12")).toBeInTheDocument();
});

test("restores an older version and returns the refreshed product", async () => {
  const onRestored = jest.fn();
  render(<ProductVersionHistory product={product} onRestored={onRestored} />);
  await waitFor(() => expect(mockApi.listProductVersions).toHaveBeenCalled());
  fireEvent.click(screen.getByTestId("version-history-toggle"));
  fireEvent.click(screen.getByTestId("restore-version-1"));
  await waitFor(() => expect(mockApi.restoreProductVersion).toHaveBeenCalledWith("p1", "v1"));
  expect(onRestored).toHaveBeenCalledWith(expect.objectContaining({ specs: { Lights: "8" } }));
});
