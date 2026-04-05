"""Agent 2: Sector rotation & strength."""
from __future__ import annotations

from typing import Any

from agents.base_agent import BaseAgent
from data.market_data import get_history
from models.schemas import SectorView

SECTOR_ETFS = {
    "XLK": "Tech",
    "XLF": "Financials",
    "XLE": "Energy",
    "XLV": "Healthcare",
    "XLY": "Cons Disc",
    "XLP": "Staples",
    "XLI": "Industrials",
    "XLU": "Utilities",
    "XLB": "Materials",
    "XLRE": "Real Estate",
    "XLC": "Comms",
}


class SectorScanner(BaseAgent):
    name = "sector_scanner"

    def run(self, context: dict[str, Any]) -> SectorView:
        self.log.info("Scanning sector strength")
        returns: dict[str, float] = {}
        for etf in SECTOR_ETFS:
            df = get_history(etf, period="1mo", interval="1d")
            if df.empty or len(df) < 2:
                continue
            returns[etf] = (df["Close"].iloc[-1] / df["Close"].iloc[0] - 1) * 100

        if not returns:
            return SectorView(rotation_notes="no data")

        ordered = sorted(returns.items(), key=lambda x: x[1], reverse=True)
        leaders = [t for t, _ in ordered[:3]]
        laggards = [t for t, _ in ordered[-3:]]
        return SectorView(
            leaders=leaders,
            laggards=laggards,
            rotation_notes=f"Top: {leaders[0]} {returns[leaders[0]]:+.1f}%",
        )
