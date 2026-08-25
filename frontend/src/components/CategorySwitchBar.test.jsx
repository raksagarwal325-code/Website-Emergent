import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CategorySwitchBar from "./CategorySwitchBar";

const categories = [
  { slug: "chandeliers", label: "Chandeliers" },
  { slug: "hanging-lights", label: "Hanging Lights" },
  { slug: "wall-lights", label: "Wall Lights" },
  { slug: "table-lamps", label: "Table Lamps" },
];

test("renders every supplied category and marks the active category", () => {
  render(
    <MemoryRouter>
      <CategorySwitchBar categories={categories} activeSlug="wall-lights" />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "All" })).toBeInTheDocument();
  categories.forEach(({ label }) => {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  });
  expect(screen.getByRole("link", { name: "Wall Lights" })).toHaveAttribute("aria-current", "page");
});
