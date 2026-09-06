import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("../context/SettingsContext", () => ({
  useSettings: () => ({ settings: { whatsapp_number: "+918920392937" } }),
}));

jest.mock("../lib/whatsapp", () => ({
  waCustomLightingLink: () => "https://wa.me/918920392937",
}));

import DoubleHeightChandeliersIndia from "./DoubleHeightChandeliersIndia";

describe("DoubleHeightChandeliersIndia", () => {
  test("renders one commercial H1 and room-led guidance", () => {
    const { container } = render(
      <MemoryRouter>
        <DoubleHeightChandeliersIndia />
      </MemoryRouter>,
    );

    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/Double-Height Chandeliers/i);
    expect(screen.getByText(/A double-height chandelier is a spatial decision/i)).toBeInTheDocument();
    expect(screen.getByText(/Five inputs help narrow the right chandelier/i)).toBeInTheDocument();
    expect(screen.getByText(/Glass-led decorative lighting since 1981/i)).toBeInTheDocument();
  });

  test("sets canonical metadata and injects WebPage, breadcrumb and FAQ schemas", () => {
    render(
      <MemoryRouter>
        <DoubleHeightChandeliersIndia />
      </MemoryRouter>,
    );

    expect(document.title).toBe("Double-Height Chandeliers in India | Custom & Handcrafted | Samrat Glass");
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://samratglass.com/double-height-chandeliers-india",
    );

    const webpage = document.head.querySelector('script[data-schema="double-height-chandeliers-webpage"]');
    const breadcrumb = document.head.querySelector('script[data-schema="double-height-chandeliers-breadcrumb"]');
    const faq = document.head.querySelector('script[data-schema="double-height-chandeliers-faq"]');
    expect(JSON.parse(webpage.textContent)["@type"]).toBe("WebPage");
    expect(JSON.parse(breadcrumb.textContent)["@type"]).toBe("BreadcrumbList");
    expect(JSON.parse(faq.textContent)["@type"]).toBe("FAQPage");
    expect(JSON.parse(faq.textContent).mainEntity).toHaveLength(5);
  });

  test("links to tall-space products, guides, manufacturer evidence and enquiry paths", () => {
    render(
      <MemoryRouter>
        <DoubleHeightChandeliersIndia />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("link", { name: /Explore tall-space lighting/i })[0]).toHaveAttribute("href", "/space/double-height-staircase");
    expect(screen.getByRole("link", { name: /See manufacturer profile/i })).toHaveAttribute("href", "/chandelier-manufacturer-india");
    expect(screen.getByRole("link", { name: /Double-height living room chandeliers/i })).toHaveAttribute("href", "/guides/chandelier-double-height-living-room");
    expect(screen.getByRole("link", { name: /Request a quote/i })).toHaveAttribute("href", "/contact");
  });
});
