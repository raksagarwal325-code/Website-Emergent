import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("../components/SEO", () => () => null);
jest.mock("../components/SchemaLD", () => () => null);
jest.mock("../components/GuideProjectEvidence", () => () => null);

import GuidePage from "./GuidePage";

const cases = [
  ["choose-chandelier-size-room", /16 × 12 ft dining room/i, /28 inch chandelier/i],
  ["how-high-should-chandelier-hang", /120 in finished ceiling/i, /30 inch suspension/i],
  ["wall-light-installation-height", /60 in wide mirror/i, /showing centre spacing/i],
];

test.each(cases)("%s includes a worked example and labelled diagram", (slug, scenario, diagramName) => {
  render(
    <MemoryRouter initialEntries={[`/guides/${slug}`]}>
      <Routes><Route path="/guides/:slug" element={<GuidePage />} /></Routes>
    </MemoryRouter>,
  );
  expect(screen.getByTestId("guide-worked-example")).toHaveTextContent(scenario);
  expect(screen.getByRole("img", { name: diagramName })).toBeInTheDocument();
  expect(screen.getByText(/Confirm on site:/i)).toBeInTheDocument();
});
