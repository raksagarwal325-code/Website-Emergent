import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("../lib/api", () => ({ api: { getSettings: () => new Promise(() => {}) } }));
jest.mock("../components/GoogleReviews", () => () => null);
jest.mock("../components/SEO", () => () => null);
jest.mock("../lib/analytics", () => ({ trackGenerateLead: jest.fn() }));

import Contact from "./Contact";

test("main contact fields keep persistent visible labels", () => {
  render(<MemoryRouter><Contact /></MemoryRouter>);

  expect(screen.getByLabelText(/Full name/)).toHaveAttribute("id", "contact-name");
  expect(screen.getByLabelText(/Email/)).toHaveAttribute("id", "contact-email");
  expect(screen.getByLabelText(/Mobile \/ WhatsApp number/)).toHaveAttribute("id", "contact-phone");
  expect(screen.getByLabelText(/Enquiry type/)).toHaveAttribute("id", "enquiry-type");
  expect(screen.getByLabelText(/Subject/)).toHaveAttribute("id", "contact-subject");
  expect(screen.getByLabelText(/Your requirement/)).toHaveAttribute("id", "contact-message");
});
