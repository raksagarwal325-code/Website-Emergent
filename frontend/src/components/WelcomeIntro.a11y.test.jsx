import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WelcomeIntro from "./WelcomeIntro";

const MOTION_ONLY_PROPS = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "variants",
  "whileInView",
  "viewport",
]);

function MotionElement({ as: Tag, children, ...props }, ref) {
  const domProps = Object.fromEntries(
    Object.entries(props).filter(([key]) => !MOTION_ONLY_PROPS.has(key)),
  );
  return <Tag ref={ref} {...domProps}>{children}</Tag>;
}

const motionElement = (tag) => React.forwardRef((props, ref) => (
  <MotionElement as={tag} ref={ref} {...props} />
));

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    div: motionElement("div"),
    button: motionElement("button"),
    h2: motionElement("h2"),
    p: motionElement("p"),
  },
  useReducedMotion: () => false,
}));

jest.mock("../context/SettingsContext", () => ({
  useSettings: () => ({
    settings: { hero_image: "/hero.jpg" },
    hp: { atelier: { images: [] }, gallery: { items: [] } },
  }),
}));

jest.mock("../lib/api", () => ({
  api: { resolveImage: (src) => src },
}));

jest.mock("../lib/placeholders", () => ({
  BRAND_PLACEHOLDER_HERO: "/placeholder.jpg",
}));

describe("WelcomeIntro accessibility", () => {
  let previousMatchMedia;
  let previousRequestAnimationFrame;
  let previousCancelAnimationFrame;

  beforeEach(() => {
    window.sessionStorage.clear();
    previousMatchMedia = window.matchMedia;
    previousRequestAnimationFrame = window.requestAnimationFrame;
    previousCancelAnimationFrame = window.cancelAnimationFrame;

    window.matchMedia = jest.fn(() => ({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    window.requestAnimationFrame = (callback) => {
      callback();
      return 1;
    };
    window.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    window.matchMedia = previousMatchMedia;
    window.requestAnimationFrame = previousRequestAnimationFrame;
    window.cancelAnimationFrame = previousCancelAnimationFrame;
  });

  test("moves focus into the modal and keeps Tab focus inside", async () => {
    render(<WelcomeIntro />);

    const dialog = await screen.findByRole("dialog", {
      name: "Samrat Glass Emporium — A Legacy in Light",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");

    const dismissButton = screen.getByRole("button", { name: /Explore the Legacy/i });
    await waitFor(() => expect(dismissButton).toHaveFocus());

    fireEvent.keyDown(document, { key: "Tab" });
    expect(dismissButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(dismissButton).toHaveFocus();
  });

  test("Escape dismisses the modal and restores prior focus", async () => {
    const prior = document.createElement("button");
    prior.textContent = "Prior focus";
    document.body.appendChild(prior);
    prior.focus();

    const { unmount } = render(<WelcomeIntro />);

    await screen.findByRole("dialog", {
      name: "Samrat Glass Emporium — A Legacy in Light",
    });
    await waitFor(() => expect(screen.getByTestId("welcome-intro-skip")).toHaveFocus());

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(window.sessionStorage.getItem("sge-welcome-intro-seen-v13")).toBe("1");
    expect(prior).toHaveFocus();

    unmount();
    prior.remove();
  });
});
