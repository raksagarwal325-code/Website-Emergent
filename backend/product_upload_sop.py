"""Deterministic SOP rules for AI-assisted catalogue uploads.

AI supplies product-specific copy. This module owns the non-negotiable shape,
defaults and validation so model output can never silently bypass the SOP.
"""
from collections import OrderedDict
from difflib import SequenceMatcher
import re


SCHEMAS = {
    "Candle Stand": ["Material", "Finish", "Glass Type", "Product Type", "Number of Candle Holders", "Number of Arms", "Holder Type", "Suitable For", "Style", "Color", "Package Includes", "Care Instructions", "Customization Available", "Candle Type", "Height", "Width"],
    "Chandelier": ["Material", "Finish", "Height", "Width", "Glass Type", "Glass Colour", "Product Type", "Number of Lights", "Number of Arms", "Suspension Type", "Holder Type", "Bulb Type", "Package Contents", "Suitable For", "Style", "Care Instructions", "Customization", "Collection / Family"],
    "Floor Chandelier": ["Material", "Finish", "Height", "Width", "Glass Type", "Glass Colour", "Product Type", "Number of Lights", "Number of Arms", "Base Type", "Holder Type", "Bulb Type", "Package Contents", "Suitable For", "Style", "Care Instructions", "Customization", "Collection / Family"],
    "Floor Lamp": ["Material", "Finish", "Height", "Width", "Glass Type", "Glass Colour", "Product Type", "Number of Lights", "Number of Arms", "Shade Type", "Holder Type", "Bulb Type", "Package Contents", "Suitable For", "Style", "Care Instructions", "Customization", "Collection / Family"],
    "Gate Light": ["Material", "Finish", "Height", "Width", "Glass Type", "Glass Colour", "Product Type", "Number of Lights", "Number of Arms", "Shade Type", "Mounting Type", "Holder Type", "Bulb Type", "Weather Suitability", "Package Contents", "Suitable For", "Style", "Care Instructions", "Customization", "Collection / Family"],
    "Hanging Light": ["Material", "Finish", "Height", "Width", "Glass Type", "Glass Colour", "Product Type", "Number of Lights", "Number of Arms", "Suspension Type", "Holder Type", "Bulb Type", "Package Contents", "Suitable For", "Style", "Care Instructions", "Customization", "Collection / Family"],
    "Table Chandelier": ["Material", "Finish", "Height", "Width", "Glass Type", "Glass Colour", "Product Type", "Number of Lights", "Number of Arms", "Base Type", "Holder Type", "Bulb Type", "Package Contents", "Suitable For", "Style", "Care Instructions", "Customization", "Collection / Family"],
    "Table Lamp": ["Material", "Finish", "Glass Type", "Product Type", "Number of Arms", "Number of Lights", "Holder Type", "Suitable For", "Style", "Color", "Package Includes", "Care Instructions", "Customization Available", "Shade Type", "Height", "Width"],
    "Wall Light": ["Material", "Finish", "Height", "Width", "Glass Type", "Glass Colour", "Product Type", "Number of Lights", "Number of Arms", "Holder Type", "Bulb Type", "Package Contents", "Suitable For", "Style", "Care Instructions", "Customization", "Collection / Family"],
}

SKU_PREFIX = {
    "Candle Stand": "CS", "Chandelier": "CH", "Floor Chandelier": "FC",
    "Floor Lamp": "FL", "Gate Light": "GL", "Hanging Light": "HL",
    "Table Chandelier": "TA", "Table Lamp": "TL", "Wall Light": "WL",
}

DIMENSION_FALLBACK = "To be confirmed before order"
SOP_VERSION = "2026-09-22.1"

IMAGE_RULES = {
    "Candle Stand": {"counts": [2]},
    "Chandelier": {"counts": [2]},
    "Floor Chandelier": {"counts": [2]},
    "Floor Lamp": {"counts": [2]},
    "Gate Light": {"counts": [1, 2]},
    "Hanging Light": {"counts": [2]},
    "Table Chandelier": {"counts": [2]},
    "Table Lamp": {"counts": [2], "exceptions": {"SGE-TL-047": [4]}},
    "Wall Light": {"counts": [1, 2]},
}


