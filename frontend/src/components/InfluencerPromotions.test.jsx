/**
 * Regression test — "As Styled By" carousel pagination.
 *
 * Bug: the dots row rendered one dot per raw item, so 27 valid entries
 *      produced 27 dots even though desktop shows 3 cards at a time
 *      (should have been 9 dots).
 * Fix: dots + arrow steps are page-based, not item-based, where
 *      pages = Math.ceil(validItems.length / visible).
 *
 * These tests drive the component directly via a stubbed SettingsContext
 * and window.matchMedia so we can force the "desktop" (3-per-view),
 * "tablet" (2-per-view) and "mobile" (1-per-view) branches deterministically.
 */
import React from "react";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- stub api + SettingsContext ---------------------------------------------
jest.mock("../lib/api", () => ({
  __esModule: true,
  api: { listAllProducts: jest.fn(() => Promise.resolve([])) },
}));

// framer-motion needs animationend + IntersectionObserver stubs; easier to
// stub the primitives we use to plain host elements.
jest.mock("framer-motion", () => ({
  __esModule: true,
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }) => {
      const React = require("react");
      const clean = { ...props };
      // strip motion-only props so React doesn't warn.
      ["initial","animate","whileInView","exit","transition","viewport","whileHover","whileTap"].forEach(k => delete clean[k]);
      return React.createElement(tag, clean, children);
    },
  }),
}));

const mockSettings = { hp: { influencer_promotions: null } };
jest.mock("../context/SettingsContext", () => ({
  __esModule: true,
  useSettings: () => mockSettings,
}));

// Card is rendered — but its exact DOM doesn't matter for the pagination
// tests, so stub it to keep the tree cheap and make displayable predictable.
jest.mock("./InfluencerCard", () => {
  const React = require("react");
  return {
    __esModule: true,
    // Displayable if input + handle + thumbnail are all non-empty strings.
    isDisplayable: (it) =>
      !!(
        (it?.input || "").trim() &&
        (it?.handle || "").trim() &&
        (it?.thumbnail || "").trim()
      ),
    InfluencerCard: ({ item }) => (
      <div data-testid={`influencer-card-${item.handle}`}>{item.handle}</div>
    ),
  };
});

const InfluencerPromotions = require("./InfluencerPromotions").default;

const makeItems = (n) =>
  Array.from({ length: n }, (_, i) => ({
    input: `https://instagram.com/p/x${i}`,
    handle: `@creator${i}`,
    thumbnail: `https://example.com/thumb${i}.jpg`,
  }));

