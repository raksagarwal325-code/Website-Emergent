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


def sop_prompt(category: str) -> str:
    fields = SCHEMAS[category]
    profile = CATEGORY_PROFILES[category]
    return f"""You are preparing ONE Samrat Glass Emporium {category} catalogue record from one or two photographs of the SAME product.

Return strict JSON only with: name, short_description, paragraph_1, paragraph_2, key_features, tags, specs, confidence_notes.

APPROVED SOP — NON-NEGOTIABLE:
- Identity: {profile['identity']}. The product name must be long, specific, unique, truthful and end with {profile['name_ending']} as its final words.\n- Begin the title with a distinctive catalogue model name, not a generic feature such as a light count, glass, crystal, diamond-cut, heritage or colour. A model name is a marketing identifier and must not be copied into Collection / Family unless owner-confirmed.
- Owner notes are confirmed facts and outrank visual inference and catalogue comparison. Use every supplied family, reference, light count and other stated fact exactly.
- Existing catalogue rows are duplicate/reference evidence only. Never reuse an existing title for a different item or conceal a possible duplicate by rewording.
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
