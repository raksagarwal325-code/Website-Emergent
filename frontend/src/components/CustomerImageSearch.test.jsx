import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CustomerImageSearch, { makeSearchPreview } from "./CustomerImageSearch";
import { api } from "../lib/api";

jest.mock("../lib/api", () => ({ api: { searchByImage: jest.fn(), getImageSearchJob: jest.fn(), resolveImage: (x) => x } }));
const product = { id: "one", name: "Glass Chandelier", sku: "SGE-CH-001", images: ["/one.png"] };
const file = () => new File(["photo"], "light.png", { type: "image/png" });
const upload = (f = file()) => fireEvent.change(screen.getByLabelText("Upload image for product search"), { target: { files: [f] } });
const open = () => {
  render(<MemoryRouter><div className="relative"><CustomerImageSearch /></div></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Upload a photo to find exact or similar products" }));
};
beforeEach(() => {
  jest.clearAllMocks();
  global.createImageBitmap = jest.fn(async () => ({ width: 640, height: 960, close: jest.fn() }));
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: jest.fn() });
  jest.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,preview");
});
afterEach(() => jest.restoreAllMocks());

test("presents image search as a prominent labelled upload action", () => {
  render(<MemoryRouter><div className="relative"><CustomerImageSearch /></div></MemoryRouter>);
  const button = screen.getByRole("button", { name: "Upload a photo to find exact or similar products" });
  expect(button).toHaveTextContent("Upload photo");
  expect(button).toHaveClass("bg-[#D4AF37]");
});

test("renders a full-width landing-page call to action without catalogue positioning", () => {
  render(<MemoryRouter><CustomerImageSearch variant="landing" /></MemoryRouter>);
  const button = screen.getByRole("button", { name: "Upload a photo to find exact or similar products" });
  expect(button).toHaveTextContent("Upload a photo");
  expect(button).toHaveClass("w-full");
  expect(button).not.toHaveClass("absolute");
  fireEvent.click(button);
  expect(screen.getByRole("dialog", { name: "Find your light" })).toBeInTheDocument();
});

test("renders a permanent icon-only header trigger and opens image search", () => {
  render(<MemoryRouter><CustomerImageSearch variant="header" /></MemoryRouter>);
  const button = screen.getByRole("button", { name: "Search products using a photo" });
  expect(button).toHaveClass("h-10", "w-10");
  expect(button).not.toHaveTextContent("Upload");
  fireEvent.click(button);
  expect(screen.getByRole("dialog", { name: "Find your light" })).toBeInTheDocument();
});

test("uploads a photo and separates matching products from similar designs with working links", async () => {
  api.searchByImage.mockResolvedValue({ index_complete: true, similarity_available: true, available: true, matches: [{ product, match_type: "exact" }, { product: { ...product, id: "two", name: "Related Light", sku: "SGE-CH-002" }, match_type: "similar" }] });
  open(); upload();
  expect(await screen.findByText("Matching products")).toBeInTheDocument();
  expect(screen.getByText("Similar designs")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Glass Chandelier/ })).toHaveAttribute("href", "/product/glass-chandelier-sge-ch-001");
  expect(api.searchByImage).toHaveBeenCalledWith(expect.any(File), expect.any(AbortSignal));
});

test("polls a difficult search in the background and renders only its completed results", async () => {
  let releaseFirstPoll;
  api.searchByImage.mockResolvedValue({
    search_status: "processing", job_id: "a".repeat(32), poll_after_ms: 0,
    index_complete: true, similarity_available: true, available: true,
    matches: [{ product: { ...product, name: "Preliminary" }, match_type: "possible" }],
  });
  api.getImageSearchJob
    .mockImplementationOnce(() => new Promise((resolve) => { releaseFirstPoll = resolve; }))
    .mockResolvedValueOnce({
      search_status: "complete", index_complete: true, similarity_available: true, available: true,
      matches: [{ product: { ...product, name: "Final closest light" }, match_type: "closest" }],
    });
  open(); upload();
  expect(await screen.findByText(/Checking the full catalogue/)).toBeInTheDocument();
  expect(screen.queryByText("Preliminary")).not.toBeInTheDocument();
  await waitFor(() => expect(releaseFirstPoll).toBeDefined());
  await act(async () => releaseFirstPoll({ search_status: "processing", job_id: "a".repeat(32), poll_after_ms: 0 }));
  expect(await screen.findByText("Final closest light")).toBeInTheDocument();
  expect(api.getImageSearchJob).toHaveBeenCalledTimes(2);
});

