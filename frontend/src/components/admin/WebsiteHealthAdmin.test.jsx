import { buildSopRecommendation, buildWebsiteHealth, evaluateSopCompliance, groupFindings, hydrateSopRules, productCompleteness, SOP_RULES } from "./WebsiteHealthAdminV2";

const descriptionWithFeatures = (count = 8) => `<p>This chandelier has a balanced decorative silhouette, patterned glass surfaces and warm reflected detail suited to an elegant focal point.</p><p>Its layered form brings ambient character to living rooms, dining spaces, entrance halls and considered hospitality interiors.</p><h3>Key Features</h3><ul>${Array.from({ length: count }, (_, index) => `<li>Product-specific visible feature ${index + 1}</li>`).join("")}</ul>`;

const chandelierSpecs = Object.fromEntries(SOP_RULES.chandelier.schema.map((field) => [
  field,
  field === "Product Type" ? "Chandelier" : field === "Number of Lights" ? "8" : field === "Number of Arms" ? "8" : `${field} value`,
]));

const healthyProduct = {
  id: "p1",
  sku: "SGE-CH-001",
  name: "Rajsi Diamond-Cut Glass Eight-Light Chandelier",
  category: "Chandelier",
  status: "published",
  price_display: "starting_from",
  short_description: "A heritage-inspired chandelier with a balanced multi-light silhouette, patterned glass detailing and warm reflections for refined residential and hospitality interiors.",
  description: descriptionWithFeatures(),
  images: ["/api/files/products/a.jpg", "/api/files/products/b.jpg"],
  tags: ["heritage", "cut-glass"],
  specs: chandelierSpecs,
  seo_slug: "rajsi-diamond-cut-glass-eight-light-chandelier-sge-ch-001",
  sop_verification: {
    status: "verified",
    verified_at: "2026-09-12T00:00:00Z",
    verified_by: "Catalogue QA",
    source: "Approved source record and image pair",
  },
};

test("an exact mapped record passes structural SOP checks without a percentage score", () => {
  const result = productCompleteness(healthyProduct);
  expect(result.structuralPass).toBe(true);
  expect(result.missing).toEqual([]);
  expect(result).not.toHaveProperty("score");
});

test("one specification no longer counts as complete", () => {
  const result = evaluateSopCompliance({ ...healthyProduct, specs: { Material: "Cut glass" } });
  expect(result.structuralPass).toBe(false);
  expect(result.issues.some((item) => item.issue.startsWith("Missing SOP specifications"))).toBe(true);
});

test("missing factual specifications receive an SOP-based recommendation without an automatic patch", () => {
  const product = { ...healthyProduct, specs: { Material: "Cut glass" } };
  const finding = evaluateSopCompliance(product).issues.find((item) => item.issue.startsWith("Missing SOP specifications"));
  const suggested = buildSopRecommendation(product, finding);
  expect(suggested.rule).toContain("exact SOP specification schema");
  expect(suggested.proposed).toContain("verified product facts");
  expect(suggested.confidence).toBe("Owner confirmation required");
  expect(suggested.safeToApply).toBe(false);
});

test("safe dimension fallback recommendation never invents a measurement", () => {
  const product = { ...healthyProduct, specs: { ...chandelierSpecs, Height: "Made to Order" } };
  const finding = evaluateSopCompliance(product).issues.find((item) => item.issue === "Invalid dimension fallback");
  const suggested = buildSopRecommendation(product, finding);
  expect(suggested.safeToApply).toBe(true);
  expect(suggested.patch.specs.Height).toBe("To be confirmed before order");
  expect(suggested.patch.specs.Width).toBe(chandelierSpecs.Width);
});

