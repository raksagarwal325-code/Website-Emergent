import { render } from "@testing-library/react";
import SEO from "./SEO";

describe("SEO social preview images", () => {
  test("uses the compact JPEG endpoint for uploaded product images", () => {
    render(
      <SEO
        title="Neelpushp Chandelier"
        description="Product description"
        path="/product/neelpushp-sge-ch-140"
        image="https://samratglass.com/api/files/lumiere-catalog/products/neelpushp.png"
        type="product"
      />,
    );

    const expected = "https://samratglass.com/api/social-preview/lumiere-catalog/products/neelpushp.png.jpg";
    expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute("content", expected);
    expect(document.head.querySelector('meta[property="og:image:secure_url"]')).toHaveAttribute("content", expected);
    expect(document.head.querySelector('meta[property="og:image:type"]')).toHaveAttribute("content", "image/jpeg");
    expect(document.head.querySelector('meta[name="twitter:image"]')).toHaveAttribute("content", expected);
  });

  test("keeps an external share image unchanged", () => {
    render(
      <SEO
        title="External image"
        description="Description"
        path="/example"
        image="https://images.example.com/share.jpg"
      />,
    );
    expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://images.example.com/share.jpg",
    );
  });
});
