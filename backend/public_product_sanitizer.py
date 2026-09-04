"""Sanitize customer-facing API data without mutating stored Admin records."""

from copy import deepcopy


PUBLIC_SPEC_PLACEHOLDERS = {
    "",
    "-",
    "—",
    "n/a",
    "na",
    "not available",
    "unknown",
    "none",
    "null",
    "needs confirmation",
    "to be confirmed",
    "to be confirmed before order",
}

PUBLIC_INTERNAL_SPEC_VALUES = {
    "heritage / classical indian luxury",
}

CATALOGUE_IMAGE_SPEC_KEYS = {
    "_catalog_image_off": "catalog_image_off",
    "_catalog_image_on": "catalog_image_on",
    "catalogue image off": "catalog_image_off",
    "catalogue image on": "catalog_image_on",
}

LEGACY_DELIVERY_VALUES = {
    "Pan-India shipping",
    "Pan-India shipping · 7–10 business days",
}
PUBLIC_DELIVERY_INFO = (
    "Pan-India shipping · Dispatch typically in 7–10 business days; "
    "transit varies by destination"
)

LEGACY_HERO_CRAFT = (
    "A curated catalog of crystal chandeliers, pendant lights, wall sconces, "
    "table lamps & decorative lighting — hand-blown and hand-assembled by our "
    "artisans in Firozabad."
)
SAFE_HERO_CRAFT = (
    "A curated catalog of crystal chandeliers, pendant lights, wall sconces, "
    "table lamps & decorative lighting — handcrafted and hand-assembled by our "
    "artisans in Firozabad, with processes varying by design."
)

LEGACY_ABOUT_TAGLINE = (
    "The story of four generations of glass — and the craft that lights every corner of it."
)
SAFE_ABOUT_TAGLINE = (
    "The story of more than four decades of decorative lighting — and the Firozabad craft behind it."
)

LEGACY_GALLERY_TAGLINE = (
    "Homes, hotels, weddings, showrooms — spaces we've helped illuminate. Each piece here is custom-made in Firozabad."
)
SAFE_GALLERY_TAGLINE = (
    "Homes, hotels, weddings and showrooms — a selection of spaces illuminated with Samrat Glass Emporium lighting."
)

LEGACY_REASON_CRAFT = (
    "Every piece is hand-blown, hand-cut and hand-assembled using time-honoured techniques."
)
SAFE_REASON_CRAFT = (
    "Handcrafted and hand-assembled in Firozabad using glass-working, cutting, "
    "finishing and decorative assembly techniques appropriate to each design."
)
LEGACY_REASON_TRUST = (
    "Thousands of homes, hotels, restaurants and showrooms lit by Samrat."
)
SAFE_REASON_TRUST = (
    "Lighting supplied for homes, hotels, restaurants and showrooms across India."
)
LEGACY_REASON_FIROZABAD = (
    "Based in the City of Glass — India's spiritual home of glass-making."
)
SAFE_REASON_FIROZABAD = (
    "Based in Firozabad, one of India's best-known centres for glass-making."
)

CRAFT_ITEM_REPLACEMENTS = {
    "Each piece begins as a pencil sketch on the workshop table — proportions calibrated to a room, a chandelier drop measured against a ceiling. Nothing is designed to be mass-produced; every silhouette is drawn to be lived under.":
        "Designs are developed around proportion, scale and the intended setting, with custom dimensions and configurations available for project requirements.",
    "Master glass-blowers in Firozabad gather glass from the furnace on iron blowpipes and coax it into form through breath and rotation — the same technique this city has practiced for over four centuries.":
        "Where a design calls for blown glass, experienced Firozabad glassworkers shape the glass through established furnace-working techniques before it moves on to finishing and assembly.",
    "Once cooled, crystal panels are hand-cut on stone wheels to shape the signature diamond facets that catch light. It is slow, exacting work — the angle of each cut determines how the finished piece will glow.":
        "For designs that use cut glass or crystal elements, facets and decorative details are shaped and finished to create the intended light pattern and surface character.",
    "Individual glass elements are strung and set into hand-worked brass frames — sometimes a single chandelier requires 400+ pieces threaded together. This step alone can take a week for a single fixture.":
        "Individual glass elements are assembled with the metal frame, fittings and electrical components, with the process varying according to the scale and complexity of each design.",
    "Every finished piece is lit, inspected, and packed by hand in our atelier before dispatch. Bespoke commissions are also numbered and signed — a signature you'll only see on the underside of the mount.":
        "Finished fixtures are checked, prepared and packed before dispatch. Bespoke orders are reviewed against the approved size, finish and configuration before packing.",
}


