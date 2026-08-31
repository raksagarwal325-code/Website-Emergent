import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";

jest.mock("../context/SettingsContext", () => ({
  useSettings: () => ({ settings: null }),
}));

jest.mock("../lib/whatsapp", () => ({
  waNotFoundLink: () => null,
}));

describe("NotFound technical SEO", () => {
  beforeEach(() => {
    document.head.querySelector('meta[name="robots"]')?.remove();
    document.head.querySelector('link[rel="canonical"]')?.remove();
    window.history.pushState({}, "", "/missing-page");
  });

  test("marks missing routes noindex,follow and keeps the missing URL canonical", async () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("page-not-found")).toBeInTheDocument();

    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
      expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
        "href",
        "https://samratglass.com/missing-page",
      );
    });
  });
});