# Reconciled from the approved category SOPs.  Keep behavioural differences
# here instead of relying on an LLM to remember them.
CATEGORY_PROFILES = {
    "Candle Stand": {
        "identity": "freestanding candle holder or hurricane form",
        "name_ending": "Candle Stand",
        "configuration": "Count candle holders and genuine arms independently; a single stem is not an arm.",
        "special": "Candle Type and candle exclusion in Package Includes must be explicit when applicable.",
    },
    "Chandelier": {
        "identity": "ceiling-suspended centrepiece",
        "name_ending": "Chandelier",
        "configuration": "Count holders as lights and supporting side-light arms separately; a central light is not an arm.",
        "special": "Suspension Type and Collection / Family must be evidence-based.",
    },
    "Floor Chandelier": {
        "identity": "freestanding floor centrepiece",
        "name_ending": "Floor Chandelier",
        "configuration": "Count holders as lights and structural light-bearing arms separately.",
        "special": "Base Type must describe the visible freestanding support.",
    },
    "Floor Lamp": {
        "identity": "freestanding floor lamp",
        "name_ending": "Floor Lamp",
        "configuration": "Count lights independently from arms; a central stem or decorative branch is not an arm.",
        "special": "Base Type and Shade Type must be evidence-based; preserve a shade-less design as Not applicable.",
    },
    "Gate Light": {
        "identity": "gate, pillar, post or approved outdoor-mounted light",
        "name_ending": "Gate Light",
        "configuration": "Count lights independently from structural arms and frame details.",
        "special": "Mounting Type is required. Never claim an IP rating; use covered-outdoor wording only when owner-confirmed.",
    },
    "Hanging Light": {
        "identity": "ceiling-suspended hanging light",
        "name_ending": "Hanging Light",
        "configuration": "For independent pendants or cascades, do not invent arms; use an accurate Not applicable statement.",
        "special": "Suspension Type and Collection / Family must be evidence-based.",
    },
    "Table Chandelier": {
        "identity": "freestanding tabletop centrepiece",
        "name_ending": "Table Chandelier",
        "configuration": "Count holders as lights and structural light-bearing arms separately.",
        "special": "Base Type must describe the visible tabletop support.",
    },
    "Table Lamp": {
        "identity": "freestanding table lamp",
        "name_ending": "Table Lamp",
        "configuration": "A single central holder is one light and normally has no arms.",
        "special": "Shade Type must describe the verified shade or accurately state Not applicable.",
    },
    "Wall Light": {
        "identity": "wall-mounted decorative light",
        "name_ending": "Wall Light",
        "configuration": "Count lights independently from arms; the backplate and decorative scrolls are not arms.",
        "special": "Wall-mount construction and Collection / Family must be evidence-based.",
    },
}

GLOBAL_CONTROLS = (
    "Treat owner notes as authoritative facts. Inspect every image. Check duplicate SKU, name and image use. "
    "Keep the illuminated black/dark image first and the matching white/light image second whenever both exist. "
    "Both images must depict the identical product, colour, glass, base, arms and light configuration. "
    "New products must remain Draft / Needs Review with Price on request unless an approved numeric price exists. "
    "Never invent dimensions, materials, holder or bulb details, wattage, weight, IP rating, origin, certification, "
    "warranty or family. Preserve product-specific facts; do not copy them blindly from a reference listing."
)

NUMBER_WORDS = {
    1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six",
    7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten", 11: "Eleven", 12: "Twelve",
    13: "Thirteen", 14: "Fourteen", 15: "Fifteen", 16: "Sixteen",
    18: "Eighteen", 20: "Twenty", 24: "Twenty-Four", 30: "Thirty",
}

CATALOGUE_MATCH_RELATIONS = {
    "same_fixture",
    "same_fixture_different_glass",
    "same_glass_design",
    "similar_only",
}
CATALOGUE_FIXTURE_MATCH_THRESHOLD = 0.86
CATALOGUE_SINGLE_MATCH_THRESHOLD = 0.93


def product_sop_registry() -> dict:
    """Public, serializable SOP registry shared by every Admin workflow."""
    return {
        "version": SOP_VERSION,
        "authority_order": [
            "owner_confirmed_fact",
            "approved_sop",
            "exact_catalogue_reference",
            "image_visible_fact",
            "ai_suggestion",
        ],
        "defaults": {
            "status": "draft",
            "badge": "Needs Review",
            "price_display": "on_request",
            "currency": "INR",
            "dimension_fallback": DIMENSION_FALLBACK,
            "paragraphs": 2,
            "features": 8,
        },
        "categories": {
            category: {
                "sku_prefix": SKU_PREFIX[category],
                "schema": fields,
                "profile": CATEGORY_PROFILES[category],
                "image_counts": IMAGE_RULES[category]["counts"],
                "image_count_exceptions": IMAGE_RULES[category].get("exceptions", {}),
            }
            for category, fields in SCHEMAS.items()
        },
    }


