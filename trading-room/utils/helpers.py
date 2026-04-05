"""Shared utility functions."""
from __future__ import annotations

from datetime import datetime


def now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def pct_change(a: float, b: float) -> float:
    if b == 0:
        return 0.0
    return (a - b) / b * 100.0


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))
