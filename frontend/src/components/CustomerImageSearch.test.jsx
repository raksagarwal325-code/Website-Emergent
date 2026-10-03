import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CustomerImageSearch, { makeSearchPreview } from "./CustomerImageSearch";
import { api } from "../lib/api";

jest.mock("../lib/api", () => ({ api: { searchByImage: jest.fn(), getImageSearchJob: jest.fn(), getSettings: jest.fn(), resolveImage: (x) => x } }));
const product = { id: "one", name: "Glass Chandelier", sku: "SGE-CH-001", images: ["/one.png"] };
const file = () => new File(["photo"], "light.png", { type: "image/png" });
const upload = (f = file()) => fireEvent.change(screen.getByLabelText("Upload image for product search"), { target: { files: [f] } });
const open = () => {
  render(<MemoryRouter><div className="relative"><CustomerImageSearch /></div></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Upload a photo to find exact or similar products" }));
};
beforeEach(() => {
  jest.clearAllMocks();
  api.getSettings.mockResolvedValue({ whatsapp_number: "+91 98765 43210" });
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
  expect(button.querySelector(".photo-search-glyph--prominent")).toBeInTheDocument();
  expect(button).not.toHaveClass("absolute");
  fireEvent.click(button);
  expect(screen.getByRole("dialog", { name: "Upload a photo. We’ll find the closest match." })).toHaveClass("image-search-dialog");
});

test("renders a labelled photo action for the unified search menu", () => {
  const onOpen = jest.fn();
  const onClose = jest.fn();
  render(<MemoryRouter><CustomerImageSearch variant="menu" onOpen={onOpen} onClose={onClose} /></MemoryRouter>);
  const button = screen.getByRole("button", { name: "Upload a photo to find exact or similar products" });
  expect(button).toHaveTextContent("Search with a photo");
  expect(button).toHaveClass("w-full");
  fireEvent.click(button);
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("dialog", { name: "Upload a photo. We’ll find the closest match." })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close image search" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("uploads a photo and separates matching products from similar designs with working links", async () => {
  api.searchByImage.mockResolvedValue({ index_complete: true, similarity_available: true, available: true, matches: [{ product, match_type: "exact" }, { product: { ...product, id: "two", name: "Related Light", sku: "SGE-CH-002" }, match_type: "similar" }] });
  open(); upload();
  expect(await screen.findByText("Your catalogue match")).toBeInTheDocument();
  expect(screen.getByText("Further pieces to consider")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Glass Chandelier/ })).toHaveAttribute("href", "/product/glass-chandelier-sge-ch-001");
  expect(api.searchByImage).toHaveBeenCalledWith(expect.any(File), expect.any(AbortSignal));
  expect(screen.getByText(/Not the light you had in mind/i)).toBeInTheDocument();
  expect(await screen.findByRole("link", { name: /Let our team help/i })).toBeInTheDocument();
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

test.each([
  ["WhatsApp-light.jpeg", "", "image/jpeg"],
  ["WhatsApp-light.jpg", "application/octet-stream", "image/jpeg"],
  ["WhatsApp-light.jpg", "image/jpg", "image/jpeg"],
])("normalizes Safari and WhatsApp image metadata for %s", async (name, type, expected) => {
  api.searchByImage.mockResolvedValue({ matches: [], available: true, index_complete: true, similarity_available: true });
  open();
  upload(new File(["photo"], name, { type }));
  await waitFor(() => expect(api.searchByImage).toHaveBeenCalledTimes(1));
  expect(api.searchByImage.mock.calls[0][0]).toHaveProperty("type", expected);
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
  expect(await screen.findByText(/No match yet\? Let our team take over/i)).toBeInTheDocument();
  expect(await screen.findByRole("link", { name: /Let our team help/i })).toHaveAttribute("href", expect.stringContaining("wa.me/919876543210"));
  await act(async () => resolveOld({ matches: [{ product, match_type: "exact" }] }));
  expect(screen.queryByText("Your catalogue match")).not.toBeInTheDocument();
});

test("shows partial-index and server error states without a stuck spinner", async () => {
  api.searchByImage.mockResolvedValueOnce({ matches: [], available: false, index_complete: false });
  open(); upload();
  expect(await screen.findByText(/visual catalogue is still preparing/i)).toBeInTheDocument();
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
  expect(await screen.findByText("Possibilities worth exploring")).toBeInTheDocument();
  expect(screen.getByText(/starting points/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Glass Chandelier/ })).toBeInTheDocument();
  expect(screen.queryByText("Your catalogue match")).not.toBeInTheDocument();
  expect(screen.queryByText("Further pieces to consider")).not.toBeInTheDocument();
});

test("keeps exact and closest designs ahead of reviewed alternatives", async () => {
  api.searchByImage.mockResolvedValue({ index_complete: true, similarity_available: true, available: true,
    matches: ["exact", "closest", "related", "similar"].map((type, i) => ({
      product: { ...product, id: String(i), sku: "SGE-CH-00" + i, name: type + " light" }, match_type: type
    })) });
  open(); upload();
  await screen.findByText("The closest expression we found");
  expect(screen.getAllByRole("heading", { level: 3 }).map(node => node.textContent)).toEqual([
    "Your catalogue match", "The closest expression we found", "In the same design language", "Further pieces to consider",
    "Not the light you had in mind?"
  ]);
  expect(screen.getByText(/confirm scale, light count and finish/i)).toBeInTheDocument();
});