def sop_prompt(category: str) -> str:
    fields = SCHEMAS[category]
    profile = CATEGORY_PROFILES[category]
    return f"""You are preparing ONE Samrat Glass Emporium {category} catalogue record from one or two photographs of the SAME product.

Return strict JSON only with: name, short_description, paragraph_1, paragraph_2, key_features, tags, specs, confidence_notes, and catalogue_matches when catalogue candidate images are supplied.

APPROVED SOP — NON-NEGOTIABLE:
- Identity: {profile['identity']}. The product name must be long, specific, unique, truthful and end with {profile['name_ending']} as its final words.\n- Begin the title with a distinctive catalogue model name, not a generic feature such as a light count, glass, crystal, diamond-cut, heritage or colour. A model name is a marketing identifier and must not be copied into Collection / Family unless owner-confirmed.
- Owner notes are confirmed facts and outrank visual inference and catalogue comparison. Use every supplied family, reference, light count and other stated fact exactly.
- Existing catalogue rows are duplicate/reference evidence only. Never reuse an existing title for a different item or conceal a possible duplicate by rewording.
- When candidate catalogue images are supplied, catalogue_matches must report only visually verified candidates; a glass-only match must never assign a fixture family.
- {GLOBAL_CONTROLS}
- Image order is normally illuminated black/dark first, matching white/light second. Report a missing pair, mismatch, obscured count or uncertain identity in confidence_notes.
- short_description is exactly one sentence of 20-35 words.
- Write exactly two narrative paragraphs, followed by exactly 8 concise, product-specific Key Features.
- Keep dimensions, holder, bulb, package, customization and confirmation wording out of narrative paragraphs.
- specs contains exactly these keys in this exact order: {', '.join(fields)}.
- Product Type is exactly {category}.
- Height and Width use supplied values verbatim with units; when absent use "{DIMENSION_FALLBACK}".
- {profile['configuration']}
- {profile['special']}
- Unknown non-dimensional facts use "{DIMENSION_FALLBACK}". A genuinely inapplicable field uses a precise "Not applicable — ..." statement.
- Never write "Made to Order" as a factual specification and never leave a required field empty.
- Do not infer solid brass or crystal from appearance alone.
- No bracketed placeholders, markdown, or text outside the JSON object.
"""


def normalize_product_name(value: str) -> str:
    """Normalize punctuation and spacing before catalogue-name comparison."""
    return " ".join(re.findall(r"[a-z0-9]+", str(value or "").casefold()))


def find_similar_product(name: str, products: list[dict], threshold: float = 0.92):
    """Return the closest exact/near duplicate and its score, if one exists."""
    wanted = normalize_product_name(name)
    if not wanted:
        return None
    wanted_tokens = set(wanted.split())
    best = None
    for product in products:
        candidate = normalize_product_name(product.get("name", ""))
        if not candidate:
            continue
        candidate_tokens = set(candidate.split())
        sequence_score = SequenceMatcher(None, wanted, candidate).ratio()
        token_score = len(wanted_tokens & candidate_tokens) / max(len(wanted_tokens | candidate_tokens), 1)
        score = max(sequence_score, token_score)
        if wanted == candidate:
            score = 1.0
        if score >= threshold and (best is None or score > best[1]):
            best = (product, score)
    return best



# Owner decisions recovered from all 607 lines of the uploaded source
# conversation.  Pair keys prevent generic filenames such as 1.png from
# leaking facts into an unrelated later upload.
CONVERSATION_PAIR_FACTS = {
    ("chatgpt image aug 22 2026 04 39 00 pm.png", "chatgpt image aug 22 2026 04 39 03 pm.png"):
        {"category": "Gate Light"},
    ("126.png", "126a.png"):
        {"category": "Wall Light"},
    ("097 (1).png", "097a (1).png"):
        {"category": "Chandelier", "lights": 4, "arms": 3, "references": ["SGE-WL-064"]},
    ("097 (2).png", "097a.jpeg"):
        {"category": "Chandelier", "action": "replace", "target_sku": "SGE-CH-018"},
    ("10 (2).png", "10a (2).png"):
        {"category": "Chandelier", "lights": 5, "references": ["SGE-WL-043", "SGE-WL-044", "SGE-WL-123"], "detail": "Brass bands"},
    ("098.png", "098a.png"):
        {"category": "Chandelier", "lights": 5, "height": '24"', "width": '24"'},
    ("099 (1).png", "099a (1).png"):
        {"category": "Chandelier", "lights": 5, "height": '24"', "width": '24"'},
    ("100 (1).png", "100a (1).png"):
        {"category": "Chandelier", "lights": 5, "height": '24"', "width": '24"'},
    ("101 (2).png", "101a (2).png"):
        {"category": "Chandelier", "lights": 5, "height": '24"', "width": '24"'},
    ("102 (1).png", "102a (2).png"):
        {"category": "Chandelier", "lights": 5, "height": '24"', "width": '24"'},
    ("8 (1).png", "8a (1).png"):
        {"category": "Chandelier", "lights": 12, "references": ["SGE-WL-043"]},
    ("6 (1).png", "6a (1).png"):
        {"category": "Chandelier", "lights": 8, "references": ["SGE-CH-111"]},
    ("20 (1).png", "20a (1).png"):
        {"category": "Floor Lamp", "references": ["SGE-FL-007"], "detail": "Same fixture; glass differs"},
    ("chatgpt image aug 19 2026 08 39 21 pm (3).png", "chatgpt image aug 19 2026 10 04 06 am (3).png"):
        {"category": "Hanging Light", "family": "Kandil Bell-Jar", "lights": 3, "detail": "Diamond-lattice glass"},
    ("chatgpt image aug 4 2026 11 21 02 pm.png", "chatgpt image aug 11 2026 11 42 44 pm.png"):
        {"category": "Candle Stand"},
    ("chatgpt image sep 6 2026 03 57 18 pm.png", "chatgpt image sep 6 2026 03 57 22 pm.png"):
        {"category": "Chandelier", "lights": 6},
    ("chatgpt image sep 8 2026 05 13 43 pm.png", "chatgpt image sep 8 2026 05 13 49 pm.png"):
        {"category": "Chandelier", "lights": 6},
    ("chatgpt image sep 8 2026 12 06 01 pm.png", "chatgpt image sep 8 2026 12 06 06 pm.png"):
        {"category": "Chandelier", "lights": 6},
}

