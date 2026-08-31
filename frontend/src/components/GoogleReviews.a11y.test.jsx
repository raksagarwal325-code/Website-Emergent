/**
 * Accessibility regression tests for the Google Reviews component.
 *
 * Covers rating semantics, contrast/tap targets, keyboard controls, and
 * motion controls for the auto-advancing review carousel.
 */
import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";

let mockReducedMotion = false;

jest.mock("framer-motion", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

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
  beforeEach(() => {
    mockReducedMotion = false;
  });

  test("Stars markup uses role='img' with an aria-label describing the rating", async () => {
    await renderReviews();
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
      expect(btn.getAttribute("aria-label")).toMatch(/^Go to review \d+$/);
    }
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
    expect(prev.tagName).toBe("BUTTON");
    expect(next.tagName).toBe("BUTTON");
  });

  test("aggregate metadata uses the higher-contrast text opacity", async () => {
    await renderReviews();
    const total = screen.getByTestId("gr-total");
    const wrapper = total.parentElement;
    expect(wrapper.className).toMatch(/text-white\/70/);
    expect(total.className).toMatch(/text-white\/90/);
  });

  test("provides a keyboard-operable pause and resume control", async () => {
    jest.useFakeTimers();
    try {
      await renderReviews();
      const first = screen.getByTestId("gr-review-0");
      const second = screen.getByTestId("gr-review-1");

      expect(first).toHaveAttribute("aria-hidden", "false");
      expect(second).toHaveAttribute("aria-hidden", "true");

      act(() => { jest.advanceTimersByTime(5000); });
      expect(first).toHaveAttribute("aria-hidden", "true");
      expect(second).toHaveAttribute("aria-hidden", "false");

      fireEvent.click(screen.getByRole("button", { name: "Pause review rotation" }));
      const resume = screen.getByRole("button", { name: "Resume review rotation" });
      expect(resume).toHaveAttribute("aria-pressed", "true");

      act(() => { jest.advanceTimersByTime(10000); });
      expect(second).toHaveAttribute("aria-hidden", "false");
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  test("pauses auto-rotation while keyboard focus is inside the carousel", async () => {
    jest.useFakeTimers();
    try {
      await renderReviews();
      const next = screen.getByRole("button", { name: "Next review" });
      fireEvent.focus(next);

      act(() => { jest.advanceTimersByTime(10000); });
      expect(screen.getByTestId("gr-review-0")).toHaveAttribute("aria-hidden", "false");
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  test("disables auto-rotation when reduced motion is preferred", async () => {
    jest.useFakeTimers();
    try {
      mockReducedMotion = true;
      await renderReviews();

      const toggle = screen.getByRole("button", { name: "Auto-rotation off" });
      expect(toggle).toBeDisabled();
      expect(toggle).toHaveAttribute("aria-pressed", "true");

      act(() => { jest.advanceTimersByTime(10000); });
      expect(screen.getByTestId("gr-review-0")).toHaveAttribute("aria-hidden", "false");
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });
});
