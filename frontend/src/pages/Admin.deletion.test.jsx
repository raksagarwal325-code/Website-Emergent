/**
 * Batch B · Item 3 — Admin deletion controls for Enquiries + Messages.
 *
 * Isolates the two admin sub-components by importing them from a
 * dedicated sandbox harness that renders the same admin page under a
 * MemoryRouter. We stub the api layer end-to-end so no real network
 * requests occur.
 *
 * The tests cover:
 *   1. Enquiries tab: individual trash-icon delete opens the modal with
 *      the exact count, and confirming calls adminDeleteInquiry and
 *      refetches the list.
 *   2. Enquiries tab: "Select all visible" + "Delete selected" calls the
 *      bulk endpoint with the exact filtered ids.
 *   3. Messages tab: same bulk-delete flow (Select all → Delete selected).
 *   4. Fetch error surfaces a Retry UI (data-testid="inq-error") without
 *      crashing the page.
 *   5. Confirm modal shows the correct count ("Delete 2 enquiries?").
 *   6. Cancel closes the modal without calling any delete API.
 */
import React from "react";
import { render, screen, waitFor, fireEvent, act, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockApi = {
  listInquiries: jest.fn(),
  listContact: jest.fn(),
  adminDeleteInquiry: jest.fn(),
  adminBulkDeleteInquiries: jest.fn(),
  adminDeleteContactMessage: jest.fn(),
  adminBulkDeleteContactMessages: jest.fn(),
  // Every other api.* Admin.jsx touches on mount is mocked to a no-op.
  listAllProducts: jest.fn(() => Promise.resolve([])),
  getSettings: jest.fn(() => Promise.resolve({})),
  stats: jest.fn(() => Promise.resolve({ products: 0, inquiries: 0, contact_messages: 0, reviews: 0 })),
  categories: jest.fn(() => Promise.resolve([])),
  adminReviewCounts: jest.fn(() => Promise.resolve({ pending: 0, approved: 0, rejected: 0 })),
  updateInquiryStatus: jest.fn(() => Promise.resolve({ ok: true })),
};

jest.mock("../lib/api", () => ({
  __esModule: true,
  api: mockApi,
  compareBySku: (a, b) => (a?.sku || "").localeCompare(b?.sku || ""),
}));

jest.mock("../lib/gmailCompose", () => ({
  __esModule: true,
  gmailComposeUrl: () => "https://mail.google.com/mail/?view=cm&fs=1",
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Sub-components fetched by other admin tabs — we never switch to them
// but we still need render-safe stubs.
jest.mock("../components/AdminHomepage", () => () => <div />);
jest.mock("../components/AIProductGenerator", () => () => <div />);
jest.mock("../components/ProductNameSuggester", () => () => <div />);
jest.mock("../components/ProductFullRegenerator", () => () => <div />);
jest.mock("../components/admin/HeroSliderAdmin", () => () => <div />);
jest.mock("../components/admin/CategoryImagesAdmin", () => () => <div />);

const Admin = require("./Admin").default;

const seedInquiries = () => [
  {
    id: "inq-1",
    customer_name: "Rita Sen",
    customer_email: "rita@example.com",
    customer_phone: "+919000000001",
    message: "Chandelier price?",
    items: [],
    total: 0,
    status: "new",
    created_at: "2026-02-01T10:00:00Z",
  },
  {
    id: "inq-2",
    customer_name: "Anil K",
    customer_email: "anil@example.com",
    customer_phone: "+919000000002",
    message: "Bulk order",
    items: [],
    total: 0,
    status: "new",
    created_at: "2026-02-02T10:00:00Z",
  },
  {
    id: "inq-3",
    customer_name: "Meera",
    customer_email: "meera@example.com",
    customer_phone: "",
    message: "",
    items: [],
    total: 0,
    status: "closed",
    created_at: "2026-02-03T10:00:00Z",
  },
];

const seedMessages = () => [
  {
    id: "msg-1",
    name: "Alice",
    email: "alice@example.com",
    subject: "Hello",
    message: "Interested in a pendant",
    enquiry_type: "general",
    created_at: "2026-02-01T10:00:00Z",
  },
  {
    id: "msg-2",
    name: "Bob",
    email: "bob@example.com",
    subject: "Bulk",
    message: "Need 40 units",
    enquiry_type: "bulk",
    created_at: "2026-02-02T10:00:00Z",
  },
];

beforeEach(() => {
  // CRA sets `resetMocks: true`, so we must rewire EVERY implementation
  // before each test (mockClear is not enough — the whole implementation
  // is wiped between tests).
  mockApi.listInquiries.mockImplementation(() => Promise.resolve(seedInquiries()));
  mockApi.listContact.mockImplementation(() => Promise.resolve(seedMessages()));
  mockApi.adminDeleteInquiry.mockImplementation(() => Promise.resolve({ ok: true, deleted: 1 }));
  mockApi.adminBulkDeleteInquiries.mockImplementation(() => Promise.resolve({ ok: true, requested: 2, deleted: 2 }));
  mockApi.adminDeleteContactMessage.mockImplementation(() => Promise.resolve({ ok: true, deleted: 1 }));
  mockApi.adminBulkDeleteContactMessages.mockImplementation(() => Promise.resolve({ ok: true, requested: 2, deleted: 2 }));
  mockApi.listAllProducts.mockImplementation(() => Promise.resolve([]));
  mockApi.getSettings.mockImplementation(() => Promise.resolve({}));
  mockApi.stats.mockImplementation(() =>
    Promise.resolve({ products: 0, inquiries: 0, contact_messages: 0, reviews: 0 }),
  );
  mockApi.categories.mockImplementation(() => Promise.resolve([]));
  mockApi.adminReviewCounts.mockImplementation(() =>
    Promise.resolve({ pending: 0, approved: 0, rejected: 0 }),
  );
  mockApi.updateInquiryStatus.mockImplementation(() => Promise.resolve({ ok: true }));
});

const renderAdmin = () =>
  render(
    <MemoryRouter>
      <Admin />
    </MemoryRouter>,
  );

const openInquiriesTab = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId("admin-tab-inquiries"));
  });
  // Wait for the rows to render.
  await waitFor(() => expect(screen.getByTestId("inq-inq-1")).toBeInTheDocument());
};

