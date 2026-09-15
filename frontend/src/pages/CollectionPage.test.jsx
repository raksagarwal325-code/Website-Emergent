import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockApi = { getCollection: jest.fn() };
jest.mock("../lib/api", () => ({ api: mockApi }));
jest.mock("../components/SEO", () => () => null);
jest.mock("../components/ProductCard", () => ({ product }) => <div>{product.sku}</div>);

const CollectionPage = require("./CollectionPage").default;

test("loads a reviewed collection from its public detail endpoint", async () => {
  mockApi.getCollection.mockResolvedValue({
    slug: "meher",
    name: "Meher",
    title: "The Meher Collection",
    eyebrow: "A coordinated lighting family",
    description: "Coordinated Meher lighting.",
    items: [
      { id: "ch", sku: "SGE-CH-129", category: "Chandelier" },
      { id: "wl", sku: "SGE-WL-101", category: "Wall Light" },
    ],
  });

  render(<MemoryRouter initialEntries={["/collection/meher"]}><Routes><Route path="/collection/:slug" element={<CollectionPage />} /></Routes></MemoryRouter>);

  expect(await screen.findByRole("heading", { name: "The Meher Collection" })).toBeInTheDocument();
  expect(screen.getByText("SGE-CH-129")).toBeInTheDocument();
  expect(screen.getByText("SGE-WL-101")).toBeInTheDocument();
  expect(mockApi.getCollection).toHaveBeenCalledWith("meher");
});

test("shows not found when the public collection endpoint rejects", async () => {
  mockApi.getCollection.mockRejectedValue(new Error("not found"));

  render(<MemoryRouter initialEntries={["/collection/private"]}><Routes><Route path="/collection/:slug" element={<CollectionPage />} /></Routes></MemoryRouter>);

  expect(await screen.findByText("This collection is not available yet.")).toBeInTheDocument();
});
