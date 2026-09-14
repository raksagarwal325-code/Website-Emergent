import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockApi = {
  getCollectionsIndex: jest.fn(),
  resolveImage: jest.fn((value) => `https://example.com${value}`),
};

jest.mock("../lib/api", () => ({ api: mockApi }));
jest.mock("../components/SEO", () => () => null);

const CollectionsIndex = require("./CollectionsIndex").default;

beforeEach(() => {
  mockApi.getCollectionsIndex.mockImplementation(() => Promise.resolve([{
    slug: "rajsri",
    name: "Rajsri",
    description: "Coordinated lighting family.",
    piece_count: 5,
    category_count: 2,
    cover_image: "/rajsri.jpg",
    cover_sku: "SGE-TL-057",
  }]));
  mockApi.resolveImage.mockImplementation((value) => `https://example.com${value}`);
});

test("renders collection summaries from the single-purpose index endpoint", async () => {
  render(<MemoryRouter><CollectionsIndex /></MemoryRouter>);

  expect(await screen.findByRole("heading", { name: "Rajsri" })).toBeInTheDocument();
  expect(screen.getByText("5 pieces")).toBeInTheDocument();
  expect(screen.getByText("Cover · SGE-TL-057")).toBeInTheDocument();
  expect(mockApi.getCollectionsIndex).toHaveBeenCalledTimes(1);
});
