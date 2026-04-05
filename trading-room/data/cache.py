"""Simple JSON file-based cache."""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from config.settings import CACHE_DIR, CACHE_TTL_SECONDS


def _path(key: str) -> Path:
    safe = key.replace("/", "_").replace(":", "_")
    return CACHE_DIR / f"{safe}.json"


def get(key: str, ttl: int = CACHE_TTL_SECONDS) -> Any | None:
    p = _path(key)
    if not p.exists():
        return None
    try:
        payload = json.loads(p.read_text())
    except (json.JSONDecodeError, OSError):
        return None
    if time.time() - payload.get("_ts", 0) > ttl:
        return None
    return payload.get("data")


def set(key: str, data: Any) -> None:  # noqa: A001 (shadow builtin is fine here)
    p = _path(key)
    p.write_text(json.dumps({"_ts": time.time(), "data": data}, default=str))
