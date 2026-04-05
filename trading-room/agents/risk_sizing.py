"""Agent 6: Position sizing & risk."""
from __future__ import annotations

from typing import Any

from agents.base_agent import BaseAgent
from config.settings import DEFAULT_ACCOUNT_SIZE, MAX_RISK_PER_TRADE_PCT
from models.schemas import PositionSize


class RiskSizing(BaseAgent):
    name = "risk_sizing"

    def run(self, context: dict[str, Any]) -> list[PositionSize]:
        setups = context.get("setups", [])
        account = context.get("account_size", DEFAULT_ACCOUNT_SIZE)
        risk_pct = context.get("risk_per_trade_pct", MAX_RISK_PER_TRADE_PCT)
        dollar_risk = account * (risk_pct / 100.0)

        self.log.info("Sizing %d setups (risk=$%.0f)", len(setups), dollar_risk)
        sizes: list[PositionSize] = []

        for s in setups:
            per_share_risk = max(s.entry - s.stop, 0.01)
            shares = int(dollar_risk // per_share_risk)
            sizes.append(
                PositionSize(
                    ticker=s.ticker,
                    shares=max(shares, 0),
                    dollar_risk=round(shares * per_share_risk, 2),
                    account_risk_pct=risk_pct,
                )
            )
        return sizes
