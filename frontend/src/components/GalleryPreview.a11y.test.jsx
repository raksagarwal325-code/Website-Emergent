import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("framer-motion", () => {
  const React = require("react");
  const stripMotionProps = ({
    initial,
    animate,
    exit,
    transition,
    variants,
    whileInView,
    viewport,
    whileHover,
    drag,
    dragConstraints,
    dragElastic,
    onDragEnd,
    custom,
    ...rest
  }) => rest;
  const make = (tag) => React.forwardRef(({ children, ...props }, ref) =>
    React.createElement(tag, { ref, ...stripMotionProps(props) }, children),
  );
  return {
    __esModule: true,
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: new Proxy({}, { get: (_, tag) => make(tag) }),
    useReducedMotion: () => true,
  };
});

jest.mock("../context/SettingsContext", () => ({
  __esModule: true,
  useSettings: () => ({
    hp: {
      gallery: {
        home_randomize: false,
        items: [
          { title: "Project One", location: "Delhi", images: ["/one.jpg"] },
          { title: "Project Two", location: "Mumbai", images: ["/two.jpg"] },
          { title: "Project Three", location: "Pune", images: ["/three.jpg"] },
        ],
      },
    },
  }),
}));

jest.mock("../lib/api", () => ({
  __esModule: true,
  api: { resolveImage: (url) => url },
}));

const GalleryPreview = require("./GalleryPreview").default;

beforeAll(() => {
  global.Image = class {
    set src(value) { this._src = value; }
  };
});

describe("GalleryPreview accessibility", () => {
  test("large side-image navigation buttons expose descriptive accessible names", () => {
    render(
      <MemoryRouter>
        <GalleryPreview />
      </MemoryRouter>,
    );

    const previous = screen.getByTestId("home-gallery-side-prev");
    const next = screen.getByTestId("home-gallery-side-next");

    expect(previous.tagName).toBe("BUTTON");
    expect(next.tagName).toBe("BUTTON");
    expect(previous.getAttribute("aria-label")).toMatch(/^Previous project: /);
    expect(next.getAttribute("aria-label")).toMatch(/^Next project: /);
    expect(previous.getAttribute("aria-label")).toContain("Project Three");
    expect(next.getAttribute("aria-label")).toContain("Project Two");
  });

  test("decorative thumbnails stay silent because the button itself carries the name", () => {
    render(
      <MemoryRouter>
        <GalleryPreview />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("home-gallery-side-prev").querySelector("img")?.getAttribute("alt")).toBe("");
    expect(screen.getByTestId("home-gallery-side-next").querySelector("img")?.getAttribute("alt")).toBe("");
  });
});
