import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ProjectStorytelling from "./ProjectStorytelling";

jest.mock("framer-motion", () => ({
  motion: {
    button: ({
      children,
      initial,
      whileInView,
      viewport,
      transition,
      animate,
      exit,
      variants,
      ...props
    }) => <button {...props}>{children}</button>,
  },
}));

jest.mock("../lib/api", () => ({
  api: { resolveImage: (src) => src },
}));

jest.mock("../lib/imageSeo", () => ({
  galleryImageAlt: ({ title, view }) => `${title} view ${view}`,
}));

describe("ProjectStorytelling", () => {
  const project = {
    title: "Private residence installation",
    location: "Mumbai, Maharashtra",
    note: "A verified project story.",
    fixture_details: "Eight-light configuration.",
    customisation: "Height reduced for the site.",
  };

  const productPresentation = {
    snapshotLabel: "Catalogue piece",
    snapshotValue: "Bagh-e-Noor — SGE-CH-094",
  };

  it("pins verified project information alongside every installation image", () => {
    const onImageOpen = jest.fn();
    render(
      <ProjectStorytelling
        project={project}
        images={["/one.jpg", "/two.jpg", "/three.jpg"]}
        productPresentation={productPresentation}
        linkedProducts={[{ id: "p1" }]}
        optionalSnapshot={[["Project type", "Private residence"], ["Architect / designer", ""]]}
        onImageOpen={onImageOpen}
      />
    );

    expect(screen.getByTestId("project-storytelling")).toBeInTheDocument();
    expect(screen.getByText("A verified project story.")).toBeInTheDocument();
    expect(screen.getByText("Eight-light configuration.")).toBeInTheDocument();
    expect(screen.getByText("Height reduced for the site.")).toBeInTheDocument();
    expect(screen.getByText("Mumbai, Maharashtra")).toBeInTheDocument();
    expect(screen.getByText("Bagh-e-Noor — SGE-CH-094")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(3);

    fireEvent.click(screen.getByTestId("project-story-image-1"));
    expect(onImageOpen).toHaveBeenCalledWith(1);
  });

  it("labels a standard catalogue setup as Configuration rather than Customisation", () => {
    const standardProject = {
      ...project,
      customisation: "Standard catalogue configuration",
    };

    render(
      <ProjectStorytelling
        project={standardProject}
        images={[]}
        productPresentation={productPresentation}
        linkedProducts={[{ id: "p1" }]}
        optionalSnapshot={[["Customisation", "Standard catalogue configuration"]]}
      />
    );

    expect(screen.getAllByText("Configuration")).toHaveLength(2);
    expect(screen.queryByText("Customisation")).toBeNull();
    expect(screen.getAllByText("Standard catalogue configuration")).toHaveLength(2);
  });
});
