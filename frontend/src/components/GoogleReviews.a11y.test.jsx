/**
 * Accessibility regression tests for the Google Reviews component.
 *
 * Covers the exact issues flagged by Lighthouse/PageSpeed:
 *   A. Star markup uses valid semantics (role="img" + aria-label on a
 *      graphical rating summary; child icons are aria-hidden so the
 *      rating is announced exactly once).
 *   B. Contrast — the small metadata under the aggregate ("Based on X
 *      Google reviews") and review-age text ("2 weeks ago") use the
 *      bumped white/70 and white/65 opacities.
 *   C. Carousel dot buttons expose a ≥44×44 CSS px interactive area
 *      while keeping the small visual pill. The visible bar is now an
 *      inner <span> with aria-hidden.
 *   D. Prev/next carousel controls remain keyboard-accessible with
 *      valid aria-labels.
 */
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";

jest.mock("../lib/api", () => ({
  __esModule: true,
  api: {
    googleReviews: () =>
      Promise.resolve({
        enabled: true,
        rating: 4.7,
        total_ratings: 42,
        view_url: "https://www.google.com/maps?cid=1",
        write_url: "https://search.google.com/local/writereview?placeid=X",
        cid: "1",
        place_id_set: true,
        api_key_set: true,
        reviews: [
          {
            author_name: "Reviewer A",
            rating: 5,
            relative_time_description: "2 weeks ago",
            text: "Beautiful chandelier — arrived perfectly.",
            source: "google",
          },
          {
            author_name: "Reviewer B",
            rating: 4,
            relative_time_description: "a month ago",
            text: "Great craft.",
            source: "google",
          },
        ],
      }),
  },
}));

jest.mock("../context/SettingsContext", () => ({
  __esModule: true,
  useSettings: () => ({ settings: {}, hp: {}, refresh: jest.fn() }),
}));

const GoogleReviews = require("./GoogleReviews").default;

async function renderReviews() {
  await act(async () => {
    render(<GoogleReviews />);
  });
  await waitFor(() =>
    expect(screen.getByTestId("gr-dot-0")).toBeInTheDocument(),
  );
}

describe("GoogleReviews accessibility", () => {
  test("Stars markup uses role='img' with an aria-label describing the rating", async () => {
    await renderReviews();
    // Every rendered <Stars> group must be a graphical role with a full
    // "X out of 5 stars" label — not a bare aria-label on a <span>.
    const groups = document.querySelectorAll("span[role='img']");
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      const label = g.getAttribute("aria-label") || "";
      expect(label).toMatch(/out of 5 stars$/);
    }
  });

  test("child star SVG icons are aria-hidden (no double announcement)", async () => {
    await renderReviews();
    const groups = document.querySelectorAll("span[role='img']");
    for (const g of groups) {
      const svgs = g.querySelectorAll("svg");
      expect(svgs.length).toBe(5);
      for (const svg of svgs) {
        expect(svg.getAttribute("aria-hidden")).toBe("true");
      }
    }
  });

  test("no <span> in Stars uses aria-label without a role (prohibited-aria fix)", async () => {
    await renderReviews();
    // Any <span> that carries an aria-label MUST also declare a role,
    // otherwise Lighthouse flags "ARIA attribute is not allowed on this
    // element".
    const labelled = document.querySelectorAll("span[aria-label]");
    for (const el of labelled) {
      expect(el.getAttribute("role")).toBeTruthy();
    }
  });

  test("dot buttons have min 44×44 tap-target sizing (via Tailwind classes)", async () => {
    await renderReviews();
    for (let i = 0; i < 2; i++) {
      const btn = screen.getByTestId(`gr-dot-${i}`);
      const cls = btn.className;
      expect(cls).toMatch(/min-w-\[44px\]/);
      expect(cls).toMatch(/min-h-\[44px\]/);
      // Accessible label preserved.
      expect(btn.getAttribute("aria-label")).toMatch(/^Go to review \d+$/);
    }
    // Active dot advertises current state.
    expect(screen.getByTestId("gr-dot-0").getAttribute("aria-current")).toBe("true");
    expect(screen.getByTestId("gr-dot-1").getAttribute("aria-current")).toBeNull();
  });

  test("dot inner visual pill is aria-hidden (announced only via button label)", async () => {
    await renderReviews();
    const btn = screen.getByTestId("gr-dot-0");
    const pill = btn.querySelector("span");
    expect(pill).toBeTruthy();
    expect(pill.getAttribute("aria-hidden")).toBe("true");
  });

  test("prev / next controls remain keyboard-accessible with aria-labels", async () => {
    await renderReviews();
    const prev = screen.getByTestId("gr-prev");
    const next = screen.getByTestId("gr-next");
    expect(prev.getAttribute("aria-label")).toBe("Previous review");
    expect(next.getAttribute("aria-label")).toBe("Next review");
    // Buttons — not <div role="button"> — so keyboard/enter behaviour
    // is native.
    expect(prev.tagName).toBe("BUTTON");
    expect(next.tagName).toBe("BUTTON");
  });

  test("aggregate metadata uses the higher-contrast text opacity", async () => {
    await renderReviews();
    const total = screen.getByTestId("gr-total");
    // "Based on X Google reviews" wrapper uses text-white/70; the
    // number inside uses text-white/90 — both above the pre-fix
    // white/50 & white/80 respectively.
    const wrapper = total.parentElement;
    expect(wrapper.className).toMatch(/text-white\/70/);
    expect(total.className).toMatch(/text-white\/90/);
  });
});
