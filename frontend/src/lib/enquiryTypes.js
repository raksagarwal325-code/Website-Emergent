// Enquiry-type resolver for /contact?type=… — extracted so the fallback
// behaviour can be unit-tested without a router.
// Supported values must stay in sync with backend `EnquiryType`
// (server.py :: _ALLOWED_ENQUIRY_TYPES).
export const ENQUIRY_TYPES = [
  { value: "general", label: "General Enquiry" },
  { value: "bulk", label: "Custom Lighting / Bulk Order" },
  { value: "trade", label: "Architect / Interior Designer" },
];

const _ALLOWED = new Set(ENQUIRY_TYPES.map((t) => t.value));

export const resolveEnquiryType = (rawTypeParam) => {
  if (rawTypeParam == null) return "general";
  const v = String(rawTypeParam).trim().toLowerCase();
  return _ALLOWED.has(v) ? v : "general";
};

export const enquiryTypeLabel = (value) =>
  (ENQUIRY_TYPES.find((t) => t.value === value) || ENQUIRY_TYPES[0]).label;
