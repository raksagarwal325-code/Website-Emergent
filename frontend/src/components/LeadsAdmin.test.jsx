import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const mockApi = {
  adminLeads: jest.fn(),
  adminCreateLead: jest.fn(),
  adminUpdateLead: jest.fn(),
  adminAddLeadNote: jest.fn(),
};

jest.mock("../lib/api", () => ({
  __esModule: true,
  api: mockApi,
  formatPrice: (value) => `₹${value}`,
}));
jest.mock("../lib/gmailCompose", () => ({ gmailComposeUrl: () => "https://mail.google.com/" }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const LeadsAdmin = require("./LeadsAdmin").default;

const lead = (overrides = {}) => ({
  id: "manual:1",
  origin_type: "manual",
  customer_name: "Rita Sen",
  mobile: "+919876543210",
  email: "rita@example.com",
  city: "Delhi",
  source: "whatsapp",
  status: "new",
  message: "Need chandelier quote",
  requested_products: [{ name: "Crystal Chandelier", sku: "SGE-CH-001", quantity: 2 }],
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
  last_activity_at: "2026-09-01T10:00:00Z",
  follow_up_at: null,
  assigned_to: "",
  high_value: false,
  estimated_value: null,
  qualification: "",
  possible_duplicate: false,
  duplicate_lead_ids: [],
  activities: [],
  ...overrides,
});

const response = (leads) => ({
  leads,
  summary: { total: leads.length, open: leads.length, overdue: 0, high_value: 0, possible_duplicates: 0 },
  statuses: ["new", "contacted", "qualified", "quote_sent", "won", "lost"],
  sources: ["website_cart", "website_contact", "whatsapp", "google", "instagram", "pinterest", "referral", "walk_in", "manual", "other"],
});

beforeEach(() => {
  mockApi.adminLeads.mockResolvedValue(response([lead()]));
  mockApi.adminCreateLead.mockResolvedValue({ ok: true, lead_id: "manual:2" });
  mockApi.adminUpdateLead.mockResolvedValue({ ok: true });
  mockApi.adminAddLeadNote.mockResolvedValue({ ok: true });
});

test("loads a WhatsApp lead and exposes contact actions", async () => {
  render(<LeadsAdmin />);
  expect(await screen.findByText("Rita Sen")).toBeInTheDocument();
  expect(screen.getByText("SGE-CH-001", { exact: false })).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText("Expand lead"));
  expect(screen.getByText("Open WhatsApp")).toHaveAttribute("href", "https://wa.me/919876543210");
});

test("updates the six-stage pipeline status", async () => {
  render(<LeadsAdmin />);
  await screen.findByText("Rita Sen");
  fireEvent.change(screen.getByTestId("lead-status-manual:1"), { target: { value: "qualified" } });
  await waitFor(() => expect(mockApi.adminUpdateLead).toHaveBeenCalledWith("manual:1", { status: "qualified" }));
});

test("captures a manual WhatsApp lead", async () => {
  render(<LeadsAdmin />);
  await screen.findByText("Rita Sen");
  fireEvent.click(screen.getByTestId("new-lead-button"));
  const form = screen.getByTestId("new-lead-form");
  fireEvent.change(form.querySelector('input[required]'), { target: { value: "Anil Kumar" } });
  const inputs = form.querySelectorAll("input");
  fireEvent.change(inputs[1], { target: { value: "+919000000000" } });
  fireEvent.submit(form);
  await waitFor(() => expect(mockApi.adminCreateLead).toHaveBeenCalled());
  const payload = mockApi.adminCreateLead.mock.calls[0][0];
  expect(payload.customer_name).toBe("Anil Kumar");
  expect(payload.source).toBe("whatsapp");
});
