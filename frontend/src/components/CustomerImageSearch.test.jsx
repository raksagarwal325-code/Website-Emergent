import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CustomerImageSearch from "./CustomerImageSearch";
import { api } from "../lib/api";

jest.mock("../lib/api", () => ({ api: { searchByImage: jest.fn(), resolveImage: (x) => x } }));
const product = { id: "one", name: "Glass Chandelier", sku: "SGE-CH-001", images: ["/one.png"] };
const file = () => new File(["photo"], "light.png", { type: "image/png" });
const upload = (f = file()) => fireEvent.change(screen.getByLabelText("Upload image for product search"), { target: { files: [f] } });
const open = () => {
  render(<MemoryRouter><div className="relative"><CustomerImageSearch /></div></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Search by image" }));
};
beforeEach(() => { jest.clearAllMocks(); URL.createObjectURL = jest.fn(() => "blob:reference"); URL.revokeObjectURL = jest.fn(); });

test("uploads a photo and separates matching products from similar designs with working links", async () => {
  api.searchByImage.mockResolvedValue({ index_complete: true, similarity_available: true, available: true, matches: [{ product, match_type: "exact" }, { product: { ...product, id: "two", name: "Related Light", sku: "SGE-CH-002" }, match_type: "similar" }] });
  open(); upload();
  expect(await screen.findByText("Matching products")).toBeInTheDocument();
  expect(screen.getByText("Similar designs")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Glass Chandelier/ })).toHaveAttribute("href", "/product/glass-chandelier-sge-ch-001");
  expect(api.searchByImage).toHaveBeenCalledWith(expect.any(File), expect.any(AbortSignal));
});

test("rejects unsupported and oversized uploads before sending a request", () => {
  open(); upload(new File(["x"], "x.svg", { type: "image/svg+xml" }));
  expect(screen.getByRole("alert")).toHaveTextContent("JPG, PNG or WebP");
  const large = file(); Object.defineProperty(large, "size", { value: 11 * 1024 * 1024 }); upload(large);
  expect(screen.getByRole("alert")).toHaveTextContent("smaller than 10 MB");
  expect(api.searchByImage).not.toHaveBeenCalled();
});

test("closing cancels an in-flight request and restores focus", () => {
  api.searchByImage.mockReturnValue(new Promise(() => {}));
  open(); upload();
  const signal = api.searchByImage.mock.calls[0][1];
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(signal.aborted).toBe(true);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Search by image" })).toHaveFocus();
});

test("an older response cannot replace results for a newer upload", async () => {
  let resolveOld;
  api.searchByImage.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
  api.searchByImage.mockResolvedValueOnce({ matches: [], available: true, index_complete: true, similarity_available: true });
  open(); upload(); upload();
  expect(await screen.findByText(/No close match found/)).toBeInTheDocument();
  await act(async () => resolveOld({ matches: [{ product, match_type: "exact" }] }));
  expect(screen.queryByText("Matching products")).not.toBeInTheDocument();
});

test("shows partial-index and server error states without a stuck spinner", async () => {
  api.searchByImage.mockResolvedValueOnce({ matches: [], available: false, index_complete: false });
  open(); upload();
  expect(await screen.findByText(/Image search is getting ready/)).toBeInTheDocument();
  api.searchByImage.mockRejectedValueOnce({ response: { data: { detail: "Image search is busy. Please try again shortly." } } });
  upload();
  expect(await screen.findByRole("alert")).toHaveTextContent("Image search is busy");
  await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
});