test("safe specification-order recommendation preserves all recorded values", () => {
  const reversedSpecs = Object.fromEntries([...Object.entries(chandelierSpecs)].reverse());
  const product = { ...healthyProduct, specs: reversedSpecs };
  const finding = evaluateSopCompliance(product).issues.find((item) => item.issue === "Specification order does not match SOP");
  const suggested = buildSopRecommendation(product, finding);
  expect(suggested.safeToApply).toBe(true);
  expect(Object.keys(suggested.patch.specs)).toEqual(SOP_RULES.chandelier.schema);
  expect(suggested.patch.specs.Material).toBe(chandelierSpecs.Material);
});

test("spacing around a slash does not create duplicate missing and unexpected specification findings", () => {
  const specs = Object.fromEntries(SOP_RULES.chandelier.schema.map((field) => [
    field === "Collection / Family" ? "Collection/Family" : field,
    field === "Product Type" ? "Chandelier" : field === "Number of Lights" ? "8" : field === "Number of Arms" ? "8" : `${field} value`,
  ]));
  const result = evaluateSopCompliance({ ...healthyProduct, specs });
  expect(result.structuralPass).toBe(true);
  expect(result.issues.some((item) => item.issue.startsWith("Missing SOP specifications"))).toBe(false);
  expect(result.issues.some((item) => item.issue.startsWith("Unexpected SOP specifications"))).toBe(false);
});

test("missing status and price display are not silently defaulted", () => {
  const product = { ...healthyProduct };
  delete product.status;
  delete product.price_display;
  const result = evaluateSopCompliance(product);
  expect(result.issues.some((item) => item.issue.includes("Publication status"))).toBe(true);
  expect(result.issues.some((item) => item.issue.includes("Price display"))).toBe(true);
});

test("health audit reports exact counts rather than a rounded catalogue average", () => {
  const second = { ...healthyProduct, id: "p2", sku: "SGE-CH-002", specs: { Material: "Glass" } };
  const health = buildWebsiteHealth([healthyProduct, second]);
  expect(health.sopCoveragePublished).toBe(2);
  expect(health.structurallyCompliantPublished).toBe(1);
  expect(health.sopVerifiedPublished).toBe(1);
  expect(health).not.toHaveProperty("publishedAverageCompleteness");
});

test("Floor Chandelier uses the approved central SOP mapping", () => {
  const specs = Object.fromEntries(SOP_RULES["floor chandelier"].schema.map((field) => [field, field === "Product Type" ? "Floor Chandelier" : `${field} value`]));
  const result = evaluateSopCompliance({ ...healthyProduct, id: "fc1", sku: "SGE-FC-001", category: "Floor Chandelier", specs });
  expect(result.coverage).toBe("covered");
  expect(result.issues.some((item) => item.issue.includes("unresolved"))).toBe(false);
});

test("Website Health hydrates categories from the backend SOP registry", () => {
  const original = { ...SOP_RULES };
  try {
    expect(hydrateSopRules({
      defaults: { features: 8 },
      categories: {
        "Floor Chandelier": { sku_prefix: "FC", schema: ["Product Type"], image_counts: [2], image_count_exceptions: {} },
      },
    })).toBe(true);
    expect(SOP_RULES["floor chandelier"].productType).toBe("Floor Chandelier");
  } finally {
    Object.keys(SOP_RULES).forEach((key) => delete SOP_RULES[key]);
    Object.assign(SOP_RULES, original);
  }
});

test("Table Lamp approved four-image exception is accepted", () => {
  const specs = Object.fromEntries(SOP_RULES["table lamp"].schema.map((field) => [field, field === "Product Type" ? "Table Lamp" : `${field} value`]));
  const result = evaluateSopCompliance({
    ...healthyProduct,
    id: "tl47",
    sku: "SGE-TL-047",
    category: "Table Lamp",
    specs,
    images: ["/api/files/1", "/api/files/2", "/api/files/3", "/api/files/4"],
  });
  expect(result.approvedImageException).toBe(true);
  expect(result.issues.some((item) => item.issue === "Image count requires SOP review")).toBe(false);
});

