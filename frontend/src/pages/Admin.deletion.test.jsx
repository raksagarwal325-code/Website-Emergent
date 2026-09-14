import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockApi = {
  listAllProducts: jest.fn(() => Promise.resolve([])),
  adminGetSettings: jest.fn(() => Promise.resolve({})),
  stats: jest.fn(() => Promise.resolve({ products: 3, inquiries: 2, contact_messages: 4, reviews: 1 })),
  categories: jest.fn(() => Promise.resolve([])),
  adminReviewCounts: jest.fn(() => Promise.resolve({ pending: 0, approved: 0, rejected: 0 })),
};

jest.mock("../lib/api", () => ({
  __esModule: true,
  api: mockApi,
  compareBySku: (a, b) => (a?.sku || "").localeCompare(b?.sku || ""),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../components/AdminHomepage", () => () => <div />);
jest.mock("../components/AdminCatalogueExcelControl", () => () => <div />);
jest.mock("../components/AIProductGenerator", () => () => <div />);
jest.mock("../components/ProductNameSuggester", () => () => <div />);
jest.mock("../components/ProductFullRegenerator", () => () => <div />);
jest.mock("../components/ProductDraftConversation", () => () => <div />);
jest.mock("../components/admin/HeroSliderAdmin", () => () => <div />);
jest.mock("../components/admin/CategoryImagesAdmin", () => () => <div />);
jest.mock("../components/MediaLibraryAdmin", () => () => <div />);
jest.mock("../components/LeadsAdmin", () => () => <div data-testid="unified-leads">Unified Leads</div>);

const Admin = require("./Admin").default;

test("merges Inquiries and Messages navigation into one Leads workspace", async () => {
  render(<MemoryRouter><Admin /></MemoryRouter>);
  await waitFor(() => expect(mockApi.stats).toHaveBeenCalled());

  expect(screen.getByTestId("admin-tab-leads")).toBeInTheDocument();
  expect(screen.queryByTestId("admin-tab-inquiries")).toBeNull();
  expect(screen.queryByTestId("admin-tab-messages")).toBeNull();

  fireEvent.click(screen.getByTestId("admin-tab-leads"));
  expect(screen.getByTestId("unified-leads")).toBeInTheDocument();
});

test("dashboard identifies the combined legacy count as Website Leads", async () => {
  render(<MemoryRouter><Admin /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText("Website Leads")).toBeInTheDocument());
  expect(screen.getByText("6")).toBeInTheDocument();
});
