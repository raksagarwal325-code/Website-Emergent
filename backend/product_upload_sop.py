"""Deterministic SOP rules for AI-assisted catalogue uploads.

AI supplies product-specific copy. This module owns the non-negotiable shape,
defaults and validation so model output can never silently bypass the SOP.
"""
from collections import OrderedDict


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


def sop_prompt(category: str) -> str:
    fields = SCHEMAS[category]
    return f"""You are preparing ONE Samrat Glass Emporium {category} catalogue record from two photographs of the SAME product.
The first photograph is normally illuminated on black; the second is normally unlit on white. Treat both as evidence of one product.

Return strict JSON only with: name, short_description, paragraph_1, paragraph_2, key_features, tags, specs, confidence_notes.

NON-NEGOTIABLE RULES:
- Use a long, specific catalogue name: family/identity, visible glass/design, colour or configuration, then product type. Reuse the supplied family/reference only when supported.
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
