"""Catalogue light-mode image pairing rules.

The catalogue convention is intentionally simple for standard two-image
products: image #1 is the illuminated/black-background view and image #2 is
the unlit/white-background view. Products with one image or 3+ images are not
auto-guessed. Explicit admin selections always win.
"""

from collections.abc import Mapping, Set
from typing import Any, Optional


def _image_value(value: Any) -> Optional[str]:
    """Normalize a catalogue image field to a non-empty string or None."""
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def apply_catalogue_light_pairing(
    data: Mapping[str, Any],
    *,
    existing: Optional[Mapping[str, Any]] = None,
    explicit_fields: Optional[Set[str]] = None,
) -> dict[str, Any]:
    """Return product data with safe catalogue ON/OFF image fields applied.

    Rules:
    - Exactly two images, with no manual pairing: #1 -> ON, #2 -> OFF.
    - One image or 3+ images: do not guess; automatic pairs are cleared.
    - Explicit ``catalog_image_on`` / ``catalog_image_off`` values win.
    - On update, a previously automatic pair follows a changed two-image
      gallery. A non-standard/manual pair is preserved unless explicitly
      changed by the admin request.
    """
    result = dict(data)
    fields = set(explicit_fields or ())

    new_images = list(result.get("images") or [])
    old = dict(existing or {})
    old_images = list(old.get("images") or [])

    old_on = _image_value(old.get("catalog_image_on"))
    old_off = _image_value(old.get("catalog_image_off"))

    explicit_on = "catalog_image_on" in fields
    explicit_off = "catalog_image_off" in fields

    # Explicit admin choices are authoritative, including an explicit clear.
    if explicit_on or explicit_off:
        on = _image_value(result.get("catalog_image_on")) if explicit_on else old_on
        off = _image_value(result.get("catalog_image_off")) if explicit_off else old_off

        # Fill only the side the admin did not explicitly control.
        if len(new_images) == 2:
            if not explicit_on and not on:
                on = _image_value(new_images[0])
            if not explicit_off and not off:
                off = _image_value(new_images[1])

        result["catalog_image_on"] = on
        result["catalog_image_off"] = off
        return result

    old_pair_is_auto = (
        len(old_images) == 2
        and old_on == _image_value(old_images[0])
        and old_off == _image_value(old_images[1])
    )
    no_old_pair = not old_on and not old_off

    # New products, unpaired products, and previously auto-paired products all
    # follow the current gallery convention. Manual/non-standard pairs remain
    # untouched unless the admin explicitly changes them.
    should_auto_manage = existing is None or no_old_pair or old_pair_is_auto

    if should_auto_manage:
        if len(new_images) == 2:
            result["catalog_image_on"] = _image_value(new_images[0])
            result["catalog_image_off"] = _image_value(new_images[1])
        else:
            result["catalog_image_on"] = None
            result["catalog_image_off"] = None
    else:
        result["catalog_image_on"] = old_on
        result["catalog_image_off"] = old_off

    return result
