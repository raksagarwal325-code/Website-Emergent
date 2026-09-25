const clean = (value) => String(value || "")
  .replace(/[\u2010-\u2015\u2212\u00ad]/g, "-")
  .replace(/\s+/g, " ")
  .trim();

const NUMBER_WORDS = {
  one: 1, single: 1,
  two: 2, double: 2,
  three: 3, triple: 3,
  four: 4,
};
const measure = "(\\d+(?:\\.\\d+)?(?:\\s*-\\s*\\d+(?:\\.\\d+)?)?)";
const diameterPatterns = [
  new RegExp(`(?:approx(?:imately)?\\.?\\s*)?${measure}\\s*(?:ft|feet|foot)\\s*(?:dia(?:meter)?\\.?)`, "i"),
  new RegExp(`(?:dia(?:meter)?\\.?)\\s*(?:of|fixed at|to remain|around|approx(?:imately)?\\.?)?\\s*${measure}\\s*(?:ft|feet|foot)`, "i"),
];
const heightPatterns = [
  new RegExp(`(?:approx(?:imately)?\\.?\\s*)?${measure}\\s*(?:ft|feet|foot)\\s*(?:h(?:eight)?\\.?)`, "i"),
  new RegExp(`(?:h(?:eight)?\\.?)\\s*(?:of|fixed at|to remain|around|approx(?:imately)?\\.?)?\\s*${measure}\\s*(?:ft|feet|foot)`, "i"),
];

const firstValue = (text, patterns) => {
  for (const pattern of patterns) {
    const match = clean(text).match(pattern);
    if (match) return match[1].replace(/\s+/g, "");
  }
  return "";
};

const stepCount = (text) => {
  const source = clean(text);
  const digit = source.match(/\b([1-9])\s*[- ]?\s*(?:step|tier|layer)s?\b/i);
  if (digit) return Number(digit[1]);
  const word = source.match(/\b(one|single|two|double|three|triple|four)\s+(?:arm\s+)?(?:step|tier|layer|ring)s?\b/i);
  return word ? NUMBER_WORDS[word[1].toLowerCase()] : 0;
};

const finishName = (text) => {
  const match = clean(text).match(/\b(antique brass|brass|gold|silver|chrome|copper|black|white)\s*(?:-\s*)?(?:look\s*)?finish\b/i);
  if (!match) return "";
  return match[1].replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const familyName = (name) => clean(name)
  .replace(new RegExp(`(?:approx(?:imately)?\\.?\\s*)?${measure}\\s*(?:ft|feet|foot)\\s*(?:dia(?:meter)?|h(?:eight)?)\\.?`, "gi"), " ")
  .replace(/\b[1-9]\s*[- ]?\s*(?:step|tier|layer)s?\b/gi, " ")
  .replace(/\b(?:antique brass|brass|gold|silver|chrome|copper|black|white)\s*(?:-\s*)?(?:look\s*)?finish\b/gi, " ")
  .replace(/(?:\s*-\s*){2,}/g, " - ")
  .replace(/\s*[,xX]\s*(?=-|$)/g, " ")
  .replace(/\s+/g, " ")
  .replace(/^\s*-|[-,xX]\s*$/g, "")
  .trim();

const variantFamilyKey = (item) => {
  const name = familyName(item?.name);
  const source = `${item?.name || ""} ${item?.customisation_notes || ""} ${item?.customisation_instruction || ""}`;
  if (!firstValue(source, diameterPatterns) || !firstValue(source, heightPatterns) || !finishName(source)) return "";
  const base = name.split(/\s+with\s+/i)[0]
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
  return base.split(/\s+/).length >= 3 ? `family:${base}` : "";
};

const groupKey = (item) => {
  if (!item?.is_custom) return "";
  const familyKey = variantFamilyKey(item);
  if (familyKey) return familyKey;
  if (item.image) return `image:${item.image}`;
  if (item.product_id) return `product:${item.product_id}`;
  return "";
};

const preferredFamilyName = (items) => {
  const candidates = items.map((item) => familyName(item.name)).filter(Boolean);
  const descriptive = candidates.filter((candidate) => /\bwith\b/i.test(candidate));
  return [...(descriptive.length ? descriptive : candidates)].sort((left, right) => left.length - right.length)[0] || "";
};

const upperMeasurement = (value) => {
  const parts = String(value || "").split("-").map(Number).filter(Number.isFinite);
  return parts.length ? Math.max(...parts) : 0;
};

const inferredSteps = (members) => {
  const facts = members.map((item) => {
    const source = `${item.name} ${item.customisation_notes || ""} ${item.customisation_instruction || ""}`;
    return {
      item,
      step: stepCount(source),
      height: firstValue(source, heightPatterns),
    };
  });
  const heights = [...new Set(facts.map(({ height }) => upperMeasurement(height)).filter(Boolean))].sort((a, b) => a - b);
  const anchors = facts.filter(({ step, height }) => step && upperMeasurement(height));
  const result = new Map();
  facts.forEach((fact) => {
    if (fact.step) {
      result.set(fact.item, fact.step);
      return;
    }
    const heightIndex = heights.indexOf(upperMeasurement(fact.height));
    if (heightIndex < 0 || !anchors.length) return;
    const predictions = anchors.map((anchor) => (
      anchor.step + heightIndex - heights.indexOf(upperMeasurement(anchor.height))
    ));
    if (predictions.every((prediction) => prediction === predictions[0]) && predictions[0] > 0 && predictions[0] < 10) {
      result.set(fact.item, predictions[0]);
    }
  });
  return result;
};

export const harmoniseCustomVariantNames = (items = []) => {
  const groups = new Map();
  items.forEach((item) => {
    const key = groupKey(item);
    if (!key) return;
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  const relatedGroups = [...groups.entries()].filter(([, members]) => members.length > 1);
  const canonicalByKey = new Map(relatedGroups.map(([key, members]) => [key, preferredFamilyName(members)]));
  const stepsByItem = new Map();
  relatedGroups.forEach(([, members]) => {
    inferredSteps(members).forEach((step, item) => stepsByItem.set(item, step));
  });
  return items.map((item) => {
    const canonicalFamily = canonicalByKey.get(groupKey(item));
    if (!canonicalFamily) return item;
    const source = `${item.name} ${item.customisation_notes || ""} ${item.customisation_instruction || ""}`;
    const step = stepsByItem.get(item) || stepCount(source);
    const diameter = firstValue(source, diameterPatterns);
    const height = firstValue(source, heightPatterns);
    const finish = finishName(source);
    if (!step || !diameter || !height || !finish) return item;
    return {
      ...item,
      name: `${canonicalFamily} - ${step}-Step - ${finish} Finish - Approx. ${diameter} ft Dia x ${height} ft H`,
    };
  });
};