# Category-only statements from the conversation. These are deliberately
# separate from product facts: they can correct classification but cannot
# manufacture a family, count, dimension or reference.
CONVERSATION_CATEGORY_GROUPS = {
    "Wall Light": {
        "1.png", "1a.png", "2 (3).png", "2a (3).png", "3.png", "3a.png",
        "4.png", "4a.png", "5.png", "5a.png", "6.png", "6a.png", "7.png",
        "7a.png", "8.png", "8a.png", "9.png", "9a.png", "10 (1).png",
        "10a (1).png", "12.png", "12a.png", "13.png", "13a (1).png",
        "14 (1).png", "14a (1).png", "15.png", "15a.png",
    },
    "Hanging Light": {
        "chatgpt image aug 19 2026 08 34 55 pm (1).png",
        "chatgpt image aug 19 2026 08 34 57 pm (6).png",
        "chatgpt image aug 19 2026 08 39 21 pm (1).png",
        "chatgpt image aug 19 2026 10 04 07 am (6).png",
        "chatgpt image aug 19 2026 10 04 07 am (7).png",
        "chatgpt image aug 19 2026 10 10 13 am (5).png",
        "chatgpt image jul 29 2026 01 24 48 am.png",
        "chatgpt image jul 29 2026 01 24 52 am.png",
        "chatgpt image jul 30 2026 01 13 46 am.png",
        "chatgpt image jul 30 2026 01 18 14 am.png",
        "chatgpt image aug 10 2026 08 05 55 pm.png",
        "chatgpt image aug 10 2026 08 06 02 pm.png",
        "chatgpt image aug 10 2026 08 06 08 pm.png",
        "chatgpt image aug 10 2026 08 06 20 pm.png",
        "chatgpt image aug 11 2026 11 47 24 pm (1).png",
        "chatgpt image aug 11 2026 11 47 25 pm (2).png",
        "chatgpt image aug 11 2026 11 47 25 pm (3).png",
        "chatgpt image aug 11 2026 11 47 26 pm (4).png",
    },
}


def normalize_filename(value: str) -> str:
    value = str(value or "").casefold().replace("_", " ")
    value = re.sub(r"[,]+", "", value)
    value = re.sub(r"\s*\((\d+)\)", r" (\1)", value)
    return " ".join(value.split())


def conversation_facts(filenames: list[str], category: str = "") -> dict:
    """Resolve exact pair facts and safe category-only decisions."""
    normalized = tuple(normalize_filename(name) for name in filenames or [])
    pair = tuple(sorted(normalized))
    for key, fact in CONVERSATION_PAIR_FACTS.items():
        if pair == tuple(sorted(key)):
            return {**fact, "source": "approved uploaded conversation"}
    matched_categories = {
        group_category
        for group_category, names in CONVERSATION_CATEGORY_GROUPS.items()
        if normalized and all(name in names for name in normalized)
    }
    if len(matched_categories) == 1:
        return {"category": matched_categories.pop(), "source": "approved uploaded conversation"}
    return {}


def facts_as_notes(facts: dict) -> str:
    parts = []
    if facts.get("family"):
        parts.append(f"{facts['family']} family")
    if facts.get("lights") is not None:
        parts.append(f"{facts['lights']} lights")
    if facts.get("arms") is not None:
        parts.append(f"{facts['arms']} arms")
    if facts.get("references"):
        parts.append("references " + ", ".join(facts["references"]))
    if facts.get("detail"):
        parts.append(str(facts["detail"]))
    return "; ".join(parts)


def owner_facts(notes: str) -> dict:
    """Extract the small set of owner-confirmed facts the SOP permits us to enforce."""
    value = str(notes or "").strip()
    facts = {}
    family_match = re.search(r"(?:^|[;,.]\s*)([A-Za-z][A-Za-z'’\-]*(?:\s+[A-Za-z][A-Za-z'’\-]*){0,2})\s+family\b", value, re.I)
    if not family_match:
        family_match = re.search(r"\bfamily\s*[:=\-]\s*([A-Za-z][A-Za-z'’\-]*(?:\s+[A-Za-z][A-Za-z'’\-]*){0,2})", value, re.I)
    if family_match:
        facts["family"] = family_match.group(1).strip()
    lights_match = re.search(r"\b(\d{1,2})\s*(?:lights?|light[- ]sources?|bulbs?|holders?)\b", value, re.I)
    if lights_match:
        facts["lights"] = int(lights_match.group(1))
    reference_match = re.search(r"\bSGE-[A-Z]{2}-\d{3}\b", value, re.I)
    if reference_match:
        facts["reference_sku"] = reference_match.group(0).upper()
    return facts


