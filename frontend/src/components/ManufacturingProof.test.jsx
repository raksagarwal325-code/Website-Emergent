import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ManufacturingProof from "./ManufacturingProof";
import { api } from "../lib/api";

describe("ManufacturingProof", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("resolves stored relative workshop video URLs through the configured backend origin", () => {
    jest.spyOn(api, "resolveImage").mockImplementation((u) => {
      if (!u) return "";
      return u.startsWith("/api/") ? `https://backend.example${u}` : u;
    });

    render(
      <MemoryRouter>
        <ManufacturingProof
          proof={{
            clips: [
              {
                key: "component-preparation",
                video_url: "/api/files/app/videos/example.mp4",
                caption: "Workshop clip",
              },
            ],
          }}
        />
      </MemoryRouter>
    );

    const video = screen.getByLabelText("Workshop clip");
    expect(video).toHaveAttribute("src", "https://backend.example/api/files/app/videos/example.mp4");
    expect(api.resolveImage).toHaveBeenCalledWith("/api/files/app/videos/example.mp4");
  });
});
