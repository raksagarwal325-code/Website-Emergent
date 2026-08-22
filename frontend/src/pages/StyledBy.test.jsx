import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

global.IntersectionObserver = MockIntersectionObserver;

jest.mock("../context/SettingsContext", () => ({
  useSettings: () => ({
    hp: {
      influencer_promotions: {
        eyebrow: "Featured Creators",
        title_pre: "As",
        title_highlight: "Styled By",
        subtitle: "Creator-styled spaces featuring Samrat Glass lighting.",
        items: [
          {
            input: "https://www.instagram.com/reel/ABC123/",
            handle: "sample_creator",
            thumbnail: "/images/sample.jpg",
            caption: "Sample styled look",
          },
        ],
      },
    },
  }),
}));

import StyledBy from "./StyledBy";

describe("StyledBy", () => {
  afterEach(() => {
    document.head
      .querySelectorAll('script[data-schema^="styled-by-"]')
      .forEach((node) => node.remove());
  });

  test("sets canonical metadata and creator-proof schemas", () => {
    render(
      <MemoryRouter>
        <StyledBy />
      </MemoryRouter>,
    );

    expect(document.title).toBe("As Styled By | Creator-Featured Samrat Glass Lighting");
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://samratglass.com/styled-by",
    );

    const collection = document.head.querySelector('script[data-schema="styled-by-collection-page"]');
    const breadcrumb = document.head.querySelector('script[data-schema="styled-by-breadcrumb"]');
    const parsed = JSON.parse(collection.textContent);

    expect(parsed["@type"]).toBe("CollectionPage");
    expect(parsed.mainEntity["@type"]).toBe("ItemList");
    expect(parsed.mainEntity.numberOfItems).toBe(1);
    expect(parsed.mainEntity.itemListElement[0].item.url).toBe(
      "https://www.instagram.com/reel/ABC123/",
    );
    expect(JSON.parse(breadcrumb.textContent)["@type"]).toBe("BreadcrumbList");
  });

  test("uses premium creator copy and links to supporting authority pages", () => {
    render(
      <MemoryRouter>
        <StyledBy />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Real homes. Distinctive spaces. Samrat Glass lighting, styled by creators."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Discover our lighting as it appears in thoughtfully styled interiors/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Discover more")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Inside our workshop/i })).toHaveAttribute(
      "href",
      "/craft#workshop",
    );
    expect(screen.getByRole("link", { name: /Real installations/i })).toHaveAttribute(
      "href",
      "/gallery",
    );
    expect(screen.getByRole("link", { name: /Manufacturer profile/i })).toHaveAttribute(
      "href",
      "/chandelier-manufacturer-india",
    );
    expect(screen.getByText("1 creator")).toBeInTheDocument();
  });
});
