const normalize = (value) => String(value || "").toLowerCase();

const RULES = {
  "living-room": {
    categoryWeights: { "Wall Light": 52, "Floor Lamp": 50, "Table Lamp": 48, Chandelier: 46, "Hanging Light": 44 },
    applicationKeywords: ["living room", "living-area", "living area", "lounge"],
    secondaryKeywords: ["statement", "ambient"],
    excludes: ["gate light", "outdoor gate"],
  },
  "dining-room": {
    categoryWeights: { Chandelier: 52, "Hanging Light": 50, "Table Chandelier": 46, "Wall Light": 38, "Candle Stand": 36 },
    applicationKeywords: ["dining room", "dining table", "dining tables", "over dining", "above dining"],
    secondaryKeywords: ["pendant", "cluster", "candle"],
    excludes: ["gate light", "outdoor gate"],
  },
  "double-height-staircase": {
    categoryWeights: { Chandelier: 48, "Hanging Light": 46, "Floor Chandelier": 36 },
    applicationKeywords: ["double height", "double-height", "staircase", "stairwell", "stair void"],
    secondaryKeywords: ["cascade", "cascading", "tier", "grand", "large"],
    excludes: ["table lamp", "gate light"],
  },
  "foyer-entrance": {
    categoryWeights: { Chandelier: 46, "Hanging Light": 46, "Wall Light": 44, "Floor Chandelier": 34, "Table Chandelier": 32 },
    applicationKeywords: ["foyer", "entrance hall", "entry hall", "entryway"],
    secondaryKeywords: ["lantern", "statement", "hall"],
    excludes: ["gate light", "outdoor gate"],
  },
  bedroom: {
    categoryWeights: { "Wall Light": 52, "Table Lamp": 52, "Hanging Light": 40, "Floor Lamp": 38, Chandelier: 30 },
    applicationKeywords: ["bedroom", "bedside", "bed side", "nightstand"],
    secondaryKeywords: ["soft", "ambient"],
    excludes: ["gate light", "banquet"],
  },
  "hotel-hospitality": {
    categoryWeights: { Chandelier: 46, "Hanging Light": 44, "Wall Light": 44, "Floor Chandelier": 38, "Table Chandelier": 36, "Table Lamp": 34 },
    applicationKeywords: ["hotel", "hospitality", "hotel lobby", "lobby", "suite"],
    secondaryKeywords: ["grand", "custom", "project"],
    excludes: ["gate light", "outdoor gate"],
  },
  restaurant: {
    categoryWeights: { Chandelier: 46, "Hanging Light": 48, "Wall Light": 42, "Table Chandelier": 42, "Candle Stand": 40 },
    applicationKeywords: ["restaurant", "restaurant dining", "dining area"],
    secondaryKeywords: ["pendant", "ambient", "candle", "table"],
    excludes: ["gate light", "outdoor gate"],
  },
  "retail-showroom": {
    categoryWeights: { Chandelier: 44, "Hanging Light": 42, "Wall Light": 40, "Floor Chandelier": 38, "Table Chandelier": 36 },
    applicationKeywords: ["showroom", "retail", "boutique", "display area"],
    secondaryKeywords: ["display", "statement", "grand"],
    excludes: ["gate light", "outdoor gate"],
  },
  "banquet-event-space": {
    categoryWeights: { Chandelier: 48, "Hanging Light": 44, "Floor Chandelier": 42, "Table Chandelier": 38, "Candle Stand": 36 },
    applicationKeywords: ["banquet", "event space", "wedding venue", "wedding hall", "event hall"],
    secondaryKeywords: ["grand", "large", "cascade", "tier", "custom", "candle"],
    excludes: ["gate light", "bedside"],
  },
};

export function scoreSpaceSuggestion(product, space) {
  const rule = RULES[space?.slug];
  if (!rule || !product) return { score: 0, confidence: "none", reasons: [] };

  const haystack = normalize([
    product.name,
    product.short_description,
    product.description,
    ...(Array.isArray(product.tags) ? product.tags.filter((tag) => !String(tag).startsWith("space:")) : []),
  ].join(" "));

  const reasons = [];
  let score = Number(rule.categoryWeights[product.category] || 0);
  if (score > 0) reasons.push(`${product.category} is a suitable product type for this setting`);

  const applicationMatches = rule.applicationKeywords.filter((keyword) => haystack.includes(keyword));
  if (applicationMatches.length) {
    score += Math.min(36, 26 + ((applicationMatches.length - 1) * 5));
    reasons.push(`Direct application evidence: ${applicationMatches.slice(0, 2).join(", ")}`);
  }

  const secondaryMatches = rule.secondaryKeywords.filter((keyword) => haystack.includes(keyword));
  if (secondaryMatches.length) {
    score += Math.min(12, secondaryMatches.length * 4);
    reasons.push(`Supporting catalogue clues: ${secondaryMatches.slice(0, 3).join(", ")}`);
  }

  const excluded = rule.excludes.find((keyword) => haystack.includes(keyword));
  if (excluded) {
    score -= 80;
    reasons.push(`Conflicting application signal: ${excluded}`);
  }

  score = Math.max(0, Math.min(100, score));
  const hasDirectEvidence = applicationMatches.length > 0;
  const confidence = score >= 70 && hasDirectEvidence ? "strong" : score >= 40 ? "possible" : "none";
  return { score, confidence, reasons };
}

export function suggestionsForSpace(products, space, { includeAssigned = false } = {}) {
  const tag = `space:${space.slug}`;
  return (products || [])
    .filter((product) => includeAssigned || !(Array.isArray(product.tags) && product.tags.includes(tag)))
    .map((product) => ({ product, ...scoreSpaceSuggestion(product, space) }))
    .filter((row) => row.confidence !== "none")
    .sort((a, b) => b.score - a.score || String(a.product.name || "").localeCompare(String(b.product.name || "")));
}
