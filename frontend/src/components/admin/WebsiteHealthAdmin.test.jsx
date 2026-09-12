import { buildWebsiteHealth, groupFindings, productCompleteness } from "./WebsiteHealthAdmin";

const healthyProduct = {
  id: "p1",
  sku: "SGE-CH-001",
  name: "Rajsi Diamond-Cut Glass Eight-Light Chandelier",
  category: "Chandelier",
  status: "published",
  price_display: "starting_from",
  short_description: "A detailed handcrafted decorative chandelier made for refined interiors and ambient lighting.",
  description: "This handcrafted Firozabad glass chandelier uses cut-glass detailing, balanced proportions and a decorative multi-light form intended for residential and project interiors. The description is deliberately long enough for the health-check threshold.",
  images: ["/api/files/products/a.jpg", "/api/files/products/b.jpg"],
  tags: ["heritage", "cut-glass"],
  specs: { Lights: "8", Material: "Cut glass" },
  seo_slug: "rajsi-diamond-cut-glass-eight-light-chandelier-sge-ch-001",
};

test("healthy product reaches full completeness", () => {
  const result = productCompleteness(healthyProduct);
  expect(result.score).toBe(100);
  expect(result.missing).toEqual([]);
});

test("health audit counts affected published products instead of raw findings", () => {
  const products = [
    healthyProduct,
    {
      ...healthyProduct,
      id: "p2",
      sku: "SGE-CH-002",
      name: "Second Published Chandelier",
      images: [],
      short_description: "",
      description: "",
      specs: {},
    },
  ];

  const health = buildWebsiteHealth(products);

  expect(health.productsNeedingAttention).toBe(1);
  expect(health.criticalPublishedProducts).toBe(1);
  expect(health.publishedAttention.filter((item) => item.product.id === "p2").length).toBeGreaterThan(1);
});

test("draft findings are separated from published-site headline metrics", () => {
  const draft = {
    ...healthyProduct,
    id: "draft-1",
    sku: "DRAFT-1",
    name: "Hidden Draft",
    status: "draft",
    images: [],
    short_description: "",
    description: "",
    specs: {},
    tags: [],
    seo_slug: "",
  };

  const health = buildWebsiteHealth([healthyProduct, draft]);

  expect(health.publishedCount).toBe(1);
  expect(health.draftCount).toBe(1);
  expect(health.productsNeedingAttention).toBe(0);
  expect(health.draftAttention.length).toBeGreaterThan(0);
});

test("groupFindings combines multiple issues for the same product", () => {
  const health = buildWebsiteHealth([{
    ...healthyProduct,
    id: "p2",
    sku: "SGE-CH-002",
    images: [],
    short_description: "",
    description: "",
    specs: {},
  }]);

  const groups = groupFindings(health.publishedAttention);
  expect(groups).toHaveLength(1);
  expect(groups[0].findings.length).toBeGreaterThan(1);
});

test("missing stored SEO slug stays informational and does not inflate actionable SEO count", () => {
  const product = { ...healthyProduct, id: "p2", sku: "SGE-CH-002", seo_slug: "" };
  const health = buildWebsiteHealth([product]);

  expect(health.seoInformationalCount).toBe(1);
  expect(health.productsWithSeoIssues).toBe(0);
  expect(health.publishedSeoActionable).toHaveLength(0);
});

test("image audit detects reused primary image across products", () => {
  const products = [
    healthyProduct,
    {
      ...healthyProduct,
      id: "p2",
      sku: "SGE-CH-002",
      name: "Another Chandelier",
    },
  ];

  const health = buildWebsiteHealth(products);
  expect(health.imageIssues.some((item) => item.issue === "Primary image reused by multiple products")).toBe(true);
  expect(health.productsWithImageIssues).toBe(2);
});

test("category snapshot separates published and draft counts", () => {
  const health = buildWebsiteHealth([
    healthyProduct,
    {
      ...healthyProduct,
      id: "p2",
      sku: "SGE-TL-001",
      category: "Table Lamp",
      status: "draft",
      images: [],
      short_description: "",
      description: "",
      specs: {},
      tags: [],
      seo_slug: "",
    },
  ]);

  const chandelier = health.categories.find((row) => row.category === "Chandelier");
  const tableLamp = health.categories.find((row) => row.category === "Table Lamp");

  expect(chandelier.published).toBe(1);
  expect(chandelier.drafts).toBe(0);
  expect(tableLamp.published).toBe(0);
  expect(tableLamp.drafts).toBe(1);
  expect(tableLamp.averageCompleteness).toBeLessThan(100);
});
