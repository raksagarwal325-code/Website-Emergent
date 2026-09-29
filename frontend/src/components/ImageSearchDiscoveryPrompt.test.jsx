import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ImageSearchDiscoveryPrompt from "./ImageSearchDiscoveryPrompt";

jest.mock("./CustomerImageSearch", () => function MockImageSearch({ onOpen }) {
  return <button type="button" onClick={onOpen}>Upload a photo</button>;
});

beforeEach(() => {
  window.sessionStorage.clear();
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 2000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 900 });
});

test("appears near the bottom with premium photo-search guidance", () => {
  render(
    <MemoryRouter initialEntries={["/catalog"]}>
      <ImageSearchDiscoveryPrompt />
    </MemoryRouter>
  );

  expect(screen.getByRole("dialog", { name: "Find a light from a photo" })).toBeInTheDocument();
  expect(screen.getByText(/Didn’t find the light you had in mind/i)).toBeInTheDocument();
  expect(screen.getByText(/room photos, screenshots and saved references/i)).toBeInTheDocument();
});

test("dismisses for the browsing session and stays out of admin", () => {
  const { unmount } = render(
    <MemoryRouter initialEntries={["/catalog"]}>
      <ImageSearchDiscoveryPrompt />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: "Dismiss photo search suggestion" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(window.sessionStorage.getItem("sge-image-search-seen")).toBe("1");

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
  expect(window.sessionStorage.getItem("sge-image-search-seen")).toBe("1");
});
