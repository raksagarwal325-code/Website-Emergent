const EMPTY_DIMENSION_VALUES = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "not available",
  "unknown",
  "none",
  "null",
]);

export function isMeaningfulDimensionValue(value) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return Boolean(normalized) && !EMPTY_DIMENSION_VALUES.has(normalized);
}

function formatNumber(value, decimals = 1) {
  if (!Number.isFinite(value)) return null;
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatHumanScale(totalInches) {
  if (!Number.isFinite(totalInches) || totalInches <= 0) return null;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - (feet * 12));
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  if (feet <= 0) return `${inches} in`;
  if (inches <= 0) return `${feet} ft`;
  return `${feet} ft ${inches} in`;
}

export function parseProductLength(value) {
  if (!isMeaningfulDimensionValue(value)) return null;
  const sourceText = String(value).trim();

  const feetMatch = sourceText.match(
    /(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|')\s*(?:(\d+(?:\.\d+)?)\s*(?:inches?|inch|in|\")?)?/i,
  );
  if (feetMatch) {
    const feet = Number(feetMatch[1]);
    const inchesRemainder = feetMatch[2] ? Number(feetMatch[2]) : 0;
    const inches = (feet * 12) + inchesRemainder;
    return {
      sourceText,
      inches,
      inchText: `${formatNumber(inches)}\"`,
      cmText: `${formatNumber(inches * 2.54, 0)} cm`,
      humanText: formatHumanScale(inches),
    };
  }

  const unitMatch = sourceText.match(
    /(\d+(?:\.\d+)?)\s*(mm|cm|inches?|inch|in|\")/i,
  );
  if (!unitMatch) {
    return {
      sourceText,
      inches: null,
      inchText: null,
      cmText: null,
      humanText: null,
    };
  }

  const amount = Number(unitMatch[1]);
  const unit = unitMatch[2].toLowerCase();
  let inches = null;
  if (unit === "mm") inches = amount / 25.4;
  else if (unit === "cm") inches = amount / 2.54;
  else inches = amount;

  return {
    sourceText,
    inches,
    inchText: `${formatNumber(inches)}\"`,
    cmText: `${formatNumber(inches * 2.54, 0)} cm`,
    humanText: formatHumanScale(inches),
  };
}

const MEASUREMENT_PATTERN = "(\\d+(?:\\.\\d+)?\\s*(?:mm|cm|inches?|inch|in|\\\"))";

function extractLabeledMeasurement(rawDimensions, labels) {
  if (!isMeaningfulDimensionValue(rawDimensions)) return null;
  const text = String(rawDimensions);

  for (const label of labels) {
    const before = new RegExp(`\\b${label}\\b\\s*[:=·-]?\\s*${MEASUREMENT_PATTERN}`, "i");
    const beforeMatch = text.match(before);
    if (beforeMatch?.[1]) return beforeMatch[1];

    const after = new RegExp(`${MEASUREMENT_PATTERN}\\s*\\b${label}\\b`, "i");
    const afterMatch = text.match(after);
    if (afterMatch?.[1]) return afterMatch[1];
  }

  return null;
}

function firstMeaningfulSpec(specs, keys) {
  for (const key of keys) {
    if (isMeaningfulDimensionValue(specs?.[key])) return specs[key];
  }
  return null;
}

export function getProductDimensionData(product) {
  const specs = product?.specs || {};
  const rawDimensions = isMeaningfulDimensionValue(specs.Dimensions)
    ? String(specs.Dimensions).trim()
    : null;

  const rawHeight = firstMeaningfulSpec(specs, ["Height", "Overall Height"])
    || extractLabeledMeasurement(rawDimensions, ["overall\\s+height", "height", "h"]);

  let spanLabel = "Overall Width";
  let spanShort = "W";
  let rawSpan = firstMeaningfulSpec(specs, ["Width", "Overall Width"])
    || extractLabeledMeasurement(rawDimensions, ["overall\\s+width", "width", "w"]);

  if (!rawSpan) {
    rawSpan = firstMeaningfulSpec(specs, ["Diameter", "Overall Diameter"])
      || extractLabeledMeasurement(rawDimensions, ["overall\\s+diameter", "diameter", "dia", "d"]);
    if (rawSpan) {
      spanLabel = "Overall Diameter";
      spanShort = "Dia";
    }
  }

  const height = rawHeight ? parseProductLength(rawHeight) : null;
  const span = rawSpan ? parseProductLength(rawSpan) : null;
  const lightsValue = firstMeaningfulSpec(specs, ["Number of Lights", "Lights"]);
  const lights = lightsValue == null ? null : String(lightsValue).trim();

  if (!rawDimensions && !height && !span) return null;

  const heightPrimary = height?.inchText || height?.sourceText || null;
  const spanPrimary = span?.inchText || span?.sourceText || null;

  let exactSummary = rawDimensions;
  if (heightPrimary && spanPrimary) {
    exactSummary = `${heightPrimary} H × ${spanPrimary} ${spanShort}`;
  } else if (heightPrimary) {
    exactSummary = `${heightPrimary} H`;
  } else if (spanPrimary) {
    exactSummary = `${spanPrimary} ${spanShort}`;
  }

  const metricSummary = height?.cmText && span?.cmText
    ? `${height.cmText} H × ${span.cmText} ${spanShort}`
    : null;

  return {
    rawDimensions,
    exactSummary,
    metricSummary,
    height,
    span,
    spanLabel,
    spanShort,
    lights,
    footprint: span?.humanText ? `${span.humanText} wide` : null,
  };
}
