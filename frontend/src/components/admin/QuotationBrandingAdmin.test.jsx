import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
jest.mock("../../lib/api", () => ({ api: {
  updateSettings: jest.fn(),
  adminUploadQuotationBrandAsset: jest.fn(),
  adminClearQuotationBrandAsset: jest.fn(),
  resolveImage: (url) => `https://samratglass.com${url}`,
} }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const QuotationBrandingAdmin = require("./QuotationBrandingAdmin").default;
const mockApi = require("../../lib/api").api;

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.adminUploadQuotationBrandAsset.mockResolvedValue({
    signature_url: "/api/files/signature.png",
    stamp_url: "",
  });
  mockApi.adminClearQuotationBrandAsset.mockResolvedValue({
    signature_url: "",
    stamp_url: "",
  });
});

test("uploads, previews and removes reusable quotation branding", async () => {
  const onSave = jest.fn();
  render(<QuotationBrandingAdmin settings={{ quotation_branding: {} }} onSave={onSave} />);

  const file = new File(["signature"], "signature.png", { type: "image/png" });
  fireEvent.change(screen.getByTestId("quotation-signature-upload"), { target: { files: [file] } });

  await waitFor(() => expect(mockApi.adminUploadQuotationBrandAsset).toHaveBeenCalledWith("signature", file));
  expect(await screen.findByAltText("Authorised signature preview")).toHaveAttribute(
    "src", "https://samratglass.com/api/files/signature.png",
  );

  fireEvent.click(screen.getByTestId("quotation-signature-remove"));
  await waitFor(() => expect(mockApi.adminClearQuotationBrandAsset).toHaveBeenCalledWith("signature"));
  expect(onSave).toHaveBeenCalledTimes(2);
});


test("saves owner-edited bank details as strings preserving leading zeroes", async () => {
  mockApi.updateSettings.mockResolvedValue({});
  render(<QuotationBrandingAdmin settings={{}} />);
  expect(screen.getByLabelText("Account number")).toHaveValue("097405000031");
  fireEvent.change(screen.getByLabelText("Account number"), { target: { value: "001234567890" } });
  fireEvent.click(screen.getByText("Save business details"));
  await waitFor(() => expect(mockApi.updateSettings).toHaveBeenCalledWith({ quotation_business: expect.objectContaining({ accountNumber: "001234567890" }) }));
});