def extract_catalogue_references(value: str) -> list[str]:
    """Expand owner shorthand such as ``FL-13 and 16`` into exact SKUs."""
    references = []
    pattern = re.compile(
        r"\b(?:SGE-)?([A-Z]{2})-(\d{1,3})"
        r"((?:\s*(?:,|/|&|\band\b|\bor\b)\s*\d{1,3})*)",
        re.I,
    )
    for match in pattern.finditer(str(value or "")):
        prefix = match.group(1).upper()
        numbers = [match.group(2), *re.findall(r"\d{1,3}", match.group(3) or "")]
        for number in numbers:
            sku = f"SGE-{prefix}-{int(number):03d}"
            if sku not in references:
                references.append(sku)
    return references


def shared_reference_family(products: list[dict]) -> str | None:
    """Return the exact shared saved family, or None when references disagree."""
    families = []
    for product in products:
        specs = product.get("specs") if isinstance(product.get("specs"), dict) else {}
        family = str(specs.get("Collection / Family") or "").strip()
        if not family or family == DIMENSION_FALLBACK:
            return None
        families.append(family)
    if not families or len({family.casefold() for family in families}) != 1:
        return None
    return families[0]


def shared_reference_model(products: list[dict]) -> tuple[str | None, str | None]:
    """Resolve a model label from saved family data or matching title prefixes.

    Older rows may predate the Collection / Family field while still following
    the catalogue rule that a distinctive model starts every title.  A title
    prefix is used only when every explicitly selected reference agrees.
    """
    family = shared_reference_family(products)
    if family:
        return family, "saved_family"
    names = [str(product.get("name") or "").strip() for product in products]
    if not names or any(not name for name in names):
        return None, None
    token_lists = [re.findall(r"[A-Za-z0-9'’]+", name) for name in names]
    common = []
    if len(token_lists) == 1:
        token_lists[0] = token_lists[0][:1]
    for tokens in zip(*token_lists):
        if len({token.casefold() for token in tokens}) != 1:
            break
        common.append(tokens[0])
        if len(common) == 4:
            break
    generic = {
        "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "diamond", "crystal", "glass", "heritage", "clear", "gold", "silver", "black", "white",
    }
    if not common or common[0].casefold() in generic:
        return None, None
    return " ".join(common), "shared_title_prefix"


def catalogue_manifest_row(product: dict) -> dict:
    """Return the compact, factual catalogue identity used for visual search."""
    specs = product.get("specs") if isinstance(product.get("specs"), dict) else {}
    identity_keys = (
        "Collection / Family", "Glass Type", "Glass Colour", "Color", "Finish",
        "Number of Lights", "Number of Arms", "Base Type", "Shade Type",
        "Suspension Type", "Style", "Product Type",
    )
    return {
        "sku": str(product.get("sku") or "").upper(),
        "category": str(product.get("category") or "").strip(),
        "name": str(product.get("name") or "").strip(),
        "specs": {
            key: str(specs.get(key) or "").strip()
            for key in identity_keys
            if str(specs.get(key) or "").strip()
            and str(specs.get(key) or "").strip() != DIMENSION_FALLBACK
        },
    }


def normalize_catalogue_matches(value, products: list[dict]) -> list[dict]:
    """Keep only catalogue-backed visual matches with controlled relations."""
    if isinstance(value, dict):
        value = value.get("matches") or []
    if not isinstance(value, list):
        return []
    by_sku = {
        str(product.get("sku") or "").upper(): product
        for product in products
        if product.get("sku")
    }
    normalized = []
    seen = set()
    for row in value[:12]:
        if not isinstance(row, dict):
            continue
        sku = str(row.get("sku") or "").upper().strip()
        relation = str(row.get("relation") or "similar_only").strip().lower()
        if sku not in by_sku or sku in seen or relation not in CATALOGUE_MATCH_RELATIONS:
            continue
        try:
            confidence = max(0.0, min(1.0, float(row.get("confidence") or 0)))
        except (TypeError, ValueError):
            confidence = 0.0
        product = by_sku[sku]
        specs = product.get("specs") if isinstance(product.get("specs"), dict) else {}
        normalized.append({
            "sku": sku,
            "name": str(product.get("name") or "").strip(),
            "category": str(product.get("category") or "").strip(),
            "family": str(specs.get("Collection / Family") or "").strip() or None,
            "image": next((url for url in (product.get("images") or []) if isinstance(url, str) and url), None),
            "relation": relation,
            "confidence": round(confidence, 3),
            "reason": str(row.get("reason") or "").strip()[:240],
        })
        seen.add(sku)
    return sorted(normalized, key=lambda row: row["confidence"], reverse=True)[:8]


