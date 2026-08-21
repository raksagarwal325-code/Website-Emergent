import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("../context/SettingsContext", () => ({
  useSettings: () => ({ settings: { whatsapp_number: "+918920392937" } }),
}));

jest.mock("../lib/whatsapp", () => ({
  waCustomLightingLink: () => "https://wa.me/918920392937",
}));

import ChandelierManufacturerIndia from "./ChandelierManufacturerIndia";

describe("ChandelierManufacturerIndia", () => {
  test("renders one authority H1 and factual manufacturer sections", () => {
    const { container } = render(
      <MemoryRouter>
        <ChandelierManufacturerIndia />
      </MemoryRouter>,
    );

    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/Chandelier Manufacturer in India/i);
    expect(screen.getByText(/A chandelier manufacturer rooted in Firozabad/i)).toBeInTheDocument();
    expect(screen.getByText(/What manufacturing means for a decorative-lighting project/i)).toBeInTheDocument();
    expect(screen.getByText(/Why Firozabad matters/i)).toBeInTheDocument();
  });

  test("sets canonical metadata and injects valid WebPage and breadcrumb schemas", () => {
    render(
      <MemoryRouter>
        <ChandelierManufacturerIndia />
      </MemoryRouter>,
    );

    expect(document.title).toBe("Chandelier Manufacturer in India | Firozabad Since 1981 | Samrat Glass");
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://samratglass.com/chandelier-manufacturer-india",
    );

    const webpage = document.head.querySelector('script[data-schema="chandelier-manufacturer-webpage"]');
    const breadcrumb = document.head.querySelector('script[data-schema="chandelier-manufacturer-breadcrumb"]');
    expect(JSON.parse(webpage.textContent)["@type"]).toBe("WebPage");
    expect(JSON.parse(breadcrumb.textContent)["@type"]).toBe("BreadcrumbList");
  });

  test("links to the chandelier collection, custom-lighting page, about and contact", () => {
    render(
      <MemoryRouter>
        <ChandelierManufacturerIndia />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("link", { name: /Explore chandeliers/i })[0]).toHaveAttribute("href", "/category/chandeliers");
    expect(screen.getByRole("link", { name: /Request custom lighting/i })).toHaveAttribute("href", "/custom-lighting-bulk-orders");
    expect(screen.getByRole("link", { name: /Read our story/i })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: /Request a quote/i })).toHaveAttribute("href", "/contact");
  });
});
