import { applyProductNotFoundSeoIfPresent, installProductNotFoundSeoGuard } from "./productNotFoundSeo";

describe("product not-found SEO guard", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/product/stale-product-id");
  });

  test("does nothing on normal pages", () => {
    expect(applyProductNotFoundSeoIfPresent()).toBe(false);
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  test("marks an in-page product 404 noindex and keeps the actual missing URL canonical", () => {
    document.body.innerHTML = '<div data-testid="product-not-found">Product not found</div>';
    expect(applyProductNotFoundSeoIfPresent()).toBe(true);
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex,follow");
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "https://samratglass.com/product/stale-product-id"
    );
  });

  test("observer applies the SEO state when the product 404 appears asynchronously", async () => {
    const uninstall = installProductNotFoundSeoGuard();
    const missing = document.createElement("div");
    missing.setAttribute("data-testid", "product-not-found");
    document.body.appendChild(missing);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex,follow");
    uninstall();
  });
});