def _public_spec_is_unresolved(normalized: str) -> bool:
    """Return True when a populated spec still explicitly says it is unconfirmed."""
    if "to be confirmed" in normalized or "needs confirmation" in normalized:
        return True
    return "confirm" in normalized and "before order" in normalized


def sanitize_public_product(doc: dict | None):
    """Return a customer-safe product copy without mutating the source doc."""
    if not isinstance(doc, dict):
        return doc

    out = dict(doc)
    out["tags"] = []

    specs = doc.get("specs")
    if isinstance(specs, dict):
        clean_specs = {}
        for key, value in specs.items():
            if value is None:
                continue
            normalized_key = str(key).strip().lower()
            catalogue_field = CATALOGUE_IMAGE_SPEC_KEYS.get(normalized_key)
            if catalogue_field:
                image_value = str(value).strip()
                if image_value:
                    out[catalogue_field] = image_value
                continue
            normalized = str(value).strip().lower()
            if not normalized:
                continue
            if normalized in PUBLIC_SPEC_PLACEHOLDERS:
                continue
            if normalized in PUBLIC_INTERNAL_SPEC_VALUES:
                continue
            if _public_spec_is_unresolved(normalized):
                continue
            clean_specs[key] = value
        out["specs"] = clean_specs

    return out


def _normalize_faq_answer(answer):
    if not isinstance(answer, str):
        return answer
    return (
        answer
        .replace(
            "Standard pieces typically ship in 7–10 business days.",
            "Standard pieces typically dispatch in 7–10 business days; transit time then varies by destination.",
        )
        .replace(
            "Bespoke commissions take 3–5 weeks depending on complexity — hand-cut crystal, brasswork and finishing all happen in-house in Firozabad.",
            "Bespoke commissions typically take 3–5 weeks depending on the design, size, finish and configuration.",
        )
        .replace(
            "share unboxing photos within 24–48 hours.",
            "share unboxing photos within 48 hours.",
        )
    )


def _normalize_homepage_claims(homepage):
    if not isinstance(homepage, dict):
        return homepage

    out = deepcopy(homepage)

    hero = out.get("hero")
    if isinstance(hero, dict) and hero.get("description") == LEGACY_HERO_CRAFT:
        hero["description"] = SAFE_HERO_CRAFT

    about = out.get("about")
    if isinstance(about, dict) and about.get("tagline") == LEGACY_ABOUT_TAGLINE:
        about["tagline"] = SAFE_ABOUT_TAGLINE

    gallery = out.get("gallery")
    if isinstance(gallery, dict) and gallery.get("tagline") == LEGACY_GALLERY_TAGLINE:
        gallery["tagline"] = SAFE_GALLERY_TAGLINE

    reasons = out.get("reasons")
    if isinstance(reasons, dict) and isinstance(reasons.get("items"), list):
        for item in reasons["items"]:
            if not isinstance(item, dict):
                continue
            if item.get("body") == LEGACY_REASON_CRAFT:
                item["body"] = SAFE_REASON_CRAFT
            elif item.get("body") == LEGACY_REASON_TRUST:
                item["body"] = SAFE_REASON_TRUST
            elif item.get("body") == LEGACY_REASON_FIROZABAD:
                item["body"] = SAFE_REASON_FIROZABAD

    craft = out.get("craft")
    if isinstance(craft, dict) and isinstance(craft.get("items"), list):
        for item in craft["items"]:
            if not isinstance(item, dict):
                continue
            if item.get("kicker") == "Molten glass · 1400°C":
                item["kicker"] = "Molten glass"
            elif item.get("kicker") == "Brass, wire, patience":
                item["kicker"] = "Frame, fittings, assembly"
            elif item.get("kicker") == "Signed and inspected":
                item["kicker"] = "Checked and packed"
            body = item.get("body")
            if body in CRAFT_ITEM_REPLACEMENTS:
                item["body"] = CRAFT_ITEM_REPLACEMENTS[body]

    faq = out.get("faq")
    if isinstance(faq, dict) and isinstance(faq.get("items"), list):
        for item in faq["items"]:
            if isinstance(item, dict):
                item["a"] = _normalize_faq_answer(item.get("a"))

    return out


def sanitize_public_settings(doc: dict | None):
    """Normalize known legacy public claims while preserving Admin source data.

    The owner's established 1000+ light-options/design-library wording is not
    touched here. Only exact legacy values already audited on the frontend are
    normalized.
    """
    if not isinstance(doc, dict):
        return doc

    out = deepcopy(doc)
    if str(out.get("delivery_info") or "").strip() in LEGACY_DELIVERY_VALUES:
        out["delivery_info"] = PUBLIC_DELIVERY_INFO

    if "homepage_content" in out:
        out["homepage_content"] = _normalize_homepage_claims(out.get("homepage_content"))

    return out
