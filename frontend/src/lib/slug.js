// Slug helpers for /gallery/{slug} permalinks.
// Slugs are derived from project titles; collisions are disambiguated by
// suffixing an index (e.g. "chandelier", "chandelier-2").

export function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")   // strip accents
    .replace(/[^a-z0-9]+/g, "-")        // non-alphanumeric → dashes
    .replace(/(^-|-$)/g, "")            // trim leading/trailing dashes
    .slice(0, 80);
}

// Given the ordered project list, returns an array of {slug} objects
// (unique slugs). Order preserved. Empty/blank titles get "project-{i+1}".
export function buildProjectSlugs(items = []) {
  const used = new Map();
  return items.map((p, i) => {
    let base = slugify(p?.title || "");
    if (!base) base = `project-${i + 1}`;
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  });
}

export function findProjectBySlug(items = [], slug) {
  const slugs = buildProjectSlugs(items);
  const idx = slugs.indexOf(slug);
  if (idx === -1) return { index: -1, project: null, slug: null };
  return { index: idx, project: items[idx], slug };
}
