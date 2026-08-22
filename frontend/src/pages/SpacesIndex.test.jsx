import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SpacesIndex from "./SpacesIndex";

describe("SpacesIndex", () => {
  test("renders the complete Shop by Space directory", () => {
    const { container } = render(
      <MemoryRouter>
        <SpacesIndex />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: /Shop by Space/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Living Room/i })).toHaveAttribute("href", "/catalog?q=living%20room");
    expect(screen.getByRole("link", { name: /Double-Height & Staircase/i })).toHaveAttribute("href", "/catalog?q=double%20height");
    expect(screen.getByRole("link", { name: /Hotel & Hospitality/i })).toHaveAttribute("href", "/catalog?q=hotel");
    expect(screen.getByRole("link", { name: /Banquet & Event Space/i })).toHaveAttribute("href", "/catalog?q=banquet");
  });

  test("sets canonical metadata and ItemList schema", () => {
    render(
      <MemoryRouter>
        <SpacesIndex />
      </MemoryRouter>,
    );

    expect(document.title).toBe("Shop Lighting by Space · Living Room, Dining, Staircase & Hospitality · Samrat Glass");
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://samratglass.com/spaces",
    );

    const schema = document.head.querySelector('script[data-schema="spaces-item-list"]');
    const parsed = JSON.parse(schema.textContent);
    expect(parsed["@type"]).toBe("ItemList");
    expect(parsed.numberOfItems).toBe(9);
  });

  test("links custom projects to the existing custom-lighting page", () => {
    render(
      <MemoryRouter>
        <SpacesIndex />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Explore custom lighting/i })).toHaveAttribute(
      "href",
      "/custom-lighting-bulk-orders",
    );
  });
});