const openMessagesTab = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId("admin-tab-messages"));
  });
  await waitFor(() => expect(screen.getByTestId("msg-msg-1")).toBeInTheDocument());
};

describe("Admin Enquiries — deletion controls", () => {
  test("individual trash icon opens confirm modal showing count=1", async () => {
    renderAdmin();
    await openInquiriesTab();

    await act(async () => {
      fireEvent.click(screen.getByTestId("inq-delete-inq-2"));
    });
    const modal = await screen.findByTestId("inq-delete-modal");
    expect(within(modal).getByTestId("inq-delete-modal-count").textContent).toBe("1");
    expect(modal.textContent).toMatch(/Delete 1 enquiry/i);
  });

  test("confirming a single delete calls the DELETE endpoint and refetches", async () => {
    renderAdmin();
    await openInquiriesTab();

    await act(async () => {
      fireEvent.click(screen.getByTestId("inq-delete-inq-1"));
    });
    await screen.findByTestId("inq-delete-modal");
    await act(async () => {
      fireEvent.click(screen.getByTestId("inq-delete-confirm"));
    });

    await waitFor(() => {
      expect(mockApi.adminDeleteInquiry).toHaveBeenCalledWith("inq-1");
    });
    // Refetch: listInquiries called at least twice (mount + after delete).
    expect(mockApi.listInquiries.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Bulk endpoint is NOT called for single delete.
    expect(mockApi.adminBulkDeleteInquiries).not.toHaveBeenCalled();
  });

  test("Cancel closes the modal without calling any delete endpoint", async () => {
    renderAdmin();
    await openInquiriesTab();

    await act(async () => {
      fireEvent.click(screen.getByTestId("inq-delete-inq-1"));
    });
    await screen.findByTestId("inq-delete-modal");

    await act(async () => {
      fireEvent.click(screen.getByTestId("inq-delete-cancel"));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("inq-delete-modal")).toBeNull();
    });
    expect(mockApi.adminDeleteInquiry).not.toHaveBeenCalled();
    expect(mockApi.adminBulkDeleteInquiries).not.toHaveBeenCalled();
  });

  test("Select All Visible + Delete Selected calls bulk endpoint with filtered ids only", async () => {
    renderAdmin();
    await openInquiriesTab();

    // Filter to "new" — this should show inq-1 and inq-2 only.
    await act(async () => {
      fireEvent.click(screen.getByTestId("inq-filter-new"));
    });

    // Select all visible.
    await act(async () => {
      fireEvent.click(screen.getByTestId("inq-select-all"));
    });
    expect(screen.getByTestId("inq-selected-count").textContent).toMatch(/2 selected/);

    // Click Delete Selected → open modal.
    await act(async () => {
      fireEvent.click(screen.getByTestId("inq-bulk-delete"));
    });
    const modal = await screen.findByTestId("inq-delete-modal");
    expect(within(modal).getByTestId("inq-delete-modal-count").textContent).toBe("2");
    expect(modal.textContent).toMatch(/Delete 2 enquiries/i);

    // Confirm.
    await act(async () => {
      fireEvent.click(screen.getByTestId("inq-delete-confirm"));
    });

    await waitFor(() => {
      expect(mockApi.adminBulkDeleteInquiries).toHaveBeenCalledTimes(1);
    });
    const [idsArg] = mockApi.adminBulkDeleteInquiries.mock.calls[0];
    // Only the filtered rows: inq-3 is "closed" and must NOT be in the payload.
    expect(idsArg.sort()).toEqual(["inq-1", "inq-2"]);
  });

  test("fetch error surfaces a retry UI without crashing", async () => {
    mockApi.listInquiries.mockRejectedValueOnce({ response: { status: 502 } });
    renderAdmin();
    await act(async () => {
      fireEvent.click(screen.getByTestId("admin-tab-inquiries"));
    });
    const errBox = await screen.findByTestId("inq-error");
    expect(errBox.textContent).toMatch(/couldn't load/i);
    expect(errBox.textContent).toMatch(/502/);
    expect(screen.getByTestId("inq-retry")).toBeInTheDocument();

    // Clicking Retry re-invokes listInquiries and (once the retry succeeds)
    // the error box disappears and rows are visible.
    mockApi.listInquiries.mockResolvedValueOnce(seedInquiries());
    await act(async () => {
      fireEvent.click(screen.getByTestId("inq-retry"));
    });
    await waitFor(() => expect(screen.queryByTestId("inq-error")).toBeNull());
    await waitFor(() => expect(screen.getByTestId("inq-inq-1")).toBeInTheDocument());
  });
});

describe("Admin Messages — deletion controls", () => {
  test("individual trash icon deletes a single message", async () => {
    renderAdmin();
    await openMessagesTab();

    await act(async () => {
      fireEvent.click(screen.getByTestId("msg-delete-msg-1"));
    });
    const modal = await screen.findByTestId("msg-delete-modal");
    expect(within(modal).getByTestId("msg-delete-modal-count").textContent).toBe("1");
    expect(modal.textContent).toMatch(/Delete 1 message/i);

    await act(async () => {
      fireEvent.click(screen.getByTestId("msg-delete-confirm"));
    });
    await waitFor(() => {
      expect(mockApi.adminDeleteContactMessage).toHaveBeenCalledWith("msg-1");
    });
  });

  test("Select All Visible + Delete Selected uses the bulk messages endpoint", async () => {
    renderAdmin();
    await openMessagesTab();

    await act(async () => {
      fireEvent.click(screen.getByTestId("msg-select-all"));
    });
    expect(screen.getByTestId("msg-selected-count").textContent).toMatch(/2 selected/);

    await act(async () => {
      fireEvent.click(screen.getByTestId("msg-bulk-delete"));
    });
    const modal = await screen.findByTestId("msg-delete-modal");
    expect(within(modal).getByTestId("msg-delete-modal-count").textContent).toBe("2");

    await act(async () => {
      fireEvent.click(screen.getByTestId("msg-delete-confirm"));
    });

    await waitFor(() => {
      expect(mockApi.adminBulkDeleteContactMessages).toHaveBeenCalledTimes(1);
    });
    const [idsArg] = mockApi.adminBulkDeleteContactMessages.mock.calls[0];
    expect(idsArg.sort()).toEqual(["msg-1", "msg-2"]);
  });

  test("messages fetch error surfaces a retry UI", async () => {
    mockApi.listContact.mockRejectedValueOnce(new Error("Network down"));
    renderAdmin();
    await act(async () => {
      fireEvent.click(screen.getByTestId("admin-tab-messages"));
    });
    const errBox = await screen.findByTestId("msg-error");
    expect(errBox.textContent).toMatch(/couldn't load messages/i);
    expect(screen.getByTestId("msg-retry")).toBeInTheDocument();
  });
});
