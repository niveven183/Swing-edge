"""Agent 7: Open positions monitoring."""
from __future__ import annotations

from typing import Any

from agents.base_agent import BaseAgent
from models.schemas import PortfolioCheck


class PortfolioMonitor(BaseAgent):
    name = "portfolio_monitor"

    def run(self, context: dict[str, Any]) -> list[PortfolioCheck]:
        setups = context.get("setups", [])
        open_positions: list[str] = context.get("open_positions", [])
        self.log.info(
            "Checking %d setups against %d open positions",
            len(setups), len(open_positions),
        )

        checks: list[PortfolioCheck] = []
        for s in setups:
            warnings: list[str] = []
            if s.ticker in open_positions:
                warnings.append("already holding this ticker")
            checks.append(
                PortfolioCheck(
                    ticker=s.ticker,
                    passes=len(warnings) == 0,
                    correlation_warnings=warnings,
                    exposure_notes="ok" if not warnings else "adjust",
                )
            )
        return checks