def automatic_catalogue_model(matches: list[dict], products: list[dict]) -> dict:
    """Resolve a safe family/model only from high-confidence fixture matches.

    A single reference must be exceptionally strong. Two or more agreeing
    references may establish a family at the normal fixture threshold. Glass-
    only matches never assign a fixture family.
    """
    by_sku = {
        str(product.get("sku") or "").upper(): product
        for product in products
        if product.get("sku")
    }
    groups = {}
    for match in matches or []:
        if match.get("relation") not in {"same_fixture", "same_fixture_different_glass"}:
            continue
        confidence = float(match.get("confidence") or 0)
        if confidence < CATALOGUE_FIXTURE_MATCH_THRESHOLD:
            continue
        product = by_sku.get(str(match.get("sku") or "").upper())
        if not product:
            continue
        model, source = shared_reference_model([product])
        if not model:
            continue
        key = model.casefold()
        group = groups.setdefault(key, {"model": model, "sources": [], "products": [], "matches": []})
        group["sources"].append(source)
        group["products"].append(product)
        group["matches"].append(match)

    ranked = sorted(
        groups.values(),
        key=lambda group: (
            sum(float(match["confidence"]) for match in group["matches"]) / len(group["matches"]),
            len(group["matches"]),
        ),
        reverse=True,
    )
    if not ranked:
        return {}
    winner = ranked[0]
    average = sum(float(match["confidence"]) for match in winner["matches"]) / len(winner["matches"])
    if len(winner["matches"]) == 1 and average < CATALOGUE_SINGLE_MATCH_THRESHOLD:
        return {}
    if len(ranked) > 1:
        runner_up = sum(float(match["confidence"]) for match in ranked[1]["matches"]) / len(ranked[1]["matches"])
        if average - runner_up < 0.08:
            return {}
    categories = {str(product.get("category") or "").strip() for product in winner["products"]}
    return {
        "model": winner["model"],
        "source": "automatic_catalogue_family" if "saved_family" in winner["sources"] else "automatic_title_model",
        "family": winner["model"] if "saved_family" in winner["sources"] else None,
        "products": winner["products"],
        "matches": winner["matches"],
        "confidence": round(average, 3),
        "category": next(iter(categories)) if len(categories) == 1 else None,
    }


def shared_reference_category(products: list[dict]) -> str | None:
    """Return the one saved category shared by every exact reference."""
    categories = [str(product.get("category") or "").strip() for product in products]
    if not categories or any(category not in SCHEMAS for category in categories):
        return None
    if len({category.casefold() for category in categories}) != 1:
        return None
    return categories[0]


def reference_category_for_notes(selected_category: str, products: list[dict], notes: str) -> str:
    """Reconcile an accidental/default category with identity references.

    ``matches FL-13 and 16`` describes the uploaded product's identity and can
    safely recover Floor Lamp from those exact catalogue rows. Explicit
    cross-category wording (for example ``matching wall-light piece`` or
    ``same family as``) keeps the deliberately selected category instead.
    """
    referenced_category = shared_reference_category(products)
    selected_category = str(selected_category or "").strip()
    if not referenced_category or referenced_category == selected_category:
        return selected_category
    value = str(notes or "")
    cross_category = re.search(
        r"\b(?:matching\s+piece|companion\s+piece|same\s+family\s+as|"
        r"family\s+reference|glass\s+reference|design\s+reference)\b",
        value,
        re.I,
    )
    identity_match = re.search(
        r"\b(?:matches?|same\s+(?:product|model)\s+as|identical\s+to|duplicate\s+of)\b",
        value,
        re.I,
    )
    if identity_match and not cross_category:
        return referenced_category
    return selected_category


def blocking_identity_notes(notes: list[str]) -> list[str]:
    """Promote AI-reported category/identity conflicts to blocking validation."""
    blocked = []
    for note in notes or []:
        value = str(note or "").strip()
        if not value:
            continue
        classification_uncertain = re.search(
            r"\b(?:category|classification|product\s+type)\b.{0,80}"
            r"\b(?:confirm|uncertain|conflict|incorrect|wrong|mismatch)\b",
            value,
            re.I,
        )
        explicit_mismatch = re.search(
            r"\b(?:appears?\s+to\s+be|is)\b.{0,100}\bnot\s+(?:a|an)\b",
            value,
            re.I,
        )
        if classification_uncertain or explicit_mismatch:
            blocked.append(value)
    return blocked


def apply_reference_model(record: dict, model: str, category: str) -> dict:
    """Make a title-confirmed model visible without inventing a family spec."""
    model = str(model or "").strip()
    if not model:
        return record
    name = str(record.get("name") or "").strip()
    if not re.match(rf"^{re.escape(model)}\b", name, re.I):
        specs = record.get("specs") if isinstance(record.get("specs"), dict) else {}
        generated_family = str(specs.get("Collection / Family") or "").strip()
        if generated_family and generated_family != DIMENSION_FALLBACK and re.match(rf"^{re.escape(generated_family)}\b", name, re.I):
            name = re.sub(rf"^{re.escape(generated_family)}\s+", "", name, count=1, flags=re.I)
        else:
            first_word = re.match(r"^([A-Za-z][A-Za-z'’\-]*)\b", name)
            if first_word and first_word.group(1).casefold() not in {
                "antique", "bell", "brass", "clear", "crystal", "decorative",
                "diamond", "etched", "floral", "fluted", "glass", "gold",
                "heritage", "opal", "ornate", "pleated", "scrolled", "silver",
                "traditional", "victorian",
            }:
                name = name[first_word.end():].lstrip(" —–-")
        name = f"{model} {name}"
    record["name"] = enforce_product_name_ending(name, category)
    return record