test("closing cancels background polling", async () => {
  api.searchByImage.mockResolvedValue({
    search_status: "processing", job_id: "b".repeat(32), poll_after_ms: 10000, matches: [],
  });
  open(); upload();
  expect(await screen.findByText(/Checking the full catalogue/)).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(api.getImageSearchJob).not.toHaveBeenCalled();
});

test("rejects unsupported and oversized uploads before sending a request", () => {
  open(); upload(new File(["x"], "x.svg", { type: "image/svg+xml" }));
  expect(screen.getByRole("alert")).toHaveTextContent("JPG, PNG or WebP");
  const large = file(); Object.defineProperty(large, "size", { value: 11 * 1024 * 1024 }); upload(large);
  expect(screen.getByRole("alert")).toHaveTextContent("smaller than 10 MB");
  expect(api.searchByImage).not.toHaveBeenCalled();
});

test("closing cancels an in-flight request and restores focus", async () => {
  api.searchByImage.mockReturnValue(new Promise(() => {}));
  open(); upload();
  await waitFor(() => expect(api.searchByImage).toHaveBeenCalledTimes(1));
  const signal = api.searchByImage.mock.calls[0][1];
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(signal.aborted).toBe(true);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload a photo to find exact or similar products" })).toHaveFocus();
});

test("an older response cannot replace results for a newer upload", async () => {
  let resolveOld;
  api.searchByImage.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
  api.searchByImage.mockResolvedValueOnce({ matches: [], available: true, index_complete: true, similarity_available: true });
  open(); upload();
  await waitFor(() => expect(api.searchByImage).toHaveBeenCalledTimes(1));
  upload();
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


test("preview contains newly encoded PNG pixels and closes the decoded bitmap", async () => {
  const bitmap = { width: 640, height: 960, close: jest.fn() };
  global.createImageBitmap.mockResolvedValueOnce(bitmap);
  expect(await makeSearchPreview(file())).toBe("data:image/png;base64,preview");
  expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith("2d");
  expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith("image/png");
  expect(bitmap.close).toHaveBeenCalledTimes(1);
});

test("a file that cannot be decoded is rejected without calling the search API", async () => {
  global.createImageBitmap.mockRejectedValueOnce(new Error("Invalid image"));
  open(); upload();
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(api.searchByImage).not.toHaveBeenCalled();
});

test("renders tentative candidates separately without claiming an exact match", async () => {
  api.searchByImage.mockResolvedValue({ index_complete: true, similarity_available: true, available: true,
    matches: [{ product, match_type: "possible" }] });
  open(); upload();
  expect(await screen.findByText("Possible matches")).toBeInTheDocument();
  expect(screen.getByText(/tentative suggestions/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Glass Chandelier/ })).toBeInTheDocument();
  expect(screen.queryByText("Matching products")).not.toBeInTheDocument();
  expect(screen.queryByText("Similar designs")).not.toBeInTheDocument();
});

test("keeps exact and closest designs ahead of reviewed alternatives", async () => {
  api.searchByImage.mockResolvedValue({ index_complete: true, similarity_available: true, available: true,
    matches: ["exact", "closest", "related", "similar"].map((type, i) => ({
      product: { ...product, id: String(i), sku: "SGE-CH-00" + i, name: type + " light" }, match_type: type
    })) });
  open(); upload();
  await screen.findByText("Closest design");
  expect(screen.getAllByRole("heading", { level: 3 }).map(node => node.textContent)).toEqual([
    "Matching products", "Closest design", "Related designs", "Similar designs"
  ]);
  expect(screen.getByText(/confirm size, number of lights and finish/i)).toBeInTheDocument();
});
