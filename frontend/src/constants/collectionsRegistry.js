// Explicit collection registry stored in the existing settings store.
// Product tags remain the membership mechanism; this registry defines which
// collections actually exist and are customer-facing.
export const COLLECTIONS_SETTINGS_KEY = "collections";

export function normalizeCollectionRegistry(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({ slug: String(item?.slug || "").trim().toLowerCase(), name: String(item?.name || "").trim() }))
    .filter((item) => item.slug && item.name);
}

export function getRegisteredCollections(settings) {
  const raw = settings?.homepage_content?.[COLLECTIONS_SETTINGS_KEY];
  return Array.isArray(raw) ? normalizeCollectionRegistry(raw) : null;
}

export function withRegisteredCollections(settings, collections) {
  return {
    ...(settings || {}),
    homepage_content: {
      ...((settings || {}).homepage_content || {}),
      [COLLECTIONS_SETTINGS_KEY]: normalizeCollectionRegistry(collections),
    },
  };
}