def apply_reference_family(record: dict, family: str, category: str) -> dict:
    """Make a catalogue-confirmed family visible in both title and specs."""
    family = str(family or "").strip()
    if not family:
        return record
    specs = record.get("specs") or {}
    previous_family = str(specs.get("Collection / Family") or "").strip()
    if "Collection / Family" in specs:
        specs["Collection / Family"] = family
    name = str(record.get("name") or "").strip()
    if not re.match(rf"^{re.escape(family)}\b", name, re.I):
        if previous_family and previous_family != DIMENSION_FALLBACK and re.match(rf"^{re.escape(previous_family)}\b", name, re.I):
            name = re.sub(rf"^{re.escape(previous_family)}\s+", "", name, count=1, flags=re.I)
        else:
            first_word = re.match(r"^([A-Za-z][A-Za-z'’\-]*)\b", name)
            if first_word and first_word.group(1).casefold() not in {
                "antique", "bell", "brass", "clear", "crystal", "decorative",
                "diamond", "etched", "floral", "fluted", "glass", "gold",
                "heritage", "opal", "ornate", "pleated", "scrolled", "silver",
                "traditional", "victorian",
            }:
                name = name[first_word.end():].lstrip(" —–-")
        name = f"{family} {name}"
    record["name"] = enforce_product_name_ending(name, category)
    record["specs"] = specs
    return record


def apply_owner_facts(record: dict, notes: str) -> dict:
    """Make owner-confirmed family/count facts non-overridable after AI generation."""
    facts = owner_facts(notes)
    specs = record.get("specs") or {}
    name = str(record.get("name") or "").strip()
    family = facts.get("family")
    family_field = "Collection / Family"
    if family_field in specs and not family:
        generated_family = str(specs.get(family_field) or "").strip()
        if generated_family and generated_family != DIMENSION_FALLBACK and re.match(rf"^{re.escape(generated_family)}\b", name, re.I):
            name = re.sub(rf"^{re.escape(generated_family)}\s+", "", name, count=1, flags=re.I)
        specs[family_field] = DIMENSION_FALLBACK
    if family:
        previous_family = str(specs.get("Collection / Family") or "").strip()
        specs["Collection / Family"] = family
        if previous_family and re.match(rf"^{re.escape(previous_family)}\b", name, re.I):
            name = re.sub(rf"^{re.escape(previous_family)}\b", family, name, count=1, flags=re.I)
        elif not re.match(rf"^{re.escape(family)}\b", name, re.I):
            # The SOP asks AI to lead with a model name. When the owner supplies
            # the real family, remove an unconfirmed generated first-word model
            # before applying that authoritative family.
            first_word = re.match(r"^([A-Za-z][A-Za-z'’\-]*)\b", name)
            descriptive_openings = {
                "antique", "bell", "brass", "clear", "crystal", "decorative",
                "diamond", "etched", "floral", "fluted", "glass", "gold",
                "heritage", "opal", "ornate", "pleated", "scrolled", "silver",
                "traditional", "victorian",
            }
            if first_word and first_word.group(1).casefold() not in descriptive_openings:
                name = name[first_word.end():].lstrip(" —–-")
            name = f"{family} {name}"
    lights = facts.get("lights")
    if lights is not None and "Number of Lights" in specs:
        specs["Number of Lights"] = str(lights)
        light_word = NUMBER_WORDS.get(lights, str(lights))
        count_pattern = r"\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|eighteen|twenty(?:-four)?|thirty|\d{1,2})[- ]light\b"
        if re.search(count_pattern, name, re.I):
            name = re.sub(count_pattern, f"{light_word}-Light", name, count=1, flags=re.I)
    record["name"] = name[:140]
    record["specs"] = specs
    return record


def enforce_product_name_ending(value: str, category: str) -> str:
    """Keep the long descriptive title while making the category its final words."""
    ending = CATEGORY_PROFILES[category]["name_ending"]
    name = " ".join(str(value or "").strip().split())
    if name.casefold().endswith(ending.casefold()):
        return name[:140]
    without_ending = re.sub(
        rf"(?i)(?<![A-Za-z]){re.escape(ending)}(?![A-Za-z])",
        "",
        name,
    )
    without_ending = re.sub(r"\s+[—–-]\s+", " ", without_ending)
    without_ending = " ".join(without_ending.strip(" ,;:—–-").split())
    max_prefix = max(1, 140 - len(ending) - 1)
    return f"{without_ending[:max_prefix].rstrip()} {ending}".strip()


