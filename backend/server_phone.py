"""
Shared phone-number normaliser used by all lead-capture endpoints
(`/api/contact`, `/api/inquiries`).

Input formats accepted (India-first):
    +91XXXXXXXXXX        E.164 with +91
    91XXXXXXXXXX         Bare country prefix
    0XXXXXXXXXX          Leading-zero Indian mobile
    XXXXXXXXXX           10-digit mobile (assumed India)

International:
    +[country code][8-15 total digits]
    Bare digits 8..15 long → treated as E.164 without the leading +.

Spaces, hyphens and parentheses are stripped before validation, so
visitors typing `+91 89203-92937` still normalise to `+918920392937`.

Raises `ValueError` on invalid input so Pydantic surfaces a clean
422 to the client — never a 500.
"""
from __future__ import annotations

import re

_STRIP = re.compile(r"[\s\-()]")
_ONLY_DIGITS_OR_PLUS = re.compile(r"^\+?\d+$")


def normalize_phone(value: str) -> str:
    if value is None:
        raise ValueError("Mobile / WhatsApp number is required")
    s = _STRIP.sub("", str(value).strip())
    if not s:
        raise ValueError("Mobile / WhatsApp number is required")
    if not _ONLY_DIGITS_OR_PLUS.match(s):
        raise ValueError("Enter a valid phone number (digits only)")
    if s.startswith("+"):
        digits = s[1:]
        if not (8 <= len(digits) <= 15):
            raise ValueError(
                "Number length is invalid (E.164 requires 8-15 digits)"
            )
        return s
    if len(s) == 10:
        return f"+91{s}"
    if len(s) == 12 and s.startswith("91"):
        return f"+{s}"
    if len(s) == 11 and s.startswith("0"):
        return f"+91{s[1:]}"
    if 8 <= len(s) <= 15:
        return f"+{s}"
    raise ValueError("Enter a valid phone number")