// Force viewport width via matchMedia so useVisibleCount returns 1/2/3.
const setViewport = (mode /* "desktop" | "tablet" | "mobile" */) => {
  window.matchMedia = jest.fn().mockImplementation((query) => {
    const isDesktop = mode === "desktop" && query.includes("1024");
    const isTablet =
      (mode === "desktop" || mode === "tablet") && query.includes("640");
    const matches = isDesktop || isTablet;
    return {
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  });
};

const seed = (nItems, viewportMode) => {
  setViewport(viewportMode);
  mockSettings.hp = {
    influencer_promotions: {
      enabled: true,
      title_pre: "As Styled By",
      title_highlight: "our creators",
      items: makeItems(nItems),
    },
  };
};

const renderIt = () =>
  render(
    <MemoryRouter>
      <InfluencerPromotions />
    </MemoryRouter>,
  );

afterEach(() => cleanup());

describe("InfluencerPromotions — logical-page pagination", () => {
  test.each([
    // items, viewport,  expected dots
    [ 3, "desktop",  0], // 1 page → dots hidden
    [ 4, "desktop",  2], // ceil(4/3)
    [ 6, "desktop",  2], // ceil(6/3)
    [ 7, "desktop",  3], // ceil(7/3)
    [ 9, "desktop",  3], // ceil(9/3)
    [27, "desktop",  9], // reported case: 27 valid entries → 9 dots on desktop
    [ 2, "tablet",   0], // 1 page → dots hidden
    [ 5, "tablet",   3], // ceil(5/2)
    [27, "tablet",  14], // ceil(27/2)
    [ 1, "mobile",   0], // 1 page → dots hidden
    [ 5, "mobile",   5], // ceil(5/1)
    [27, "mobile",  27], // one dot per card on mobile is correct — 1 visible per page
  ])(
    "renders %i items on %s → %i dots",
    (nItems, viewportMode, expectedDots) => {
      seed(nItems, viewportMode);
      renderIt();
      const dots = screen.queryAllByTestId(/^influencer-carousel-dot-\d+$/);
      expect(dots.length).toBe(expectedDots);
    },
  );

  test("with only 3 valid items on desktop, prev/next arrows are also hidden", () => {
    seed(3, "desktop");
    renderIt();
    expect(screen.queryByTestId("influencer-carousel-dots")).toBeNull();
    expect(screen.queryByTestId("influencer-carousel-prev")).toBeNull();
    expect(screen.queryByTestId("influencer-carousel-next")).toBeNull();
  });

  test("clicking Next advances by ONE PAGE, not one card (desktop, 9 items)", () => {
    seed(9, "desktop"); // 3 dots
    renderIt();

    // dot 0 is initially active (28px wide vs 8px)
    const dot0 = screen.getByTestId("influencer-carousel-dot-0");
    const dot1 = screen.getByTestId("influencer-carousel-dot-1");
    expect(dot0.style.width).toBe("28px");
    expect(dot1.style.width).toBe("8px");

    // Clicking Next once should activate dot 1 (i.e. show cards 4-6),
    // not dot ? (partial-page shifted view).
    act(() => {
      fireEvent.click(screen.getByTestId("influencer-carousel-next"));
    });
    expect(dot1.style.width).toBe("28px");
    expect(dot0.style.width).toBe("8px");
  });

  test("clicking a page dot jumps directly to that logical page", () => {
    seed(27, "desktop"); // 9 dots
    renderIt();

    // Jump to page 5 (0-indexed 4).
    act(() => {
      fireEvent.click(screen.getByTestId("influencer-carousel-dot-4"));
    });
    expect(screen.getByTestId("influencer-carousel-dot-4").style.width).toBe("28px");
    // Every other dot must be the smaller inactive width.
    for (let i = 0; i < 9; i++) {
      if (i === 4) continue;
      expect(screen.getByTestId(`influencer-carousel-dot-${i}`).style.width).toBe("8px");
    }
  });

  test("prev wraps from page 0 back to the last page", () => {
    seed(9, "desktop"); // 3 pages (0,1,2)
    renderIt();

    act(() => {
      fireEvent.click(screen.getByTestId("influencer-carousel-prev"));
    });
    expect(screen.getByTestId("influencer-carousel-dot-2").style.width).toBe("28px");
  });

  test("hides pagination entirely when validItems ≤ visible (1 page)", () => {
    seed(3, "desktop"); // exactly one page on desktop
    renderIt();
    expect(screen.queryByTestId("influencer-carousel-dots")).toBeNull();
  });

  test("counts only DISPLAYABLE items (missing handle/thumb ignored)", () => {
    setViewport("desktop");
    mockSettings.hp = {
      influencer_promotions: {
        enabled: true,
        title_pre: "As Styled By",
        items: [
          ...makeItems(6), // 6 valid
          { input: "", handle: "", thumbnail: "" },       // filtered out
          { input: "x", handle: "@h", thumbnail: "" },    // filtered out
          { input: "x", handle: "", thumbnail: "t" },     // filtered out
        ],
      },
    };
    renderIt();
    const dots = screen.queryAllByTestId(/^influencer-carousel-dot-\d+$/);
    expect(dots.length).toBe(2); // ceil(6 / 3) = 2, ignoring the 3 bad entries
  });
});
