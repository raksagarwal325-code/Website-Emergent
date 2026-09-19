import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockUseSettings = jest.fn();
jest.mock("../../context/SettingsContext", () => ({
  useSettings: () => mockUseSettings(),
}));

const Footer = require("./Footer").default;

beforeEach(() => {
  mockUseSettings.mockReturnValue({
    settings: {
      brand_name: "Samrat Glass Emporium",
      whatsapp_number: "918920392937",
      admin_email: "samratglassemp@gmail.com",
      address: "Firozabad, Uttar Pradesh, India",
      business_hours: "Mon – Sat: 10:30 AM – 8:00 PM",
      gstin: "09ADCFS9258D1ZS",
    },
    hp: { footer: { description: "Handcrafted decorative lighting." } },
  });
});

test("mobile footer sections are collapsed and open independently", () => {
  render(<MemoryRouter><Footer /></MemoryRouter>);

  const explore = screen.getByTestId("footer-explore-toggle");
  const support = screen.getByTestId("footer-support-toggle");
  const legal = screen.getByTestId("footer-legal-toggle");
  const collections = screen.getByTestId("footer-collections-toggle");
  const contact = screen.getByTestId("footer-contact-toggle");

  [explore, support, legal, collections, contact].forEach((toggle) => {
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  expect(screen.getByTestId("footer-explore-content")).toHaveClass("hidden");
  fireEvent.click(explore);
  expect(explore).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByTestId("footer-explore-content")).not.toHaveClass("hidden");
  expect(support).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(explore);
  expect(explore).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByTestId("footer-explore-content")).toHaveClass("hidden");
});

test("accordion content keeps footer links rendered for navigation and crawling", () => {
  render(<MemoryRouter><Footer /></MemoryRouter>);

  expect(screen.getByTestId("footer-explore-catalog")).toHaveAttribute("href", "/catalog");
  expect(screen.getByTestId("footer-legal-privacy-policy")).toHaveAttribute("href", "/legal/privacy");
  expect(screen.getByTestId("footer-collections-chandeliers")).toHaveAttribute("href", "/category/chandeliers");
  expect(screen.getByTestId("footer-contact-email")).toHaveAttribute("href", "mailto:samratglassemp@gmail.com");
});