test("Wall Light uses the central exact eight-feature rule", () => {
  const specs = Object.fromEntries(SOP_RULES["wall light"].schema.map((field) => [field, `${field} value`]));
  const result = evaluateSopCompliance({
    ...healthyProduct,
    id: "wl1",
    sku: "SGE-WL-001",
    category: "Wall Light",
    specs,
    description: descriptionWithFeatures(6),
  });
  expect(result.issues.some((item) => item.issue === "Key Features count does not match SOP")).toBe(true);
});

test("approved confirmation wording is counted separately from structural compliance", () => {
  const specs = { ...chandelierSpecs, Height: "To be confirmed before order" };
  const health = buildWebsiteHealth([{ ...healthyProduct, specs }]);
  expect(health.structurallyCompliantPublished).toBe(1);
  expect(health.confirmationBacklog).toBe(1);
  expect(health.sopVerifiedPublished).toBe(0);
});

test("unrecorded evidence verification remains pending even when structure passes", () => {
  const product = { ...healthyProduct };
  delete product.sop_verification;
  const health = buildWebsiteHealth([product]);
  expect(health.structurallyCompliantPublished).toBe(1);
  expect(health.manualVerificationPending).toBe(1);
  expect(health.sopVerifiedPublished).toBe(0);
});

test("draft findings are separated from published-site headline metrics", () => {
  const draft = { ...healthyProduct, id: "draft-1", sku: "SGE-CH-002", status: "draft", specs: {} };
  const health = buildWebsiteHealth([healthyProduct, draft]);
  expect(health.publishedCount).toBe(1);
  expect(health.draftCount).toBe(1);
  expect(health.sopCoveragePublished).toBe(1);
  expect(health.draftAttention.length).toBeGreaterThan(0);
});

test("groupFindings combines multiple issues for the same product", () => {
  const health = buildWebsiteHealth([{ ...healthyProduct, images: [], specs: {} }]);
  const groups = groupFindings(health.publishedAttention);
  expect(groups).toHaveLength(1);
  expect(groups[0].findings.length).toBeGreaterThan(1);
});

test("missing stored SEO slug stays informational", () => {
  const health = buildWebsiteHealth([{ ...healthyProduct, seo_slug: "" }]);
  expect(health.seoInformationalCount).toBe(1);
  expect(health.productsWithSeoIssues).toBe(0);
});

test("image audit detects reused primary image across products", () => {
  const products = [healthyProduct, { ...healthyProduct, id: "p2", sku: "SGE-CH-002", name: "Another Chandelier" }];
  const health = buildWebsiteHealth(products);
  expect(health.imageIssues.some((item) => item.issue === "Primary image reused by multiple products")).toBe(true);
  expect(health.productsWithImageIssues).toBe(2);
});

test("category snapshot exposes SOP state and counts instead of average completeness", () => {
  const health = buildWebsiteHealth([healthyProduct, { ...healthyProduct, id: "fc1", sku: "SGE-FC-001", category: "Floor Chandelier" }]);
  const chandelier = health.categories.find((row) => row.category === "Chandelier");
  const floorChandelier = health.categories.find((row) => row.category === "Floor Chandelier");
  expect(chandelier.sopStatus).toBe("Mapped");
  expect(chandelier.structuralPass).toBe(1);
  expect(chandelier).not.toHaveProperty("averageCompleteness");
  expect(floorChandelier.sopStatus).toBe("Unresolved");
});

test("category snapshot does not report SOP confirmation backlog for unmapped categories", () => {
  const floorChandelier = {
    ...healthyProduct,
    id: "fc-confirmation",
    sku: "SGE-FC-002",
    category: "Floor Chandelier",
    specs: { Height: "To be confirmed before order" },
  };
  const health = buildWebsiteHealth([floorChandelier]);
  expect(health.categories[0].sopStatus).toBe("Unresolved");
  expect(health.categories[0].confirmationBacklog).toBe(0);
  expect(health.confirmationBacklog).toBe(0);
});