def normalize_ai_record(ai: dict, category: str, height: str = "", width: str = "") -> dict:
    fields = SCHEMAS[category]
    raw_specs = ai.get("specs") if isinstance(ai.get("specs"), dict) else {}
    specs = OrderedDict()
    for key in fields:
        value = str(raw_specs.get(key) or "").strip()
        if key == "Product Type":
            value = category
        elif key == "Height":
            value = height.strip() or value or DIMENSION_FALLBACK
        elif key == "Width":
            value = width.strip() or value or DIMENSION_FALLBACK
        elif not value:
            value = DIMENSION_FALLBACK
        specs[key] = value

    features = [str(x).strip() for x in (ai.get("key_features") or []) if str(x).strip()][:8]
    while len(features) < 8:
        features.append("Needs product-specific confirmation")
    p1 = str(ai.get("paragraph_1") or "").strip()
    p2 = str(ai.get("paragraph_2") or "").strip()
    description = f"{p1}\n\n{p2}\n\nKey Features\n" + "\n".join(f"• {x}" for x in features)
    tags = ai.get("tags") or []
    if isinstance(tags, str):
        tags = [x.strip() for x in tags.split(",") if x.strip()]
    confidence_notes = ai.get("confidence_notes") or []
    if isinstance(confidence_notes, str):
        confidence_notes = [line.strip() for line in confidence_notes.splitlines() if line.strip()]
    elif not isinstance(confidence_notes, (list, tuple)):
        confidence_notes = []
    return {
        "name": enforce_product_name_ending(ai.get("name") or "New Product · Needs Review", category),
        "short_description": str(ai.get("short_description") or "").strip()[:220],
        "description": description,
        "tags": tags[:20],
        "specs": dict(specs),
        "confidence_notes": [str(x).strip() for x in confidence_notes if str(x).strip()],
    }


def validate_record(record: dict, category: str) -> list[str]:
    errors = []
    if category not in SCHEMAS:
        return ["Unsupported category"]
    specs = record.get("specs") or {}
    if list(specs.keys()) != SCHEMAS[category]:
        errors.append(f"Specifications must contain {len(SCHEMAS[category])} fields in the approved order")
    if specs.get("Product Type") != category:
        errors.append("Product Type does not match category")
    words = (record.get("short_description") or "").split()
    if not 20 <= len(words) <= 35:
        errors.append("Short description must be 20-35 words")
    description = record.get("description") or ""
    if description.count("\n\n") < 2 or "Key Features\n" not in description:
        errors.append("Description must have two paragraphs followed by Key Features")
    bullets = [line for line in description.splitlines() if line.startswith("• ") and line[2:].strip()]
    if len(bullets) != 8:
        errors.append("Description must contain exactly 8 Key Features")
    if "Needs product-specific confirmation" in description:
        errors.append("AI did not supply eight product-specific Key Features")
    if (record.get("status") or "draft") != "draft":
        errors.append("New products must remain Draft / Needs Review")
    name = str(record.get("name") or "").strip()
    evidence = record.get("sop_evidence") if isinstance(record.get("sop_evidence"), dict) else {}
    resolved_category = str(evidence.get("resolved_category") or "").strip()
    if resolved_category and resolved_category != category:
        errors.append(
            f"Category must remain {resolved_category}, as resolved during SOP analysis"
        )
    confirmed = owner_facts(evidence.get("owner_notes") or "")
    confirmed_family = confirmed.get("family")
    confirmed_model = str(
        evidence.get("confirmed_model")
        or evidence.get("automatic_catalogue_model")
        or ""
    ).strip()
    required_opening = confirmed_family or confirmed_model
    if required_opening and not re.match(rf"^{re.escape(required_opening)}\b", name, re.I):
        source = (
            "owner-confirmed family"
            if confirmed_family
            else "catalogue-confirmed model"
        )
        errors.append(f"Product name must begin with the {source} {required_opening}")
    expected_ending = CATEGORY_PROFILES[category]["name_ending"]
    if not name.casefold().endswith(expected_ending.casefold()):
        errors.append(f"Product name must end with {expected_ending}")
    generic_opening = re.compile(
        r"^(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|"
        r"diamond|crystal|glass|heritage|clear|gold|silver|black|white)(?:[- ]|$)",
        re.I,
    )
    if generic_opening.search(name):
        errors.append("Product name must begin with a distinctive catalogue model name")
    all_values = [name, record.get("short_description") or "", description, *[str(v) for v in specs.values()]]
    if any("made to order" in value.casefold() for value in all_values):
        errors.append("Made to Order cannot be used as a factual value")
    if any(re.search(r"\[[^\]]+\]", value) for value in all_values):
        errors.append("Template placeholders must be removed")
    for dimension in ("Height", "Width"):
        value = str(specs.get(dimension) or "").strip()
        if value != DIMENSION_FALLBACK and not re.search(r'(?:["″]|\\b(?:mm|cm|m|ft|feet|foot)\\b)', value, re.I):
            errors.append(f"{dimension} must include a unit or use the approved confirmation fallback")
    return errors
