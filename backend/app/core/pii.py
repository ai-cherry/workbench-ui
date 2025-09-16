"""Utility helpers for protecting sensitive information."""
from __future__ import annotations

import re
from typing import Any

from .config import PII_MASK

EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
CARD16_RE = re.compile(r"\b\d{16}\b")


def mask_text(value: Any) -> Any:
    """Mask email addresses and 16-digit numbers when PII masking is enabled."""

    if not PII_MASK or not isinstance(value, str):
        return value
    try:
        masked = EMAIL_RE.sub("[EMAIL]", value)
        return CARD16_RE.sub("[CARD]", masked)
    except Exception:
        return value


__all__ = ["mask_text"]
