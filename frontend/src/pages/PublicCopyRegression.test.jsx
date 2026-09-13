import fs from "fs";
import path from "path";

const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");
const RESPONSE_COPY = "We usually respond within a few business hours and aim to reply within one business day.";

describe("public copy and metadata regression", () => {
  test("product-detail template never renders raw product tags as visible DOM text", () => {
    const source = read("ProductDetail.jsx");
    expect(source).not.toContain("product.tags?.length");
    expect(source).not.toContain("product.tags.map");
  });

  test("product-detail inquiry copy does not promise an instant response", () => {
    const source = read("ProductDetail.jsx");
    expect(source).not.toContain("within minutes");
    expect(source).not.toContain("Chat instantly");
    expect(source).toContain(RESPONSE_COPY.slice(3));
  });

  test("contact and commercial landing pages use one response-time standard", () => {
    const contact = read("Contact.jsx");
    const custom = read("CustomLighting.jsx");
    const architects = read("ArchitectsDesigners.jsx");

    expect(contact).not.toContain("We'll reply within hours");
    expect(contact).not.toContain("We&apos;ll reply within hours");
    expect(architects).not.toContain("respond within a few hours during business days");

    expect(contact).toContain(RESPONSE_COPY);
    expect(custom).toContain(RESPONSE_COPY);
    expect(architects).toContain(RESPONSE_COPY);
  });

  test("customer pages contain no internal editorial or SEO instructions", () => {
    const sources = [
      read("../components/CategoryShowcase.jsx"),
      read("ChandelierManufacturerIndia.jsx"),
      read("GalleryProject.jsx"),
      read("Craft.jsx"),
      read("../components/ManufacturingProof.jsx"),
      read("../lib/legalContent.js"),
    ].join("\n");
    expect(sources).not.toContain("browsing feels continuous");
    expect(sources).not.toContain("search engines");
    expect(sources).not.toContain("deliberately avoids claiming");
    expect(sources).not.toContain("slogan added for search");
    expect(sources).not.toContain("this policy should be updated accordingly");
    expect(sources).not.toContain(">Manufacturing proof<");
  });

  test("returns copy separates custom-order change of mind from valid claims", () => {
    const legal = read("../lib/legalContent.js");
    expect(legal).toContain("Approved custom-made products are not eligible for change-of-mind returns");
    expect(legal).toContain("transit damage, wrong delivery or qualifying manufacturing defects");
    expect(legal).not.toContain('"Custom-made products after approval"');
  });

  test("obsolete Nagpur project slug has an explicit exact redirect", () => {
    const app = read("../App.js");
    expect(app).toContain('/gallery/noorvastra-etched-tulip-crystal-chandelier-custom-twelve-light-two-tier-installa');
    expect(app).toContain('to="/gallery/eight-to-twelve-light-crystal-chandelier-transformation-nagpur-residence" replace');
  });
});
