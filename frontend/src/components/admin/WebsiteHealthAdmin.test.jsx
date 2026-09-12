import { buildWebsiteHealth, productCompleteness } from "./WebsiteHealthAdmin";

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

test("health audit flags missing primary image and duplicate sku", () => {
  const products = [
    healthyProduct,
    {
      ...healthyProduct,
      id: "p2",
      name: "Second Product With Same SKU",
      images: [],
      short_description: "",
      description: "",
    },
  ];

  const health = buildWebsiteHealth(products);
  const criticalIssues = health.attention
    .filter((item) => item.severity === "critical")
    .map((item) => item.issue);

  expect(criticalIssues).toContain("Missing primary image");
  expect(criticalIssues).toContain("Duplicate SKU");
  expect(health.criticalCount).toBeGreaterThanOrEqual(3);
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
});

test("category snapshot calculates average completeness", () => {
  const health = buildWebsiteHealth([
    healthyProduct,
    {
      ...healthyProduct,
      id: "p2",
      sku: "SGE-TL-001",
      category: "Table Lamp",
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

  expect(chandelier.averageCompleteness).toBe(100);
  expect(tableLamp.averageCompleteness).toBeLessThan(100);
});
