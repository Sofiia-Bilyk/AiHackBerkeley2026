from __future__ import annotations

import re


def normalize_email(value: str) -> str:
    return value.strip().lower()


def normalize_location(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).lower()


def normalize_nationality(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).title()

