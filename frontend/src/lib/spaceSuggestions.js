const normalize = (value) => String(value || "").toLowerCase();

const RULES = {
  "living-room": {
    strongCategories: ["Chandelier", "Hanging Light", "Wall Light", "Floor Lamp", "Table Lamp"],
    keywords: ["living", "statement", "ambient", "wall", "floor lamp", "table lamp"],
    excludes: ["gate"],
  },
  "dining-room": {
    strongCategories: ["Chandelier", "Hanging Light", "Wall Light", "Table Chandelier", "Candle Stand"],
    keywords: ["dining", "table", "pendant", "cluster", "chandelier", "candle"],
    excludes: ["gate"],
  },
  "double-height-staircase": {
    strongCategories: ["Chandelier", "Hanging Light", "Floor Chandelier"],
    keywords: ["double height", "double-height", "staircase", "cascade", "cascading", "tier", "grand", "large"],
    excludes: ["table lamp", "gate"],
  },
  "foyer-entrance": {
    strongCategories: ["Chandelier", "Hanging Light", "Wall Light", "Floor Chandelier", "Table Chandelier"],
    keywords: ["foyer", "entrance", "entry", "lantern", "statement", "hall"],
    excludes: ["gate light"],
  },
  bedroom: {
    strongCategories: ["Wall Light", "Hanging Light", "Table Lamp", "Floor Lamp", "Chandelier"],
    keywords: ["bedroom", "bedside", "soft", "ambient", "wall", "table lamp"],
    excludes: ["gate", "banquet"],
  },
  "hotel-hospitality": {
    strongCategories: ["Chandelier", "Hanging Light", "Wall Light", "Floor Chandelier", "Table Chandelier", "Table Lamp"],
    keywords: ["hotel", "hospitality", "lobby", "suite", "grand", "custom", "project"],
    excludes: ["gate"],
  },
  restaurant: {
    strongCategories: ["Chandelier", "Hanging Light", "Wall Light", "Table Chandelier", "Candle Stand"],
    keywords: ["restaurant", "dining", "pendant", "ambient", "candle", "table"],
    excludes: ["gate"],
  },
  "retail-showroom": {
    strongCategories: ["Chandelier", "Hanging Light", "Wall Light", "Floor Chandelier", "Table Chandelier"],
    keywords: ["showroom", "retail", "boutique", "display", "statement", "grand"],
    excludes: ["gate"],
  },
  "banquet-event-space": {
    strongCategories: ["Chandelier", "Hanging Light", "Floor Chandelier", "Table Chandelier", "Candle Stand"],
    keywords: ["banquet", "event", "wedding", "grand", "large", "cascade", "tier", "custom", "candle"],
    excludes: ["gate", "bedside"],
  },
};

export function scoreSpaceSuggestion(product, space) {
  const rule = RULES[space?.slug];
  if (!rule || !product) return { score: 0, confidence: "none", reasons: [] };

  const haystack = normalize([
    product.name,
    product.short_description,
    product.description,
    product.category,
    ...(Array.isArray(product.tags) ? product.tags.filter((tag) => !String(tag).startsWith("space:")) : []),
  ].join(" "));

  const reasons = [];
  let score = 0;

  if (rule.strongCategories.includes(product.category)) {
    score += 45;
    reasons.push(`${product.category} is commonly suitable for this setting`);
  }

  const matchedKeywords = rule.keywords.filter((keyword) => haystack.includes(keyword));
  if (matchedKeywords.length) {
    score += Math.min(40, matchedKeywords.length * 12);
    reasons.push(`Catalogue text matches: ${matchedKeywords.slice(0, 3).join(", ")}`);
  }

  const excluded = rule.excludes.find((keyword) => haystack.includes(keyword));
  if (excluded) {
    score -= 70;
    reasons.push(`Conflicting application signal: ${excluded}`);
  }

  score = Math.max(0, Math.min(100, score));
  const confidence = score >= 70 ? "strong" : score >= 45 ? "possible" : "none";
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
