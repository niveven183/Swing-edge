"""
Base class for all Hive agents (S1-S5).
Every agent inherits validate_and_fix() — called automatically before simulate_trade().
"""

import json
import logging
from datetime import date, datetime
from pathlib import Path

from core.constants import (
    VALID_SETUPS, VALID_EMOTIONS, VALID_MARKETS,
    SETUP_ALIASES, EMOTION_ALIASES, MARKET_ALIASES,
)

QUARANTINE_DIR = Path(__file__).parent.parent / "quarantine"
QUARANTINE_DIR.mkdir(exist_ok=True)

logger = logging.getLogger(__name__)


def _map(value: str, valid_list: list, aliases: dict, default: str) -> str:
    if value in valid_list:
        return value
    normalized = value.strip().lower()
    if normalized in aliases:
        return aliases[normalized]
    # case-insensitive match against valid list
    for v in valid_list:
        if v.lower() == normalized:
            return v
    logger.warning("Could not map '%s' — defaulting to '%s'", value, default)
    return default


def validate_and_fix(trade: dict) -> dict:
    """
    Normalize and auto-correct a trade dict before INSERT to Supabase.
    Mutates a copy; never raises — bad values are corrected or defaulted.
    """
    t = dict(trade)

    t["setup"] = _map(
        str(t.get("setup", "")), VALID_SETUPS, SETUP_ALIASES, "Other"
    )
    t["emotionAtEntry"] = _map(
        str(t.get("emotionAtEntry", "")), VALID_EMOTIONS, EMOTION_ALIASES, "Neutral"
    )
    t["marketCondition"] = _map(
        str(t.get("marketCondition", "")), VALID_MARKETS, MARKET_ALIASES, "Normal"
    )

    t["is_demo"] = True
    t["status"] = "CLOSED"

    side = str(t.get("side", "LONG")).upper()
    t["side"] = side
    try:
        entry = float(t["entry"])
        exit_ = float(t["exit"])
        shares = float(t["shares"])
        mult = 1 if side == "LONG" else -1
        t["pnl"] = round(shares * (exit_ - entry) * mult, 2)
    except (KeyError, TypeError, ValueError) as e:
        logger.error("P&L recalc failed for trade %s: %s", t.get("id"), e)

    _check_stops(t)
    return t


def _check_stops(t: dict) -> None:
    try:
        entry = float(t["entry"])
        stop = float(t.get("stop", 0))
        target = float(t.get("target", 0))
        side = t.get("side", "LONG")
        if side == "LONG":
            if stop >= entry:
                logger.warning("LONG trade %s: stop (%s) >= entry (%s)", t.get("id"), stop, entry)
            if target <= entry:
                logger.warning("LONG trade %s: target (%s) <= entry (%s)", t.get("id"), target, entry)
        else:
            if stop <= entry:
                logger.warning("SHORT trade %s: stop (%s) <= entry (%s)", t.get("id"), stop, entry)
            if target >= entry:
                logger.warning("SHORT trade %s: target (%s) >= entry (%s)", t.get("id"), target, entry)
    except (KeyError, TypeError, ValueError):
        pass


def quarantine(trade: dict, reason: str) -> None:
    """Persist a trade that failed validation to quarantine/ for manual review."""
    record = {"trade": trade, "reason": reason, "timestamp": datetime.utcnow().isoformat()}
    filename = QUARANTINE_DIR / f"quarantine_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}.json"
    filename.write_text(json.dumps(record, indent=2))
    logger.warning("Trade quarantined → %s | reason: %s", filename.name, reason)


class BaseAgent:
    """
    All five Hive agents (S1-S5) inherit from this class.
    Override simulate_trade_impl() with agent-specific logic.
    """

    name: str = "BaseAgent"

    def daily_flush_gate(self, supabase_client) -> bool:
        """
        Returns True if this agent already inserted a trade today — skip the run.
        """
        from core.constants import AGENT_SETUP_MAP
        today = str(date.today())
        setup = AGENT_SETUP_MAP.get(self.name, "")
        result = supabase_client.table("trades").select("id").eq(
            "setup", setup
        ).gte("date", today).execute()
        if result.data and len(result.data) > 0:
            logger.info("[%s] daily_flush_gate: already ran today — skipping", self.name)
            return True
        return False

    def simulate_trade(self, raw_trade: dict) -> dict | None:
        trade = validate_and_fix(raw_trade)

        # Hard stop: if still invalid after fix, quarantine and skip
        if trade["setup"] not in VALID_SETUPS:
            quarantine(trade, f"setup '{trade['setup']}' not in VALID_SETUPS after fix")
            return None

        return self.simulate_trade_impl(trade)

    def simulate_trade_impl(self, trade: dict) -> dict:
        raise NotImplementedError(f"{self.name} must implement simulate_trade_impl()")
