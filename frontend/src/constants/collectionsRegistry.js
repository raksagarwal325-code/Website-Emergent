// Explicit collection registry stored in the existing settings store.
// Product tags remain the membership mechanism; this registry defines which
// collections actually exist and are customer-facing.
export const COLLECTIONS_SETTINGS_KEY = "collections";
export const COLLECTIONS_REGISTRY_VERSION_KEY = "collections_registry_version";
export const COLLECTIONS_REGISTRY_VERSION = 2;

export function normalizeCollectionRegistry(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({ slug: String(item?.slug || "").trim().toLowerCase(), name: String(item?.name || "").trim() }))
    .filter((item) => item.slug && item.name);
}

export function getRegisteredCollections(settings) {
  const homepage = settings?.homepage_content || {};
  const raw = homepage[COLLECTIONS_SETTINGS_KEY];
  if (!Array.isArray(raw)) return null;
  const normalized = normalizeCollectionRegistry(raw);
  const version = Number(homepage[COLLECTIONS_REGISTRY_VERSION_KEY] || 0);

  // The first registry migration accidentally promoted every historical
  // collection tag to a live collection. Before v2, only Gulzar was verified.
  if (version < COLLECTIONS_REGISTRY_VERSION && normalized.length > 1) {
    return normalized.filter((item) => item.slug === "gulzar");
  }
  return normalized;
}

export function withRegisteredCollections(settings, collections) {
  return {
    ...(settings || {}),
    homepage_content: {
      ...((settings || {}).homepage_content || {}),
      [COLLECTIONS_SETTINGS_KEY]: normalizeCollectionRegistry(collections),
      [COLLECTIONS_REGISTRY_VERSION_KEY]: COLLECTIONS_REGISTRY_VERSION,
    },
  };
}
