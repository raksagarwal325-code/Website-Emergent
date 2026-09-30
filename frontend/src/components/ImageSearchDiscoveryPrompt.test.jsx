import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ImageSearchDiscoveryPrompt from "./ImageSearchDiscoveryPrompt";

jest.mock("./CustomerImageSearch", () => function MockImageSearch({ onClose }) {
  return <button type="button" onClick={onClose}>Upload a photo</button>;
});

beforeEach(() => {
  window.sessionStorage.clear();
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 2000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 900 });
});

afterEach(() => jest.restoreAllMocks());

test("appears near the bottom with premium photo-search guidance", () => {
  render(
    <MemoryRouter initialEntries={["/catalog"]}>
      <ImageSearchDiscoveryPrompt />
    </MemoryRouter>
  );

  expect(screen.getByRole("dialog", { name: "Search for a product using a photo" })).toBeInTheDocument();
  expect(screen.getByText(/Seen a light you love/i)).toBeInTheDocument();
  expect(screen.getByText(/screenshot, room photo or saved image/i)).toBeInTheDocument();
});

test("dismisses for the browsing session and stays out of admin", () => {
  const { unmount } = render(
    <MemoryRouter initialEntries={["/catalog"]}>
      <ImageSearchDiscoveryPrompt />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: "Dismiss photo search suggestion" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(window.sessionStorage.getItem("sge-image-search-discovery-dismissed:/catalog")).toBe("1");

  jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback();
    return 1;
  });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 1900 });
  fireEvent.scroll(window);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  unmount();
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <ImageSearchDiscoveryPrompt />
    </MemoryRouter>
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("hands off to photo search without leaving the discovery card behind", () => {
  render(
    <MemoryRouter initialEntries={["/collections"]}>
      <ImageSearchDiscoveryPrompt />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: "Upload a photo" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(window.sessionStorage.getItem("sge-image-search-discovery-dismissed:/collections")).toBe("1");
});


test("appears on a long catalogue after meaningful browsing even when the page keeps growing", () => {
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 10000 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 1800 });

  render(
    <MemoryRouter initialEntries={["/catalog"]}>
      <ImageSearchDiscoveryPrompt />
    </MemoryRouter>
  );

  expect(screen.getByRole("dialog", { name: "Search for a product using a photo" })).toBeInTheDocument();
});
