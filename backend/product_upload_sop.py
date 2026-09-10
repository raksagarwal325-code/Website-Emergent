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

NUMBER_WORDS = {
    1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six",
    7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten", 11: "Eleven", 12: "Twelve",
    13: "Thirteen", 14: "Fourteen", 15: "Fifteen", 16: "Sixteen",
    18: "Eighteen", 20: "Twenty", 24: "Twenty-Four", 30: "Thirty",
}


def sop_prompt(category: str) -> str:
    fields = SCHEMAS[category]
    return f"""You are preparing ONE Samrat Glass Emporium {category} catalogue record from two photographs of the SAME product.
The first photograph is normally illuminated on black; the second is normally unlit on white. Treat both as evidence of one product.

Return strict JSON only with: name, short_description, paragraph_1, paragraph_2, key_features, tags, specs, confidence_notes.

NON-NEGOTIABLE RULES:
- Use a long, specific catalogue name: family/identity, visible glass/design, colour or configuration, then product type. Reuse the supplied family/reference only when supported.
- Owner notes are confirmed facts and outrank visual inference and catalogue comparison. Use every supplied family name, light count and reference exactly; never replace them with a different family or count.
- Existing catalogue names are a duplicate reference set. Never reuse an existing title for a different item. Preserve a supported family root, but add truthful variant descriptors that distinguish the product.
- If these photographs may show an existing catalogue product, say so in confidence_notes. Never conceal a possible duplicate merely by rewording its name.
- short_description is one sentence of 20-35 words.
- paragraph_1 and paragraph_2 are narrative prose. Do not put specifications in them.
- key_features is an array of exactly 8 concise, evidence-based strings.
- specs contains exactly these keys in this exact order: {', '.join(fields)}.
- Product Type is exactly {category}.
- Height and Width use supplied values verbatim; when absent use "{DIMENSION_FALLBACK}".
- Count lights and structural arms independently. Never count a central column or decorative scroll as an arm.
- Never invent dimensions, material, holder, wattage, weather/IP rating, collection, origin, certification or warranty.
- For an unknown non-dimensional value use "To be confirmed before order". Use an accurate "Not applicable — ..." value when a field truly does not apply.
- Do not claim solid brass or crystal from appearance alone.
- The two images must agree. Report any mismatch or obscured count in confidence_notes.
- No markdown and no text outside the JSON object.
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
        "name": str(ai.get("name") or "New Product · Needs Review").strip()[:140],
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
    return errors
