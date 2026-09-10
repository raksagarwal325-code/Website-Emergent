import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductDraftConversation from "./ProductDraftConversation";
import { api } from "../lib/api";

jest.mock("../lib/api", () => ({
  api: { aiReviseProductConversation: jest.fn() },
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

const product = {
  id: "draft-1",
  sku: "SGE-CH-114",
  category: "Chandelier",
  name: "Wrong Nine-Light Chandelier",
  images: ["/api/files/black.png", "/api/files/white.png"],
  specs: { "Number of Lights": "9" },
  status: "draft",
};

describe("ProductDraftConversation", () => {
  beforeEach(() => jest.clearAllMocks());

  test("sends a natural-language correction with draft, filenames and history", async () => {
    const revised = {
      ...product,
      name: "Diamond-Cut Dome Six-Light Heritage Chandelier",
      specs: { "Number of Lights": "6" },
    };
    api.aiReviseProductConversation.mockResolvedValue({
      action: "revision",
      message: "Corrected to six lights and rebuilt all SOP fields.",
      product: revised,
      validation: [],
      warnings: [],
    });
    const onApply = jest.fn();
    render(
      <ProductDraftConversation
        product={product}
        imageFilenames={["black.png", "white.png"]}
        onApply={onApply}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/For example/i), {
      target: { value: "It has 6 lights, not 9. Keep the title long." },
    });
    fireEvent.click(screen.getByLabelText("Send product correction"));

    await waitFor(() => expect(api.aiReviseProductConversation).toHaveBeenCalledTimes(1));
    expect(api.aiReviseProductConversation.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        product,
        instruction: "It has 6 lights, not 9. Keep the title long.",
        image_filenames: ["black.png", "white.png"],
      }),
    );
    await waitFor(() => expect(onApply).toHaveBeenCalledWith(
      revised,
      { validation: [], warnings: [] },
    ));
    expect(screen.getByText(/Corrected to six lights/i)).toBeInTheDocument();
  });

  test("keeps the draft unchanged when the assistant asks one question", async () => {
    api.aiReviseProductConversation.mockResolvedValue({
      action: "question",
      message: "What is the confirmed height?",
    });
    const onApply = jest.fn();
    render(<ProductDraftConversation product={product} onApply={onApply} />);
    fireEvent.change(screen.getByPlaceholderText(/For example/i), {
      target: { value: "Correct all missing details." },
    });
    fireEvent.click(screen.getByLabelText("Send product correction"));
    expect(await screen.findByText("What is the confirmed height?")).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });
});


  test("keeps the compact batch conversation collapsed until requested", () => {
    render(<ProductDraftConversation compact product={product} />);
    expect(screen.getByText("Correct this draft with AI")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/For example/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Correct this draft with AI"));
    expect(screen.getByPlaceholderText(/For example/i)).toBeInTheDocument();
  });
